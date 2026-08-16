export type CraftCategory = 'coffee' | 'beer' | 'chocolate' | 'spirits' | 'ice_cream' | 'deli' | 'tea' | 'bakery';
export type DACHCountry = 'CH' | 'DE' | 'AT';
export type CurrencyCode = 'CHF' | 'EUR';

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

// MARK: - Complete Made-to-Order Customization Configuration
export interface CustomizationConfig {
  id: string;
  productId: string;
  sliderMode: SliderMode; // 'percentage_100', 'free_quantity', 'ratio'
  targetTotal: number; // e.g. 100% or 500g or 6 bottles
  targetUnit: string; // "%", "g", "ml", "Stück"
  totalWeightGrams: number;
  sliderTitle: string; // e.g. "Bohnenmischung (100% gesperrt)"
  sliderDescription?: string;
  components: DynamicSliderComponent[];
  customFields: DynamicCustomField[];
  labelConfig: ManufacturerLabelConfig;
}

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
