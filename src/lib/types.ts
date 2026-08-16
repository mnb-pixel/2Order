export type CraftCategory =
  | 'coffee' | 'beer' | 'chocolate' | 'spirits' | 'ice_cream' | 'deli' | 'tea' | 'bakery'
  | 'cheese' | 'jam' | 'honey' | 'ferments' | 'pasta' | 'charcuterie' | 'nut_butter' | 'sauces';
export type DACHCountry = 'CH' | 'DE' | 'AT';
export type CurrencyCode = 'CHF' | 'EUR';

// MARK: - Allergens (EU/CH LMIV / LIV — 14 declarable allergens)
export type AllergenCode =
  | 'gluten' | 'crustaceans' | 'eggs' | 'fish' | 'peanuts' | 'soy' | 'milk' | 'nuts'
  | 'celery' | 'mustard' | 'sesame' | 'sulfites' | 'lupin' | 'molluscs';

// MARK: - Producer (Gewerbe)
export interface Producer {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: CraftCategory;
  country: DACHCountry;
  city: string;
  currency: CurrencyCode;
  bio: string;
  heroImage: string;
  logoText: string;
  vatNumber: string;
  stripeConnected: boolean;
  leadTimeSchedule: string; // e.g. "Röstung jeden Dienstag, Versand Folgetag"
  batchScheduleNotice: string;
  establishedYear: number;
  contactEmail: string;
  capacityPerBatch?: number; // max Made-to-Order Positionen pro Fertigungscharge
}

// MARK: - Dynamic Producer-Defined Sliders
export type SliderMode = 'percentage_100' | 'free_quantity' | 'ratio';

export interface DynamicSliderComponent {
  id: string;
  name: string;
  subtitle?: string;
  origin?: string;
  process?: string;
  notes: string[];
  minRatio?: number;
  maxRatio: number;
  step?: number;
  priceMultiplier: number; // 1.0 = base, 1.2 = +20%
  color: string; // Hex color for visual stack bar
  inStock: boolean;
  unitText?: string; // e.g. "%", "g", "ml", "Kugeln"
  allergens?: AllergenCode[];
  stockQuantity?: number; // real inventory count in the component's own unit; undefined = unlimited
  lowStockThreshold?: number;
  costPerUnit?: number; // Rohstoffkosten pro Einheit (Basis für COGS)
}

// MARK: - Dynamic Producer-Defined Fields (Optionen & Eingaben)
export type CustomFieldType = 'pills' | 'select' | 'text' | 'textarea' | 'number' | 'toggle';

export interface DynamicFieldChoice {
  id: string;
  label: string;
  value: string;
  priceDelta: number; // e.g. +2.50 CHF
  description?: string;
  isDefault?: boolean;
  allergens?: AllergenCode[];
}

export interface DynamicCustomField {
  id: string;
  key: string;
  title: string;
  type: CustomFieldType;
  description?: string;
  isRequired: boolean;
  choices?: DynamicFieldChoice[]; // For pills/select
  defaultValue?: string | number | boolean;
  placeholder?: string;
  maxCharacters?: number;
  minVal?: number;
  maxVal?: number;
  unit?: string;
}

// MARK: - Dynamic Label Editor Settings
export interface LabelFontOption {
  id: string;
  label: string;
  fontFamily: string;
  styleClass: string;
}

export interface ManufacturerLabelConfig {
  allowed: boolean;
  templateType: 'coffee_bag' | 'beer_bottle' | 'chocolate_wrap' | 'modern_minimal' | 'custom_box';
  headlinePlaceholder: string;
  maxHeadlineLength: number;
  allowDedication: boolean;
  dedicationPlaceholder?: string;
  maxDedicationLength: number;
  availableFonts: LabelFontOption[];
  fixedBrandStamp: string; // e.g. "+ SWISS CRAFT" or "ATELIER CERTIFIED"
  requiredDisclaimer?: string;
  backgroundColorHex?: string;
  accentColorHex?: string;
}

// MARK: - Customization Archetype
// recipe_blend = slider-driven ratio/percentage recipe (coffee, tea, spice, gin)
// build_a_box  = free-quantity assembly (ice cream scoops+toppings, beer flight, deli platter)
// bespoke      = single made-to-order item with little/no slider, mostly custom fields (cake, engraving)
export type CustomizationArchetype = 'recipe_blend' | 'build_a_box' | 'bespoke';

// MARK: - Complete Made-to-Order Customization Configuration
export interface CustomizationConfig {
  id: string;
  productId: string;
  archetype?: CustomizationArchetype; // defaults to 'recipe_blend' when omitted for backwards compatibility
  sliderMode: SliderMode; // 'percentage_100', 'free_quantity', 'ratio'
  targetTotal: number; // e.g. 100% or 500g or 6 bottles
  targetUnit: string; // "%", "g", "ml", "Stück"
  totalWeightGrams: number;
  sliderTitle: string; // e.g. "Bohnenmischung (100% gesperrt)"
  sliderDescription?: string;
  components: DynamicSliderComponent[]; // may be empty for 'bespoke' archetype
  customFields: DynamicCustomField[];
  labelConfig: ManufacturerLabelConfig;
}

// MARK: - Transaction Mode
// instant_checkout = normal direct purchase (Stripe Connect Direct Charge, producer is merchant of record)
// quote_request     = customer requests a quote, producer prices it and invoices directly — platform never touches the money
export type TransactionMode = 'instant_checkout' | 'quote_request';
export type ShippingRestriction = 'standard' | 'pickup_only' | 'cold_chain';

// MARK: - Products (Separation: Standard vs Custom)
export interface Product {
  id: string;
  producerId: string;
  title: string;
  subtitle: string;
  description: string;
  category: CraftCategory;
  basePrice: number;
  unitText: string;
  weightGrams: number;
  isCustomizable: boolean; // true = Made-to-Order / Customizer, false = Standard Produkt
  stockQuantity?: number; // For standard products
  isActive: boolean;
  images: string[];
  tags: string[];
  config?: CustomizationConfig;
  transactionMode?: TransactionMode; // defaults to 'instant_checkout' when omitted
  shippingRestriction?: ShippingRestriction; // defaults to 'standard' when omitted
  allergens?: AllergenCode[]; // fixed allergens of the product itself (independent of chosen components)
}

// MARK: - Customer Order Data
export interface RecipeItem {
  componentId: string;
  componentName: string;
  origin: string;
  ratio: number;
  grams: number;
  unit?: string;
}

export interface CustomLabelData {
  headline: string;
  subtitle: string;
  dedication?: string;
  fontStyle: string;
  batchNumber: string;
  roastOrBrewDate: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weightGrams: number;
  isCustomItem: boolean;
  recipe?: RecipeItem[];
  customFieldValues?: Record<string, any>;
  customLabel?: CustomLabelData;
  renderedLabelSvg?: string;
  lotNumber?: string;
  allergens?: AllergenCode[];
}

export type OrderStatus = 'paid' | 'in_production' | 'labeling' | 'ready_for_pickup' | 'shipped' | 'completed';

export interface CustomerDetails {
  name: string;
  email: string;
  phone?: string;
  street: string;
  postalCode: string;
  city: string;
  country: DACHCountry;
}

export interface Order {
  id: string;
  orderNumber: string;
  producerId: string;
  producerName: string;
  customer: CustomerDetails;
  items: OrderItem[];
  status: OrderStatus;
  currency: CurrencyCode;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  fulfillmentType: 'shipping' | 'pickup';
  paymentMethod: 'twint' | 'apple_pay' | 'card';
  paymentStatus: 'paid';
  createdAt: string;
  scheduledBatchDate: string;
  trackingNumber?: string;
  isGift?: boolean;
  giftMessage?: string;
  giftRecipient?: CustomerDetails; // ship-to address if different from buyer (customer)
  quoteId?: string; // set when this order originated from an accepted Quote/Invoice flow
}

export interface CartItem {
  id: string;
  product: Product;
  producer: Producer;
  quantity: number;
  unitPrice: number;
  recipe?: RecipeItem[];
  customFieldValues?: Record<string, any>;
  customLabel?: CustomLabelData;
  renderedLabelSvg?: string;
  leadTimeInfo: string;
}

// MARK: - Quote / Offerte -> Invoice/Rechnung flow (platform never touches this money)
export type QuoteStatus = 'requested' | 'quoted' | 'declined' | 'accepted' | 'invoiced' | 'paid';

export interface QuoteRequestItem {
  productId: string;
  productTitle: string;
  quantity: number;
  recipe?: RecipeItem[];
  customFieldValues?: Record<string, any>;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  producerId: string;
  producerName: string;
  currency: CurrencyCode;
  customer: CustomerDetails;
  items: QuoteRequestItem[];
  customerNote?: string;
  status: QuoteStatus;
  quotedPrice?: number;
  quotedNote?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  producerId: string;
  amount: number;
  currency: CurrencyCode;
  dueDate: string;
  qrReference: string; // Swiss-QR-Rechnung-style reference number (structured, not a real ISO 20022 QR-IBAN)
  status: 'open' | 'paid';
  createdAt: string;
  paidAt?: string;
}

// MARK: - Reviews
export interface Review {
  id: string;
  producerId: string;
  orderId?: string;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

// MARK: - Saved Recipes ("Nachbestellen" / signature blends)
export interface SavedRecipe {
  id: string;
  producerId: string;
  producerName: string;
  productId: string;
  productTitle: string;
  recipe?: RecipeItem[];
  customFieldValues?: Record<string, any>;
  labelHeadline?: string;
  savedAt: string;
}
