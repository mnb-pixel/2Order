import React, { createContext, useContext, useState, useEffect } from 'react';
import { Producer, Product, Order, CartItem, OrderStatus } from './types';
import { SEED_PRODUCERS, SEED_PRODUCTS, INITIAL_ORDERS } from '../db/seed';

interface AppContextType {
  // Mode & Role Separation
  mode: 'customer' | 'producer';
  setMode: (mode: 'customer' | 'producer') => void;

  // Multi-Tenant Data
  producers: Producer[];
  products: Product[];
  orders: Order[];
  
  // Producer context
  selectedProducerId: string;
  setSelectedProducerId: (id: string) => void;
  currentProducer: Producer;

  // New Business Onboarding
  createProducer: (producerData: Omit<Producer, 'id' | 'slug' | 'stripeConnected'>) => Producer;
  updateProducer: (id: string, updates: Partial<Producer>) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartTotal: number;

  // Order management
  createOrderFromCart: (orderData: Partial<Order>) => Order;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;

  // Product & Recipe management (Producer portal)
  saveProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;

  // Customer navigation state
  customerView: 'discover' | 'producer' | 'customizer' | 'tracking';
  setCustomerView: (view: 'discover' | 'producer' | 'customizer' | 'tracking') => void;
  activeProduct: Product | null;
  setActiveProduct: (product: Product | null) => void;

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

const LOCAL_STORAGE_KEY = 'atelier_mto_state_v2';

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

  // Selected Producer for Portal
  const [selectedProducerId, setSelectedProducerId] = useState<string>('prod-maelstrom');

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_cart`);
    return saved ? JSON.parse(saved) : [];
  });

  // Navigation & Modals
  const [customerView, setCustomerView] = useState<'discover' | 'producer' | 'customizer' | 'tracking'>('discover');
  const [activeProduct, setActiveProduct] = useState<Product | null>(products[0] || null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
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
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_cart`, JSON.stringify(cart));
  }, [cart]);

  // Current producer object
  const currentProducer = producers.find(p => p.id === selectedProducerId) || producers[0];

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
    setSelectedProducerId(newId);
    return newProducer;
  };

  const updateProducer = (id: string, updates: Partial<Producer>) => {
    setProducers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
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

  // Order Actions
  const createOrderFromCart = (orderData: Partial<Order>): Order => {
    const newOrderNumber = `ATL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const producer = cart[0]?.producer || currentProducer;
    const subtotal = cartTotal;
    const taxRate = producer.country === 'CH' ? 0.081 : producer.country === 'DE' ? 0.19 : 0.20;
    const taxAmount = subtotal * taxRate;

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
      })),
      status: 'paid',
      currency: producer.currency,
      subtotal: Number(subtotal.toFixed(2)),
      taxRate: taxRate,
      taxAmount: Number(taxAmount.toFixed(2)),
      total: Number(subtotal.toFixed(2)),
      fulfillmentType: orderData.fulfillmentType || 'shipping',
      paymentMethod: orderData.paymentMethod || 'twint',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      scheduledBatchDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      ...orderData,
    };

    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    setActiveOrder(newOrder);
    setCustomerView('tracking');
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (activeOrder && activeOrder.id === orderId) {
      setActiveOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
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

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        producers,
        products,
        orders,
        selectedProducerId,
        setSelectedProducerId,
        currentProducer,
        createProducer,
        updateProducer,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal,
        createOrderFromCart,
        updateOrderStatus,
        activeOrder,
        setActiveOrder,
        saveProduct,
        deleteProduct,
        customerView,
        setCustomerView,
        activeProduct,
        setActiveProduct,
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
