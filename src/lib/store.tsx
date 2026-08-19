import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Producer, Product, Order, CartItem, OrderStatus, Quote, QuoteRequestItem, Invoice,
  Review, SavedRecipe, CustomerDetails,
} from './types';
import { SEED_PRODUCERS, SEED_PRODUCTS, INITIAL_ORDERS } from '../db/seed';
import { calculateOrderTotals } from './pricing';
import { aggregateAllergens } from './allergens';

interface BatchCapacityInfo {
  capacity: number | null; // null = unbegrenzt
  booked: number;
  isFull: boolean;
}

interface AppContextType {
  // Mode & Role Separation
  mode: 'customer' | 'producer';
  setMode: (mode: 'customer' | 'producer') => void;

  // Multi-Tenant Data
  producers: Producer[];
  products: Product[];
  orders: Order[];
  quotes: Quote[];
  invoices: Invoice[];
  reviews: Review[];
  savedRecipes: SavedRecipe[];

  // Producer context
  selectedProducerId: string;
  setSelectedProducerId: (id: string) => void;
  currentProducer: Producer;

  // Ownership: businesses (Gewerbe) that belong to the current user, as opposed
  // to the wider marketplace of other manufacturers visible in the customer app.
  myProducerIds: string[];
  myProducers: Producer[];

  // Lightweight, client-side access gate for the Produzenten-Portal (see the
  // caveat on Producer.portalPin — this deters accidental/casual access on a
  // shared device, it is not real authentication).
  isPortalUnlocked: (producerId: string) => boolean;
  unlockPortal: (producerId: string, pin: string) => boolean;

  // New Business Onboarding
  createProducer: (producerData: Omit<Producer, 'id' | 'slug' | 'stripeConnected'>) => Producer;
  updateProducer: (id: string, updates: Partial<Producer>) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartRequiresQuote: boolean;

  // Order management
  createOrderFromCart: (orderData: Partial<Order>) => Order;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  getBatchCapacityInfo: (producerId: string) => BatchCapacityInfo;

  // Product & Recipe management (Producer portal)
  saveProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;

  // Quote / Offerte -> Rechnung flow (platform never touches this money)
  createQuoteRequest: (items: QuoteRequestItem[], customer: CustomerDetails, producer: Producer, customerNote?: string) => Quote;
  respondToQuote: (quoteId: string, price: number, note?: string) => void;
  acceptQuote: (quoteId: string) => void;
  issueInvoice: (quoteId: string) => Invoice;
  declineQuote: (quoteId: string) => void;
  markInvoicePaid: (invoiceId: string) => void;
  activeQuote: Quote | null;
  setActiveQuote: (quote: Quote | null) => void;

  // Reviews
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;

  // Saved recipes / Nachbestellen
  saveRecipe: (recipe: Omit<SavedRecipe, 'id' | 'savedAt'>) => void;
  removeSavedRecipe: (id: string) => void;

  // Customer navigation state
  customerView: 'discover' | 'producer' | 'customizer' | 'tracking' | 'requests' | 'recipes';
  setCustomerView: (view: 'discover' | 'producer' | 'customizer' | 'tracking' | 'requests' | 'recipes') => void;
  activeProduct: Product | null;
  setActiveProduct: (product: Product | null) => void;
  infoProduct: Product | null;
  setInfoProduct: (product: Product | null) => void;

  // Modals & Drawers
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  printSlipOrder: Order | null;
  setPrintSlipOrder: (order: Order | null) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'atelier_mto_state_v4';

function generateLotNumber(producer: Producer): string {
  const stamp = Math.floor(100000 + Math.random() * 900000);
  return `LOT-${producer.country}-${stamp}`;
}

function generateQrReference(invoiceSeq: number): string {
  // Swiss-QR-Rechnung-style structured reference (27 digits, mod-10 recursive checksum
  // simplified for prototype purposes — not a certified ISO 20022 QR-IBAN reference).
  const base = `${Date.now()}${invoiceSeq}`.padStart(26, '0').slice(-26);
  let carry = 0;
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  for (const ch of base) {
    carry = table[(carry + parseInt(ch, 10)) % 10];
  }
  const checkDigit = (10 - carry) % 10;
  return `${base}${checkDigit}`.replace(/(\d{5})(?=\d)/g, '$1 ').trim();
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mode: customer vs producer
  const [mode, setMode] = useState<'customer' | 'producer'>('customer');

  // Core Data
  const [producers, setProducers] = useState<Producer[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_producers`);
    return saved ? JSON.parse(saved) : SEED_PRODUCERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : SEED_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_orders`);
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [quotes, setQuotes] = useState<Quote[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_quotes`);
    return saved ? JSON.parse(saved) : [];
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_invoices`);
    return saved ? JSON.parse(saved) : [];
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_reviews`);
    return saved ? JSON.parse(saved) : [];
  });

  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_saved_recipes`);
    return saved ? JSON.parse(saved) : [];
  });

  // Selected Producer for Portal
  const [selectedProducerId, setSelectedProducerId] = useState<string>('prod-maelstrom');

  // Ownership: which Gewerbe/businesses belong to the current user. Defaults to the
  // demo business (prod-maelstrom) plus, for existing local sessions created before
  // this tracking existed, any producer beyond the original seed set (i.e. businesses
  // the user already registered via onboarding).
  const [myProducerIds, setMyProducerIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_my_producer_ids`);
    if (saved) return JSON.parse(saved);
    const seedIds = new Set(SEED_PRODUCERS.map(p => p.id));
    const extraIds = producers.filter(p => !seedIds.has(p.id)).map(p => p.id);
    return ['prod-maelstrom', ...extraIds];
  });

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_cart`);
    return saved ? JSON.parse(saved) : [];
  });

  // Navigation & Modals
  const [customerView, setCustomerView] = useState<AppContextType['customerView']>('discover');
  const [activeProduct, setActiveProduct] = useState<Product | null>(products[0] || null);
  const [infoProduct, setInfoProduct] = useState<Product | null>(null);
  // The active order is persisted by id (not by value) so a page reload can
  // restore "my current order" without falling back to whatever the most
  // recently placed order on this device happens to be — that could belong
  // to a different customer on a shared device.
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(() =>
    localStorage.getItem(`${LOCAL_STORAGE_KEY}_active_order_id`)
  );
  const setActiveOrder = (order: Order | null) => {
    setActiveOrderIdState(order?.id || null);
    if (order) localStorage.setItem(`${LOCAL_STORAGE_KEY}_active_order_id`, order.id);
    else localStorage.removeItem(`${LOCAL_STORAGE_KEY}_active_order_id`);
  };
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);

  // Portal unlock state lives in sessionStorage (not localStorage): it should
  // require re-entering the PIN in a fresh browser session, but not on every
  // navigation within the same one.
  const [unlockedProducerIds, setUnlockedProducerIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('atelier_portal_unlocked_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [printSlipOrder, setPrintSlipOrder] = useState<Order | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_producers`, JSON.stringify(producers));
  }, [producers]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_orders`, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_quotes`, JSON.stringify(quotes));
  }, [quotes]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_invoices`, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_reviews`, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_saved_recipes`, JSON.stringify(savedRecipes));
  }, [savedRecipes]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_cart`, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_my_producer_ids`, JSON.stringify(myProducerIds));
  }, [myProducerIds]);

  useEffect(() => {
    sessionStorage.setItem('atelier_portal_unlocked_ids', JSON.stringify(unlockedProducerIds));
  }, [unlockedProducerIds]);

  // Current producer object
  const currentProducer = producers.find(p => p.id === selectedProducerId) || producers[0];
  const myProducers = producers.filter(p => myProducerIds.includes(p.id));
  // Derived (not stored by value) so it always reflects live status updates.
  const activeOrder = orders.find(o => o.id === activeOrderId) || null;

  // Switching into the Produzenten-Portal must never land the user in another
  // manufacturer's workspace just because they were browsing that Atelier as a
  // customer beforehand — snap back to one of their own Gewerbe in that case.
  const handleSetMode = (newMode: 'customer' | 'producer') => {
    if (newMode === 'producer' && myProducerIds.length > 0 && !myProducerIds.includes(selectedProducerId)) {
      setSelectedProducerId(myProducerIds[0]);
    }
    setMode(newMode);
  };

  // Gewerbe / Producer Creation
  const createProducer = (data: Omit<Producer, 'id' | 'slug' | 'stripeConnected'>): Producer => {
    const newId = `prod-${Date.now()}`;
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProducer: Producer = {
      ...data,
      id: newId,
      slug: slug,
      stripeConnected: true,
    };

    setProducers(prev => [newProducer, ...prev]);
    setMyProducerIds(prev => [newId, ...prev]);
    setSelectedProducerId(newId);
    setUnlockedProducerIds(prev => [newId, ...prev]); // creator just chose this PIN themselves
    return newProducer;
  };

  const updateProducer = (id: string, updates: Partial<Producer>) => {
    setProducers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const isPortalUnlocked = (producerId: string) => unlockedProducerIds.includes(producerId);

  const unlockPortal = (producerId: string, pin: string): boolean => {
    const producer = producers.find(p => p.id === producerId);
    if (!producer || pin.trim() === '' || producer.portalPin !== pin.trim()) return false;
    setUnlockedProducerIds(prev => prev.includes(producerId) ? prev : [...prev, producerId]);
    return true;
  };

  // Cart Actions
  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const cartRequiresQuote = cart.some(item => item.product.transactionMode === 'quote_request');

  // Deduct component stock when an order is placed (Made-to-Order recipe items only)
  const deductComponentStock = (items: CartItem[]) => {
    const usageByProduct = new Map<string, Map<string, number>>();
    items.forEach(ci => {
      if (!ci.recipe) return;
      const compUsage = usageByProduct.get(ci.product.id) || new Map<string, number>();
      ci.recipe.forEach(r => {
        compUsage.set(r.componentId, (compUsage.get(r.componentId) || 0) + r.grams * ci.quantity);
      });
      usageByProduct.set(ci.product.id, compUsage);
    });
    if (usageByProduct.size === 0) return;

    setProducts(prev => prev.map(p => {
      const usage = usageByProduct.get(p.id);
      if (!usage || !p.config) return p;
      return {
        ...p,
        config: {
          ...p.config,
          components: p.config.components.map(c => {
            const used = usage.get(c.id);
            if (used === undefined || c.stockQuantity === undefined) return c;
            const remaining = Math.max(0, c.stockQuantity - used);
            return { ...c, stockQuantity: remaining, inStock: remaining > 0 ? c.inStock : false };
          }),
        },
      };
    }));
  };

  // Order Actions
  const createOrderFromCart = (orderData: Partial<Order>): Order => {
    const newOrderNumber = `ATL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const producer = cart[0]?.producer || currentProducer;
    // Destination-country VAT split (same formula the checkout screen used to
    // show the customer) so the persisted order always matches what was
    // actually displayed and charged — never recomputed differently here.
    const totals = calculateOrderTotals(cartTotal, orderData.customer?.country || producer.country);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: newOrderNumber,
      producerId: producer.id,
      producerName: producer.name,
      customer: orderData.customer || {
        name: 'Gast Kunde',
        email: 'kunde@atelier.swiss',
        street: 'Mustergasse 1',
        postalCode: '8001',
        city: 'Zürich',
        country: 'CH',
      },
      items: cart.map((ci, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        productId: ci.product.id,
        productTitle: ci.product.title,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.unitPrice * ci.quantity,
        weightGrams: ci.product.weightGrams,
        isCustomItem: ci.product.isCustomizable,
        recipe: ci.recipe,
        customFieldValues: ci.customFieldValues,
        customLabel: ci.customLabel,
        renderedLabelSvg: ci.renderedLabelSvg,
        lotNumber: generateLotNumber(producer),
        allergens: aggregateAllergens(ci.product, ci.recipe, ci.customFieldValues),
      })),
      status: 'paid',
      currency: producer.currency,
      subtotal: totals.subtotal,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      fulfillmentType: orderData.fulfillmentType || 'shipping',
      paymentMethod: orderData.paymentMethod || 'twint',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      scheduledBatchDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      ...orderData,
    };

    deductComponentStock(cart);
    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    setActiveOrder(newOrder);
    setCustomerView('tracking');
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const getBatchCapacityInfo = (producerId: string): BatchCapacityInfo => {
    const producer = producers.find(p => p.id === producerId);
    const capacity = producer?.capacityPerBatch ?? null;
    if (capacity === null) return { capacity: null, booked: 0, isFull: false };
    const booked = orders.filter(o => o.producerId === producerId && (o.status === 'paid' || o.status === 'in_production')).length;
    return { capacity, booked, isFull: booked >= capacity };
  };

  // Product CRUD
  const saveProduct = (product: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Quote / Offerte -> Rechnung flow. The platform only stores the negotiation +
  // invoice reference — money always moves directly between customer and producer.
  const createQuoteRequest = (items: QuoteRequestItem[], customer: CustomerDetails, producer: Producer, customerNote?: string): Quote => {
    const newQuote: Quote = {
      id: `quote-${Date.now()}`,
      quoteNumber: `OFF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      producerId: producer.id,
      producerName: producer.name,
      currency: producer.currency,
      customer,
      items,
      customerNote,
      status: 'requested',
      createdAt: new Date().toISOString(),
    };
    setQuotes(prev => [newQuote, ...prev]);
    setActiveQuote(newQuote);
    return newQuote;
  };

  const respondToQuote = (quoteId: string, price: number, note?: string) => {
    setQuotes(prev => prev.map(q => q.id === quoteId
      ? { ...q, status: 'quoted', quotedPrice: price, quotedNote: note, respondedAt: new Date().toISOString() }
      : q));
  };

  const declineQuote = (quoteId: string) => {
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'declined' } : q));
  };

  // Customer accepts the producer's offer. This only records intent — the
  // producer still has to issue the actual invoice (issueInvoice below).
  const acceptQuote = (quoteId: string) => {
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'accepted' } : q));
    if (activeQuote && activeQuote.id === quoteId) {
      setActiveQuote(prev => prev ? { ...prev, status: 'accepted' } : null);
    }
  };

  // Producer issues the invoice for an accepted quote (e.g. as a Swiss-QR-Rechnung).
  const issueInvoice = (quoteId: string): Invoice => {
    const quote = quotes.find(q => q.id === quoteId);
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'invoiced' } : q));

    const seq = invoices.length + 1;
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `RE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      quoteId,
      producerId: quote?.producerId || currentProducer.id,
      amount: quote?.quotedPrice || 0,
      currency: quote?.currency || currentProducer.currency,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      qrReference: generateQrReference(seq),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setInvoices(prev => [newInvoice, ...prev]);
    if (activeQuote && activeQuote.id === quoteId) {
      setActiveQuote(prev => prev ? { ...prev, status: 'invoiced' } : null);
    }
    return newInvoice;
  };

  const markInvoicePaid = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid', paidAt: new Date().toISOString() } : inv));
    const invoice = invoices.find(i => i.id === invoiceId);
    if (invoice) {
      setQuotes(prev => prev.map(q => q.id === invoice.quoteId ? { ...q, status: 'paid' } : q));
    }
  };

  // Reviews
  const addReview = (review: Omit<Review, 'id' | 'createdAt'>) => {
    const newReview: Review = { ...review, id: `rev-${Date.now()}`, createdAt: new Date().toISOString() };
    setReviews(prev => [newReview, ...prev]);
  };

  // Saved Recipes / Nachbestellen
  const saveRecipe = (recipe: Omit<SavedRecipe, 'id' | 'savedAt'>) => {
    const newRecipe: SavedRecipe = { ...recipe, id: `saved-${Date.now()}`, savedAt: new Date().toISOString() };
    setSavedRecipes(prev => [newRecipe, ...prev]);
  };

  const removeSavedRecipe = (id: string) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode: handleSetMode,
        producers,
        products,
        orders,
        quotes,
        invoices,
        reviews,
        savedRecipes,
        selectedProducerId,
        setSelectedProducerId,
        currentProducer,
        myProducerIds,
        myProducers,
        isPortalUnlocked,
        unlockPortal,
        createProducer,
        updateProducer,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal,
        cartRequiresQuote,
        createOrderFromCart,
        updateOrderStatus,
        activeOrder,
        setActiveOrder,
        getBatchCapacityInfo,
        saveProduct,
        deleteProduct,
        createQuoteRequest,
        respondToQuote,
        acceptQuote,
        issueInvoice,
        declineQuote,
        markInvoicePaid,
        activeQuote,
        setActiveQuote,
        addReview,
        saveRecipe,
        removeSavedRecipe,
        customerView,
        setCustomerView,
        activeProduct,
        setActiveProduct,
        infoProduct,
        setInfoProduct,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        printSlipOrder,
        setPrintSlipOrder,
        isOnboardingOpen,
        setIsOnboardingOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
