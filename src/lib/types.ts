export type CraftCategory = 'coffee' | 'beer' | 'chocolate' | 'spirits' | 'ice_cream' | 'deli';
export type DACHCountry = 'CH' | 'DE' | 'AT';
export type CurrencyCode = 'CHF' | 'EUR';

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
  leadTimeSchedule: string; // e.g. "Röstung jeden Dienstag, Versand Mittwoch"
  batchScheduleNotice: string;
  establishedYear: number;
}

export interface BlendComponent {
  id: string;
  name: string;
  origin: string;
  process?: string; // e.g. "Washed", "Natural", "Cryo-Hop"
  notes: string[];
  maxRatio: number;
  priceMultiplier: number; // e.g. 1.0, 1.2
  color: string; // Hex for visual blend bar
  inStock: boolean;
}

export interface OptionChoice {
  label: string;
  value: string;
  priceDelta?: number;
  description?: string;
}

export interface CustomizationOption {
  key: string;
  title: string;
  type: 'select' | 'radio' | 'pills';
  values: OptionChoice[];
  defaultValue: string;
}

export interface LabelCustomizationConfig {
  allowed: boolean;
  maxTitleLength: number;
  maxDedicationLength: number;
  fontStyles: Array<{ id: string; label: string; fontFamily: string; styleClass: string }>;
  templateType: 'coffee_bag' | 'beer_bottle' | 'chocolate_wrap' | 'modern_minimal';
  badgeOptions?: string[];
}

export interface CustomizationConfig {
  id: string;
  productId: string;
  type: 'blend_or_mix' | 'box_builder' | 'single_origin_custom';
  targetTotalPercent: number; // usually 100
  totalWeightGrams: number; // e.g. 500g coffee or 330ml bottle
  components: BlendComponent[];
  options: CustomizationOption[];
  labelCustomization: LabelCustomizationConfig;
}

export interface Product {
  id: string;
  producerId: string;
  title: string;
  subtitle: string;
  description: string;
  category: CraftCategory;
  basePrice: number;
  unitText: string; // e.g. "500g Beutel", "6x 330ml Box", "100g Tafel"
  weightGrams: number;
  isCustomizable: boolean;
  isActive: boolean;
  images: string[];
  tags: string[];
  config?: CustomizationConfig;
}

export interface RecipeItem {
  componentId: string;
  componentName: string;
  origin: string;
  ratio: number; // Percentage (e.g. 60)
  grams: number; // Calculated grams based on total weight
}

export interface CustomLabelData {
  headline: string;
  subtitle: string;
  dedication?: string;
  fontStyle: string; // Font id e.g. 'swiss-sans' | 'editorial-serif' | 'minimal-mono'
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
  recipe?: RecipeItem[];
  selections?: Record<string, string>;
  customLabel?: CustomLabelData;
  renderedLabelSvg?: string;
  weightGrams: number;
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
  taxRate: number; // e.g. 0.081 for CH (8.1%)
  taxAmount: number;
  total: number;
  fulfillmentType: 'shipping' | 'pickup';
  paymentMethod: 'twint' | 'apple_pay' | 'card';
  paymentStatus: 'paid';
  createdAt: string;
  scheduledBatchDate: string;
  trackingNumber?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  producer: Producer;
  quantity: number;
  unitPrice: number;
  recipe?: RecipeItem[];
  selections?: Record<string, string>;
  customLabel?: CustomLabelData;
  renderedLabelSvg?: string;
}
