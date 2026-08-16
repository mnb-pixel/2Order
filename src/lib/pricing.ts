import { Product, RecipeItem } from './types';

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
