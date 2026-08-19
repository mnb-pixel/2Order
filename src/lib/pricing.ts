import { Product, RecipeItem, DACHCountry } from './types';

// Single source of truth for DACH VAT rates. Prices in this app are always
// gross/VAT-inclusive (what the customer actually pays never changes when
// this function is called) — it only ever splits that gross amount into its
// net + tax components for display and bookkeeping.
export function vatRateFor(country: DACHCountry): number {
  return country === 'CH' ? 0.081 : country === 'DE' ? 0.19 : 0.20;
}

export interface OrderTotals {
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

// Splits a VAT-inclusive cart total into subtotal/tax/total. Used identically
// by the checkout screen (for the price breakdown shown to the customer) and
// by order creation (for the persisted record) so the two can never diverge.
export function calculateOrderTotals(grossTotal: number, country: DACHCountry): OrderTotals {
  const taxRate = vatRateFor(country);
  const taxAmount = grossTotal * (taxRate / (1 + taxRate));
  return {
    taxRate,
    subtotal: Number(grossTotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number(grossTotal.toFixed(2)),
  };
}

// Recomputes the price of a saved/reordered recipe from a product's *current*
// configuration (prices may have changed since the recipe was saved).
export function calculatePriceFromRecipe(
  product: Product,
  recipe: RecipeItem[] | undefined,
  fieldValues: Record<string, any> | undefined
): number {
  if (!product.config) return product.basePrice;
  const config = product.config;
  let componentFactor = 0;
  (recipe || []).forEach(r => {
    const comp = config.components.find(c => c.id === r.componentId);
    const share = (r.ratio || 0) / (config.targetTotal || 100);
    componentFactor += share * (comp?.priceMultiplier || 1.0);
  });
  let price = product.basePrice * (componentFactor > 0 ? componentFactor : 1.0);

  (config.customFields || []).forEach(f => {
    const val = fieldValues?.[f.key];
    const matched = f.choices?.find(c => c.value === val);
    if (matched?.priceDelta) price += matched.priceDelta;
  });

  return Number(price.toFixed(2));
}
