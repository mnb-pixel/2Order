import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Product, CustomizationConfig, DynamicSliderComponent, DynamicCustomField, DynamicFieldChoice, CustomFieldType, SliderMode, CustomizationArchetype } from '../../lib/types';
import { ALL_ALLERGEN_CODES, ALLERGEN_LABELS } from '../../lib/allergens';
import { Plus, Trash2, Sliders, Layers, Type, Package, AlertTriangle } from 'lucide-react';

interface DynamicCanvasBuilderProps {
  product: Product;
  onUpdateConfig: (newConfig: CustomizationConfig) => void;
}

export const DynamicCanvasBuilder: React.FC<DynamicCanvasBuilderProps> = ({ product, onUpdateConfig }) => {
  const { currentProducer } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'sliders' | 'fields' | 'label'>('sliders');

  const config: CustomizationConfig = product.config || {
    id: `cfg-${product.id}`,
    productId: product.id,
    archetype: 'recipe_blend',
    sliderMode: 'percentage_100',
    targetTotal: 100,
    targetUnit: '%',
    totalWeightGrams: product.weightGrams || 500,
    sliderTitle: 'Rezeptur-Mischung (100% gesperrt)',
    sliderDescription: 'Verschieben Sie die Anteile. Die Gesamtrezeptur bleibt immer exakt bei 100%.',
    components: [
      { id: 'c1', name: 'Komponente 1', origin: 'Ursprung 1', notes: ['Aroma 1'], maxRatio: 100, priceMultiplier: 1.0, color: '#A65335', inStock: true, unitText: '%' },
      { id: 'c2', name: 'Komponente 2', origin: 'Ursprung 2', notes: ['Aroma 2'], maxRatio: 100, priceMultiplier: 1.0, color: '#633A26', inStock: true, unitText: '%' },
    ],
    customFields: [],
    labelConfig: {
      allowed: true,
      templateType: 'coffee_bag',
      headlinePlaceholder: 'z.B. Julians Signature Creation',
      maxHeadlineLength: 28,
      allowDedication: true,
      dedicationPlaceholder: 'z.B. Für besondere Anlässe',
      maxDedicationLength: 45,
      fixedBrandStamp: `+ SWISS CRAFT · ${currentProducer.name.toUpperCase()}`,
      availableFonts: [
        { id: 'swiss-sans', label: 'Swiss Neo-Grotesk', fontFamily: 'Inter, sans-serif', styleClass: 'font-sans uppercase tracking-widest font-semibold' },
        { id: 'editorial-serif', label: 'Zurich Heritage Serif', fontFamily: 'Playfair Display, serif', styleClass: 'font-serif italic tracking-normal' },
        { id: 'minimal-mono', label: 'Atelier Technical Mono', fontFamily: 'JetBrains Mono, monospace', styleClass: 'font-mono font-medium tracking-tight' },
      ],
    },
  };

  // Slider actions
  const handleAddSliderComponent = () => {
    const newComp: DynamicSliderComponent = {
      id: `comp-${Date.now()}`,
      name: 'Neuer Rohstoff / Sorte',
      origin: 'Ursprungsregion / Terroir',
      notes: ['Geschmacksnote'],
      maxRatio: 100,
      priceMultiplier: 1.0,
      color: '#8E8E84',
      inStock: true,
      unitText: config.targetUnit,
    };
    onUpdateConfig({
      ...config,
      components: [...config.components, newComp],
    });
  };

  const handleRemoveSliderComponent = (id: string) => {
    onUpdateConfig({
      ...config,
      components: config.components.filter(c => c.id !== id),
    });
  };

  const handleUpdateComponent = (id: string, updates: Partial<DynamicSliderComponent>) => {
    onUpdateConfig({
      ...config,
      components: config.components.map(c => c.id === id ? { ...c, ...updates } : c),
    });
  };

  // Custom Field actions
  const handleAddField = () => {
    const newField: DynamicCustomField = {
      id: `f-${Date.now()}`,
      key: `field_${config.customFields.length + 1}`,
      title: 'Neues Auswahlfeld (z.B. Mahlgrad oder Zutat)',
      type: 'pills',
      isRequired: true,
      defaultValue: 'choice_1',
      choices: [
        { id: '1', label: 'Option A', value: 'choice_1', priceDelta: 0, description: 'Standardauswahl' },
        { id: '2', label: 'Option B (Aufpreis)', value: 'choice_2', priceDelta: 2.50, description: 'Spezialausführung' },
      ],
    };
    onUpdateConfig({
      ...config,
      customFields: [...config.customFields, newField],
    });
  };

  const handleRemoveField = (id: string) => {
    onUpdateConfig({
      ...config,
      customFields: config.customFields.filter(f => f.id !== id),
    });
  };

  const handleUpdateField = (id: string, updates: Partial<DynamicCustomField>) => {
    onUpdateConfig({
      ...config,
      customFields: config.customFields.map(f => f.id === id ? { ...f, ...updates } : f),
    });
  };

  const handleAddChoiceToField = (fieldId: string) => {
    const field = config.customFields.find(f => f.id === fieldId);
    if (!field) return;
    const newChoice: DynamicFieldChoice = {
      id: `ch-${Date.now()}`,
      label: 'Neue Option',
      value: `opt_${Date.now()}`,
      priceDelta: 0,
    };
    handleUpdateField(fieldId, {
      choices: [...(field.choices || []), newChoice],
    });
  };

  const handleRemoveChoiceFromField = (fieldId: string, choiceId: string) => {
    const field = config.customFields.find(f => f.id === fieldId);
    if (!field) return;
    handleUpdateField(fieldId, {
      choices: (field.choices || []).filter(c => c.id !== choiceId),
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-Tab Navigation for Builder */}
      <div className="flex border-b border-stone-200 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveSubTab('sliders')}
          className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'sliders'
              ? 'border-stone-900 text-stone-900 bg-stone-50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-atelier-terracotta" />
          <span>A. SCHIEBEREGLER & ROHSTOFFE ({config.components.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('fields')}
          className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'fields'
              ? 'border-stone-900 text-stone-900 bg-stone-50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-atelier-terracotta" />
          <span>B. ZUSATZFELDER & OPTIONEN ({config.customFields.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('label')}
          className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'label'
              ? 'border-stone-900 text-stone-900 bg-stone-50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-atelier-terracotta" />
          <span>C. ETIKETTEN-VORGABEN DES HERSTELLERS</span>
        </button>
      </div>

      {/* SUBTAB A: Custom Sliders */}
      {activeSubTab === 'sliders' && (
        <div className="space-y-5">
          {/* General Slider Settings */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-mono font-bold text-stone-700 block mb-1">Customization-Archetyp</label>
              <select
                value={config.archetype || 'recipe_blend'}
                onChange={(e) => onUpdateConfig({ ...config, archetype: e.target.value as CustomizationArchetype })}
                className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-semibold"
              >
                <option value="recipe_blend">Rezeptur-Blend (Schieber, % oder Ratio)</option>
                <option value="build_a_box">Build-a-Box (freie Menge, z.B. Kugeln/Toppings)</option>
                <option value="bespoke">Bespoke Einzelstück (kaum/kein Schieber)</option>
              </select>
              {config.archetype === 'bespoke' && (
                <p className="text-[10px] text-stone-500 mt-1">Rohstoff-Schieber sind optional — Kunden konfigurieren primär über Zusatzfelder (Tab B).</p>
              )}
            </div>
            <div>
              <label className="font-mono font-bold text-stone-700 block mb-1">Schieber-Modus</label>
              <select
                value={config.sliderMode}
                onChange={(e) => onUpdateConfig({ ...config, sliderMode: e.target.value as SliderMode })}
                className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-semibold"
              >
                <option value="percentage_100">100% Summen-Sperre (Linked Ratios)</option>
                <option value="free_quantity">Freie Mengeneinheiten (z.B. Stück/Gramm)</option>
                <option value="ratio">Freies Verhältnis (z.B. Botanicals-Ratio)</option>
              </select>
            </div>

            <div>
              <label className="font-mono font-bold text-stone-700 block mb-1">Schieber-Bereichs-Titel</label>
              <input
                type="text"
                value={config.sliderTitle}
                onChange={(e) => onUpdateConfig({ ...config, sliderTitle: e.target.value })}
                className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-xs"
              />
            </div>

            <div>
              <label className="font-mono font-bold text-stone-700 block mb-1">Einheit & Zielsumme</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.targetUnit}
                  onChange={(e) => onUpdateConfig({ ...config, targetUnit: e.target.value })}
                  placeholder="%"
                  className="w-1/2 px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-mono text-center"
                />
                <input
                  type="number"
                  value={config.targetTotal}
                  onChange={(e) => onUpdateConfig({ ...config, targetTotal: parseInt(e.target.value, 10) || 100 })}
                  className="w-1/2 px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-mono font-bold text-center"
                />
              </div>
            </div>
          </div>

          {/* Component Sliders List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-mono font-bold text-xs text-stone-700 uppercase">
                Rohstoff-Schieber ({config.components.length} definiert)
              </span>
              <button
                type="button"
                onClick={handleAddSliderComponent}
                className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schieber hinzufügen</span>
              </button>
            </div>

            {config.components.map((comp) => (
              <div
                key={comp.id}
                className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 shadow-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="font-mono text-stone-600 block mb-1 font-bold">Name der Sorte / Zutat</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={comp.color}
                        onChange={(e) => handleUpdateComponent(comp.id, { color: e.target.value })}
                        className="w-8 h-8 rounded border border-stone-300 p-0 cursor-pointer shrink-0"
                        title="Balkenfarbe wählen"
                      />
                      <input
                        type="text"
                        value={comp.name}
                        onChange={(e) => handleUpdateComponent(comp.id, { name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-stone-600 block mb-1 font-bold">Herkunft / Terroir</label>
                    <input
                      type="text"
                      value={comp.origin || ''}
                      onChange={(e) => handleUpdateComponent(comp.id, { origin: e.target.value })}
                      placeholder="z.B. Yirgacheffe, 2050m"
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-stone-600 block mb-1 font-bold">Verarbeitung / Noten</label>
                    <input
                      type="text"
                      value={comp.process || ''}
                      onChange={(e) => handleUpdateComponent(comp.id, { process: e.target.value })}
                      placeholder="z.B. Washed / Bergamotte"
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-stone-600 block mb-1 font-bold">Preisfaktor (1.0 = normal)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        value={comp.priceMultiplier}
                        onChange={(e) => handleUpdateComponent(comp.id, { priceMultiplier: parseFloat(e.target.value) || 1.0 })}
                        className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSliderComponent(comp.id)}
                        className="text-stone-400 hover:text-red-600 p-1"
                        title="Schieber löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inventory & Cost row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100 text-xs">
                  <div>
                    <label className="font-mono text-stone-600 block mb-1 font-bold flex items-center gap-1">
                      <Package className="w-3 h-3 text-atelier-terracotta" /> Lagerbestand ({comp.unitText || config.targetUnit})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={comp.stockQuantity ?? ''}
                      placeholder="unbegrenzt"
                      onChange={(e) => handleUpdateComponent(comp.id, { stockQuantity: e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-stone-600 block mb-1 font-bold">Rohstoffkosten / Einheit ({currentProducer.currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={comp.costPerUnit ?? ''}
                      placeholder="0.00"
                      onChange={(e) => handleUpdateComponent(comp.id, { costPerUnit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={comp.inStock}
                        onChange={(e) => handleUpdateComponent(comp.id, { inStock: e.target.checked })}
                        className="rounded border-stone-300 text-stone-900 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-stone-800">Verfügbar / lieferbar</span>
                    </label>
                  </div>
                </div>

                {/* Allergen declaration row (LMIV / LIV) */}
                <div className="pt-2 border-t border-stone-100">
                  <label className="font-mono text-stone-600 block mb-1.5 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-atelier-terracotta" /> Allergene dieser Zutat (Pflichtangabe)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_ALLERGEN_CODES.map(code => {
                      const active = (comp.allergens || []).includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            const current = comp.allergens || [];
                            const next = active ? current.filter(a => a !== code) : [...current, code];
                            handleUpdateComponent(comp.id, { allergens: next });
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
                            active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          {ALLERGEN_LABELS[code]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {config.components.length === 0 && (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 text-xs text-stone-500 font-mono">
                Keine Rohstoff-Schieber definiert — passend für den Archetyp "Bespoke Einzelstück". Kunden konfigurieren dann ausschliesslich über Zusatzfelder (Tab B).
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB B: Dynamic Custom Fields (Dropdowns, Pills, Toggles, Texts) */}
      {activeSubTab === 'fields' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-mono font-bold text-xs text-stone-700 uppercase">
                Zusatzfelder & Auswahloptionen
              </span>
              <p className="text-[11px] text-stone-500">
                Erstellen Sie benutzerdefinierte Pflichtfelder, Mahlgrade, Gravurtexte oder Geschenkoptionen.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddField}
              className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Feld hinzufügen</span>
            </button>
          </div>

          {config.customFields.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 text-xs text-stone-500 font-mono">
              Noch keine Zusatzfelder angelegt. Klicken Sie auf „Feld hinzufügen“.
            </div>
          ) : (
            config.customFields.map((field) => (
              <div
                key={field.id}
                className="p-4 bg-white border border-stone-200 rounded-xl space-y-4 shadow-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="font-mono text-stone-600 block mb-1 font-bold">Feldbezeichnung (Titel)</label>
                    <input
                      type="text"
                      value={field.title}
                      onChange={(e) => handleUpdateField(field.id, { title: e.target.value })}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-semibold text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-stone-600 block mb-1 font-bold">Feldtyp</label>
                    <select
                      value={field.type}
                      onChange={(e) => handleUpdateField(field.id, { type: e.target.value as CustomFieldType })}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-semibold"
                    >
                      <option value="pills">Pills / Auswahlbuttons</option>
                      <option value="select">Dropdown-Menü</option>
                      <option value="text">Freitext-Eingabe (z.B. Gravur)</option>
                      <option value="toggle">Ja/Nein Schalter</option>
                      <option value="number">Zahlenfeld / Mengenzähler</option>
                    </select>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(e) => handleUpdateField(field.id, { isRequired: e.target.checked })}
                        className="rounded border-stone-300 text-stone-900 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-stone-800">Pflichtfeld</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="text-stone-400 hover:text-red-600 p-2"
                      title="Feld löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Choices editor for Pills / Select */}
                {(field.type === 'pills' || field.type === 'select') && (
                  <div className="p-3 bg-stone-50 rounded-lg space-y-2 border border-stone-200">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-stone-500 uppercase">
                      <span>Wählbare Optionen & Aufpreise</span>
                      <button
                        type="button"
                        onClick={() => handleAddChoiceToField(field.id)}
                        className="text-stone-900 hover:underline font-bold"
                      >
                        + Option hinzufügen
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(field.choices || []).map((ch) => (
                        <div key={ch.id} className="flex gap-2 items-center text-xs">
                          <input
                            type="text"
                            placeholder="Options-Name (z.B. Espresso-Fein)"
                            value={ch.label}
                            onChange={(e) => {
                              const updated = (field.choices || []).map(c => c.id === ch.id ? { ...c, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') } : c);
                              handleUpdateField(field.id, { choices: updated });
                            }}
                            className="flex-1 px-2.5 py-1 bg-white border border-stone-300 rounded text-xs"
                          />
                          <div className="flex items-center gap-1 w-36">
                            <span className="font-mono text-stone-500 text-[10px]">+{currentProducer.currency}</span>
                            <input
                              type="number"
                              step="0.50"
                              placeholder="0.00"
                              value={ch.priceDelta}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = (field.choices || []).map(c => c.id === ch.id ? { ...c, priceDelta: val } : c);
                                handleUpdateField(field.id, { choices: updated });
                              }}
                              className="w-full px-2 py-1 bg-white border border-stone-300 rounded font-mono font-bold text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveChoiceFromField(field.id, ch.id)}
                            className="text-stone-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB C: Manufacturer Label Rules & Constraints */}
      {activeSubTab === 'label' && (
        <div className="p-5 bg-white border border-stone-200 rounded-xl space-y-4 shadow-xs text-xs">
          <div className="border-b border-stone-200 pb-3">
            <h4 className="font-mono font-bold uppercase text-stone-800 text-xs">
              HERSTELLER-GRUNDVORGABEN FÜR DAS ETIKETT
            </h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Legen Sie fest, welche Personalisierungen Kunden auf der Verpackung vornehmen dürfen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-stone-700 block mb-1 font-bold">Verpackungs-Vorlage</label>
              <select
                value={config.labelConfig.templateType}
                onChange={(e) => onUpdateConfig({
                  ...config,
                  labelConfig: { ...config.labelConfig, templateType: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white text-xs font-semibold"
              >
                <option value="coffee_bag">Kaffee-Ventilbeutel (A6 Querformat)</option>
                <option value="beer_bottle">Bierflaschen-Banderole (Rundum-Etikett)</option>
                <option value="chocolate_wrap">Schokoladen-Schuber / Pergamin</option>
                <option value="modern_minimal">Universelles Swiss Minimal Grid</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-stone-700 block mb-1 font-bold">Fester Manufaktur-Stempel (Unten)</label>
              <input
                type="text"
                value={config.labelConfig.fixedBrandStamp}
                onChange={(e) => onUpdateConfig({
                  ...config,
                  labelConfig: { ...config.labelConfig, fixedBrandStamp: e.target.value }
                })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="font-mono text-stone-700 block mb-1 font-bold">Titel-Platzhalter & Max. Zeichen</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.labelConfig.headlinePlaceholder}
                  onChange={(e) => onUpdateConfig({
                    ...config,
                    labelConfig: { ...config.labelConfig, headlinePlaceholder: e.target.value }
                  })}
                  className="w-2/3 px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
                <input
                  type="number"
                  value={config.labelConfig.maxHeadlineLength}
                  onChange={(e) => onUpdateConfig({
                    ...config,
                    labelConfig: { ...config.labelConfig, maxHeadlineLength: parseInt(e.target.value, 10) || 28 }
                  })}
                  className="w-1/3 px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold text-center"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-stone-700 block mb-1 font-bold">Persönliche Widmung erlauben</label>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.labelConfig.allowDedication}
                    onChange={(e) => onUpdateConfig({
                      ...config,
                      labelConfig: { ...config.labelConfig, allowDedication: e.target.checked }
                    })}
                    className="rounded border-stone-300 text-stone-900 w-4 h-4"
                  />
                  <span className="font-bold">Aktiviert</span>
                </label>
                <input
                  type="number"
                  value={config.labelConfig.maxDedicationLength}
                  onChange={(e) => onUpdateConfig({
                    ...config,
                    labelConfig: { ...config.labelConfig, maxDedicationLength: parseInt(e.target.value, 10) || 45 }
                  })}
                  placeholder="Max. Zeichen"
                  className="w-24 px-2 py-1 border border-stone-300 rounded text-xs font-mono text-center"
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
