import { CraftCategory, CustomizationArchetype, ShippingRestriction } from './types';

export interface CategoryMeta {
  id: CraftCategory;
  label: string; // German display label
  archetype: CustomizationArchetype;
  shippingRestriction: ShippingRestriction;
  labelTemplateType: 'coffee_bag' | 'beer_bottle' | 'chocolate_wrap' | 'modern_minimal' | 'custom_box';
  exampleComponents: string; // hint text shown to producers during onboarding
}

// Central registry mapping every supported food-craft vertical to its default
// customization mechanics, so a new producer doesn't start from a blank
// coffee-shaped canvas regardless of what they actually make.
export const CATEGORY_META: Record<CraftCategory, CategoryMeta> = {
  coffee: {
    id: 'coffee', label: 'Kaffeerösterei (Specialty Coffee)', archetype: 'recipe_blend',
    shippingRestriction: 'standard', labelTemplateType: 'coffee_bag',
    exampleComponents: 'z.B. Äthiopien Yirgacheffe, Kolumbien Huila — Anteile in %',
  },
  tea: {
    id: 'tea', label: 'Tee- & Kräutermanufaktur', archetype: 'recipe_blend',
    shippingRestriction: 'standard', labelTemplateType: 'modern_minimal',
    exampleComponents: 'z.B. Sencha, Pfefferminze, Hibiskus — Anteile in %',
  },
  spirits: {
    id: 'spirits', label: 'Destillerie / Gin / Whisky', archetype: 'recipe_blend',
    shippingRestriction: 'standard', labelTemplateType: 'custom_box',
    exampleComponents: 'z.B. Wacholder, Koriander, Angelikawurzel — Botanicals-Anteile',
  },
  chocolate: {
    id: 'chocolate', label: 'Chocolatier (Bean-to-Bar)', archetype: 'recipe_blend',
    shippingRestriction: 'standard', labelTemplateType: 'chocolate_wrap',
    exampleComponents: 'z.B. Kakaogehalt, Nuss-/Fruchtinklusionen — Anteile in %',
  },
  beer: {
    id: 'beer', label: 'Brauerei (Craft Beer / Mikrobrauerei)', archetype: 'build_a_box',
    shippingRestriction: 'standard', labelTemplateType: 'beer_bottle',
    exampleComponents: 'z.B. 6 Flaschen aus dem Sortiment frei zusammenstellen',
  },
  ice_cream: {
    id: 'ice_cream', label: 'Eismanufaktur / Gelato', archetype: 'build_a_box',
    shippingRestriction: 'pickup_only', labelTemplateType: 'modern_minimal',
    exampleComponents: 'z.B. Kugeln je Sorte + Toppings frei wählen',
  },
  deli: {
    id: 'deli', label: 'Feinkost / Manufaktur', archetype: 'build_a_box',
    shippingRestriction: 'cold_chain', labelTemplateType: 'custom_box',
    exampleComponents: 'z.B. Platte aus Käse/Wurst-Sorten nach Gramm zusammenstellen',
  },
  cheese: {
    id: 'cheese', label: 'Käserei', archetype: 'build_a_box',
    shippingRestriction: 'cold_chain', labelTemplateType: 'custom_box',
    exampleComponents: 'z.B. Käseplatte aus mehreren Sorten nach Gramm',
  },
  charcuterie: {
    id: 'charcuterie', label: 'Wurstwaren / Charcuterie', archetype: 'build_a_box',
    shippingRestriction: 'cold_chain', labelTemplateType: 'custom_box',
    exampleComponents: 'z.B. Wurst-/Schinkenauswahl nach Gramm',
  },
  jam: {
    id: 'jam', label: 'Konfitüre / Sirup', archetype: 'recipe_blend',
    shippingRestriction: 'standard', labelTemplateType: 'modern_minimal',
    exampleComponents: 'z.B. Frucht-/Zuckeranteile der Rezeptur',
  },
  honey: {
    id: 'honey', label: 'Honigmanufaktur', archetype: 'bespoke',
    shippingRestriction: 'standard', labelTemplateType: 'modern_minimal',
    exampleComponents: 'meist Einzelprodukt — Etikett & Widmung personalisieren',
  },
  ferments: {
    id: 'ferments', label: 'Fermente / Kombucha', archetype: 'recipe_blend',
    shippingRestriction: 'standard', labelTemplateType: 'modern_minimal',
    exampleComponents: 'z.B. Teebasis, Frucht-/Gewürzanteile',
  },
  pasta: {
    id: 'pasta', label: 'Pasta-Manufaktur', archetype: 'bespoke',
    shippingRestriction: 'standard', labelTemplateType: 'custom_box',
    exampleComponents: 'z.B. Sorte, Füllung, Menge als Zusatzfelder',
  },
  nut_butter: {
    id: 'nut_butter', label: 'Nussmus-Manufaktur', archetype: 'recipe_blend',
    shippingRestriction: 'standard', labelTemplateType: 'modern_minimal',
    exampleComponents: 'z.B. Nusssorten-Anteile, Süße/Salz als Zusatzoption',
  },
  sauces: {
    id: 'sauces', label: 'Saucen / Gewürzmischungen', archetype: 'recipe_blend',
    shippingRestriction: 'standard', labelTemplateType: 'modern_minimal',
    exampleComponents: 'z.B. Gewürz-/Chili-Anteile der Mischung',
  },
  bakery: {
    id: 'bakery', label: 'Bäckerei / Konditorei', archetype: 'bespoke',
    shippingRestriction: 'pickup_only', labelTemplateType: 'custom_box',
    exampleComponents: 'z.B. Grösse, Füllung, Anlass, Wunschtext als Zusatzfelder',
  },
};

export const CATEGORY_LIST: CraftCategory[] = Object.keys(CATEGORY_META) as CraftCategory[];
