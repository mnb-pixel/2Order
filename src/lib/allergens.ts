import { AllergenCode } from './types';

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
