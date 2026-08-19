import { AllergenCode, Product, RecipeItem } from './types';

// The 14 allergens that must be declared under EU LMIV (Art. 9/Anhang II) and
// Swiss LIV (Lebensmittelinformationsverordnung, Anhang 3) for pre-packaged food.
export const ALLERGEN_LABELS: Record<AllergenCode, string> = {
  gluten: 'Glutenhaltiges Getreide',
  crustaceans: 'Krebstiere',
  eggs: 'Eier',
  fish: 'Fisch',
  peanuts: 'Erdnüsse',
  soy: 'Soja',
  milk: 'Milch/Laktose',
  nuts: 'Schalenfrüchte',
  celery: 'Sellerie',
  mustard: 'Senf',
  sesame: 'Sesam',
  sulfites: 'Sulfite',
  lupin: 'Lupinen',
  molluscs: 'Weichtiere',
};

export const ALL_ALLERGEN_CODES: AllergenCode[] = Object.keys(ALLERGEN_LABELS) as AllergenCode[];

// Single source of truth for the LMIV/LIV-relevant allergens of one cart/order
// item: the product's own fixed allergens, plus whichever recipe components
// and custom-field choices actually ended up in this specific customization.
// Used both for the live customizer preview and for what gets persisted on
// the order — they must never diverge, since the printed label is generated
// from the same aggregation and both are shown to the customer together.
export function aggregateAllergens(
  product: Product,
  recipe?: RecipeItem[],
  customFieldValues?: Record<string, any>
): AllergenCode[] {
  const set = new Set<AllergenCode>();
  (product.allergens || []).forEach(a => set.add(a));

  const config = product.config;
  if (config) {
    (recipe || []).forEach(r => {
      const comp = config.components.find(c => c.id === r.componentId);
      (comp?.allergens || []).forEach(a => set.add(a));
    });
    (config.customFields || []).forEach(f => {
      const val = customFieldValues?.[f.key];
      const matched = f.choices?.find(c => c.value === val);
      (matched?.allergens || []).forEach(a => set.add(a));
    });
  }

  return Array.from(set);
}
