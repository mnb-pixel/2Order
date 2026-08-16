import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { RecipeItem, CustomLabelData } from '../../lib/types';
import { generateLabelSvg } from '../../lib/labelRenderer';
import { ALLERGEN_LABELS } from '../../lib/allergens';
import { ArrowLeft, Check, ShoppingBag, Eye, SlidersHorizontal, Layers, AlertTriangle, Bookmark } from 'lucide-react';
import confetti from 'canvas-confetti';

export const BlendCustomizer: React.FC = () => {
  const { activeProduct, currentProducer, setCustomerView, addToCart, saveRecipe } = useApp();

  if (!activeProduct || !activeProduct.config) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500 text-sm">Kein konfigurierbares Produkt gewählt.</p>
        <button
          onClick={() => setCustomerView('discover')}
          className="mt-4 px-4 py-2 bg-stone-900 text-white rounded text-xs"
        >
          Zur Übersicht
        </button>
      </div>
    );
  }

  const config = activeProduct.config;
  const components = config.components;
  const customFields = config.customFields || [];
  const labelConfig = config.labelConfig;

  const hasRecipeStep = components.length > 0;

  // Initialize ratios evenly distributed to sum to 100% (or target total)
  const [ratios, setRatios] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const count = components.length;
    if (count === 0) return initial;
    let remaining = config.targetTotal || 100;
    components.forEach((c, idx) => {
      if (idx === count - 1) {
        initial[c.id] = remaining;
      } else {
        const val = Math.floor((config.targetTotal || 100) / count);
        initial[c.id] = val;
        remaining -= val;
      }
    });
    return initial;
  });

  // Dynamic Custom Field Values
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    customFields.forEach(f => {
      initial[f.key] = f.defaultValue || (f.choices && f.choices[0]?.value) || '';
    });
    return initial;
  });

  // Custom Label State (bounded by manufacturer labelConfig)
  const [labelData, setLabelData] = useState<CustomLabelData>({
    headline: labelConfig.headlinePlaceholder || 'Mein persönlicher Signature Blend',
    subtitle: 'Handgefertigt nach Auftrag',
    dedication: labelConfig.dedicationPlaceholder || '',
    fontStyle: labelConfig.availableFonts[0]?.id || 'swiss-sans',
    batchNumber: `MZ-${Math.floor(100 + Math.random() * 900)}`,
    roastOrBrewDate: new Date().toLocaleDateString('de-CH'),
  });

  const [activeTab, setActiveTab] = useState<'recipe' | 'fields' | 'label'>(
    hasRecipeStep ? 'recipe' : (customFields.length > 0 ? 'fields' : 'label')
  );

  // Multi-Slider 100% Lock Redistribution Algorithm
  const handleRatioChange = (changedId: string, rawNewValue: number) => {
    const targetVal = Math.max(0, Math.min(config.targetTotal || 100, Math.round(rawNewValue)));
    const oldVal = ratios[changedId] || 0;
    const diff = targetVal - oldVal;

    if (diff === 0) return;

    if (config.sliderMode !== 'percentage_100') {
      setRatios({ ...ratios, [changedId]: targetVal });
      return;
    }

    const otherIds = components.filter(c => c.id !== changedId).map(c => c.id);
    const sumOthers = otherIds.reduce((sum, id) => sum + (ratios[id] || 0), 0);

    const newRatios: Record<string, number> = { ...ratios, [changedId]: targetVal };

    if (sumOthers === 0) {
      const remainder = (config.targetTotal || 100) - targetVal;
      const count = otherIds.length;
      let left = remainder;
      otherIds.forEach((id, idx) => {
        if (idx === count - 1) {
          newRatios[id] = Math.max(0, left);
        } else {
          const share = Math.floor(remainder / count);
          newRatios[id] = Math.max(0, share);
          left -= share;
        }
      });
    } else {
      let allocated = targetVal;
      otherIds.forEach((id, idx) => {
        if (idx === otherIds.length - 1) {
          newRatios[id] = Math.max(0, (config.targetTotal || 100) - allocated);
        } else {
          const currentShare = ratios[id] || 0;
          const ratioWeight = currentShare / sumOthers;
          const delta = Math.round(diff * ratioWeight);
          const updated = Math.max(0, currentShare - delta);
          newRatios[id] = updated;
          allocated += updated;
        }
      });
    }

    setRatios(newRatios);
  };

  // Recipe calculation (grams & percentage)
  const totalWeightGrams = config.totalWeightGrams || 500;
  const calculatedRecipe: RecipeItem[] = useMemo(() => {
    return components
      .filter(c => (ratios[c.id] || 0) > 0)
      .map(c => {
        const ratio = ratios[c.id] || 0;
        const grams = Math.round((ratio / (config.targetTotal || 100)) * totalWeightGrams);
        return {
          componentId: c.id,
          componentName: c.name,
          origin: c.origin || '',
          ratio: ratio,
          grams: grams,
          unit: c.unitText || config.targetUnit,
        };
      });
  }, [components, ratios, totalWeightGrams, config.targetTotal, config.targetUnit]);

  // Dynamic Price calculation
  const calculatedPrice = useMemo(() => {
    let price = activeProduct.basePrice;

    // Component weight multipliers
    let componentFactor = 0;
    components.forEach(c => {
      const share = (ratios[c.id] || 0) / (config.targetTotal || 100);
      componentFactor += share * (c.priceMultiplier || 1.0);
    });

    price = price * (componentFactor > 0 ? componentFactor : 1.0);

    // Custom field price deltas
    customFields.forEach(f => {
      const val = fieldValues[f.key];
      if (f.choices) {
        const matchedChoice = f.choices.find(c => c.value === val);
        if (matchedChoice && matchedChoice.priceDelta) {
          price += matchedChoice.priceDelta;
        }
      }
    });

    return Number(price.toFixed(2));
  }, [activeProduct.basePrice, components, ratios, config.targetTotal, customFields, fieldValues]);

  // Aggregate declaration-relevant allergens from fixed product allergens,
  // the currently selected recipe components, and chosen custom field choices.
  const activeAllergens = useMemo(() => {
    const set = new Set<string>();
    (activeProduct.allergens || []).forEach(a => set.add(a));
    components.forEach(c => {
      if ((ratios[c.id] || 0) > 0) (c.allergens || []).forEach(a => set.add(a));
    });
    customFields.forEach(f => {
      const val = fieldValues[f.key];
      const matched = f.choices?.find(c => c.value === val);
      (matched?.allergens || []).forEach(a => set.add(a));
    });
    return Array.from(set) as (keyof typeof ALLERGEN_LABELS)[];
  }, [activeProduct.allergens, components, ratios, customFields, fieldValues]);

  // Generate real-time SVG for preview
  const renderedSvg = useMemo(() => {
    return generateLabelSvg({
      category: activeProduct.category,
      producerName: currentProducer.name,
      customLabel: labelData,
      recipe: calculatedRecipe,
      selections: fieldValues,
      productTitle: activeProduct.title,
      weightText: activeProduct.unitText,
      allergens: activeAllergens,
      traceabilityUrl: `ATELIER Charge ${labelData.batchNumber} · ${currentProducer.name} · ${labelData.roastOrBrewDate}`,
    });
  }, [activeProduct, currentProducer.name, labelData, calculatedRecipe, fieldValues, activeAllergens]);

  const handleAddToCart = () => {
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.85 },
        colors: ['#111111', '#9C4A2F', '#EAEAEA'],
      });
    } catch (e) {}

    addToCart({
      id: `mto-${Date.now()}`,
      product: activeProduct,
      producer: currentProducer,
      quantity: 1,
      unitPrice: calculatedPrice,
      recipe: calculatedRecipe,
      customFieldValues: fieldValues,
      customLabel: labelData,
      renderedLabelSvg: renderedSvg,
      leadTimeInfo: currentProducer.leadTimeSchedule,
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <button
          onClick={() => setCustomerView('producer')}
          className="inline-flex items-center gap-2 text-xs font-mono text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          ZURÜCK ZUM ATELIER
        </button>

        <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 bg-stone-900 text-white rounded">
          ✦ Made-to-Order Canvas
        </span>
      </div>

      {/* Main Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header Summary */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-swiss space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-stone-500 uppercase tracking-widest block">
                  {currentProducer.name} · {currentProducer.city}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
                  {activeProduct.title}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500 block font-mono">Endpreis inkl. MwSt.</span>
                <span className="text-2xl font-bold text-stone-900 font-mono">
                  {currentProducer.currency} {calculatedPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 pt-1">
              {activeProduct.description}
            </p>
          </div>

          {/* Stepper Tabs */}
          <div className="flex border-b border-stone-200 text-xs font-mono">
            {hasRecipeStep && (
              <button
                onClick={() => setActiveTab('recipe')}
                className={`flex-1 py-3 font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'recipe'
                    ? 'border-stone-900 text-stone-900 bg-stone-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-atelier-terracotta" />
                <span>1. REZEPTUR ({config.targetTotal}{config.targetUnit})</span>
              </button>
            )}

            {customFields.length > 0 && (
              <button
                onClick={() => setActiveTab('fields')}
                className={`flex-1 py-3 font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'fields'
                    ? 'border-stone-900 text-stone-900 bg-stone-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-atelier-terracotta" />
                <span>2. ZUSATZOPTIONEN</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('label')}
              className={`flex-1 py-3 font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeTab === 'label'
                  ? 'border-stone-900 text-stone-900 bg-stone-50/50'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-atelier-terracotta" />
              <span>3. LIVE ETIKETT</span>
            </button>
          </div>

          {/* TAB 1: Dynamic Sliders */}
          {activeTab === 'recipe' && (
            <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-5 shadow-swiss">
              <div>
                <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider font-mono">
                  {config.sliderTitle}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {config.sliderDescription || `Passen Sie die Schieber an. Zielwert: ${config.targetTotal}${config.targetUnit}`}
                </p>
              </div>

              {/* Visual Multi-Color Stack Bar */}
              <div className="space-y-1.5">
                <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-stone-100 border border-stone-300">
                  {components.map(comp => {
                    const ratio = ratios[comp.id] || 0;
                    if (ratio === 0) return null;
                    return (
                      <div
                        key={comp.id}
                        style={{ width: `${(ratio / (config.targetTotal || 100)) * 100}%`, backgroundColor: comp.color }}
                        className="h-full transition-all duration-200"
                        title={`${comp.name}: ${ratio}${config.targetUnit}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-stone-500">
                  <span>Gesamt: {config.targetTotal}{config.targetUnit}</span>
                  <span>{totalWeightGrams} Gramm Frischmenge</span>
                </div>
              </div>

              {/* Sliders List */}
              <div className="space-y-4 pt-2">
                {components.map(comp => {
                  const ratio = ratios[comp.id] || 0;
                  const grams = Math.round((ratio / (config.targetTotal || 100)) * totalWeightGrams);
                  const isOutOfStock = !comp.inStock || (comp.stockQuantity !== undefined && comp.stockQuantity <= 0);

                  return (
                    <div
                      key={comp.id}
                      className={`p-4 rounded-lg border transition-all ${
                        isOutOfStock ? 'bg-stone-50 border-stone-200 opacity-50' : ratio > 0 ? 'bg-stone-50/80 border-stone-300' : 'bg-white border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: comp.color }}
                            />
                            <h4 className="font-semibold text-stone-900 text-sm">{comp.name}</h4>
                            {isOutOfStock && (
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">Ausverkauft</span>
                            )}
                          </div>
                          {comp.origin && (
                            <p className="text-xs text-stone-500">{comp.origin} {comp.process ? `· ${comp.process}` : ''}</p>
                          )}
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-base font-bold text-stone-900">{ratio}{config.targetUnit}</span>
                          <span className="text-xs text-stone-500 block">({grams}g)</span>
                        </div>
                      </div>

                      {/* Flavor Notes */}
                      {comp.notes && comp.notes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {comp.notes.map(note => (
                            <span key={note} className="text-[10px] px-2 py-0.5 bg-white border border-stone-200 text-stone-600 rounded">
                              {note}
                            </span>
                          ))}
                        </div>
                      )}

                      <input
                        type="range"
                        min="0"
                        max={config.targetTotal || 100}
                        step="5"
                        value={isOutOfStock ? 0 : ratio}
                        disabled={isOutOfStock}
                        onChange={(e) => handleRatioChange(comp.id, parseInt(e.target.value, 10))}
                        className="w-full disabled:cursor-not-allowed"
                      />
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setActiveTab(customFields.length > 0 ? 'fields' : 'label')}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Weiter zum nächsten Schritt</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}

          {/* TAB 2: Dynamic Custom Fields */}
          {activeTab === 'fields' && (
            <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-5 shadow-swiss">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider font-mono">
                HERSTELLER-OPTIONEN & MAHLGRADE
              </h3>

              {customFields.map(field => (
                <div key={field.id} className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 uppercase font-mono block">
                    {field.title} {field.isRequired && <span className="text-atelier-terracotta">*</span>}
                  </label>

                  {/* Pills */}
                  {field.type === 'pills' && field.choices && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {field.choices.map(ch => {
                        const isSelected = fieldValues[field.key] === ch.value;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => setFieldValues({ ...fieldValues, [field.key]: ch.value })}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              isSelected
                                ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                                : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-xs sm:text-sm">{ch.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-atelier-terracotta" />}
                            </div>
                            {ch.description && (
                              <p className={`text-[11px] mt-1 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                                {ch.description}
                              </p>
                            )}
                            {ch.priceDelta > 0 && (
                              <span className={`text-[10px] font-mono block mt-1 ${isSelected ? 'text-stone-300' : 'text-stone-600'}`}>
                                +{currentProducer.currency} {ch.priceDelta.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Input */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      maxLength={field.maxCharacters || 40}
                      placeholder={field.placeholder || 'Ihre Eingabe...'}
                      value={fieldValues[field.key] || ''}
                      onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium"
                    />
                  )}
                </div>
              ))}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('recipe')}
                  className="py-2.5 px-4 border border-stone-200 hover:bg-stone-100 rounded-lg text-xs font-semibold"
                >
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('label')}
                  className="flex-1 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <span>Weiter zum Etikett</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Label Customization bounded by Manufacturer Rules */}
          {activeTab === 'label' && (
            <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-5 shadow-swiss">
              <div>
                <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider font-mono">
                  ETIKETTEN-GESTALTUNG NACH HERSTELLERVORGABEN
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Geben Sie Ihrer Charge einen Namen im Rahmen der Manufaktur-Gestaltung.
                </p>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <label className="font-bold text-stone-700 uppercase">Titel des Blends</label>
                  <span className="text-stone-400">
                    {labelData.headline.length}/{labelConfig.maxHeadlineLength}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={labelConfig.maxHeadlineLength}
                  value={labelData.headline}
                  onChange={(e) => setLabelData({ ...labelData, headline: e.target.value })}
                  placeholder={labelConfig.headlinePlaceholder}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-900 font-medium"
                />
              </div>

              {/* Dedication input if allowed by manufacturer */}
              {labelConfig.allowDedication && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <label className="font-bold text-stone-700 uppercase">Widmung / Notiz (Optional)</label>
                    <span className="text-stone-400">
                      {(labelData.dedication || '').length}/{labelConfig.maxDedicationLength}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={labelConfig.maxDedicationLength}
                    value={labelData.dedication || ''}
                    onChange={(e) => setLabelData({ ...labelData, dedication: e.target.value })}
                    placeholder={labelConfig.dedicationPlaceholder || 'z.B. Für besondere Anlässe'}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-900 italic font-serif"
                  />
                </div>
              )}

              {/* Font Style Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 uppercase font-mono block">
                  Schweizer Typografie-Stil
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {labelConfig.availableFonts.map(font => {
                    const isSelected = labelData.fontStyle === font.id;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setLabelData({ ...labelData, fontStyle: font.id })}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                            : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                        }`}
                      >
                        <span className={`block text-sm ${font.styleClass}`}>{font.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live Packaging Mockup & Sticky Order Bar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6 space-y-6">
            
            <div className="bg-stone-900 rounded-2xl p-6 text-white border border-stone-800 shadow-swiss-lg space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE VEKTOR-ETIKETT
                </span>
                <span>{activeProduct.unitText}</span>
              </div>

              {/* Mockup Canvas */}
              <div className="relative bg-[#1A1A1A] rounded-xl p-4 sm:p-6 border border-stone-700 shadow-inner flex items-center justify-center min-h-[300px] overflow-hidden">
                <div 
                  className="w-full max-w-[360px] bg-white rounded shadow-2xl p-1 border border-stone-400"
                  dangerouslySetInnerHTML={{ __html: renderedSvg }}
                />
              </div>

              {/* Recipe Breakdown Pill Summary */}
              <div className="bg-white/5 rounded-lg p-3 space-y-2 text-xs">
                <span className="font-mono text-stone-400 uppercase text-[10px] block">
                  Aktuelle Rezeptur & Einwaage
                </span>
                <div className="space-y-1">
                  {calculatedRecipe.map(r => (
                    <div key={r.componentId} className="flex justify-between font-mono text-stone-300 text-[11px]">
                      <span>{r.ratio}{config.targetUnit} {r.componentName}</span>
                      <span className="text-stone-400">{r.grams}g</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allergen Declaration (LMIV / LIV Pflichtangabe) */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-stone-300">
                  <span className="font-bold text-amber-400 block mb-0.5">Allergenkennzeichnung</span>
                  {activeAllergens.length > 0
                    ? activeAllergens.map(a => ALLERGEN_LABELS[a]).join(', ')
                    : 'Keine deklarationspflichtigen Allergene bei aktueller Auswahl'}
                </div>
              </div>

              {/* Lead Time Schedule */}
              <div className="text-[11px] text-stone-400 flex items-center gap-2 pt-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-atelier-terracotta shrink-0"></span>
                <span>{currentProducer.batchScheduleNotice}</span>
              </div>

              {/* Add to Cart CTA */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3.5 px-5 bg-white hover:bg-stone-100 text-stone-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <ShoppingBag className="w-4 h-4 text-atelier-terracotta" />
                <span>{activeProduct.transactionMode === 'quote_request' ? 'Für Anfrage vormerken' : 'In den Warenkorb'} — {currentProducer.currency} {calculatedPrice.toFixed(2)}</span>
              </button>

              {/* Save Recipe for reorder */}
              <button
                type="button"
                onClick={() => {
                  saveRecipe({
                    producerId: currentProducer.id,
                    producerName: currentProducer.name,
                    productId: activeProduct.id,
                    productTitle: activeProduct.title,
                    recipe: calculatedRecipe,
                    customFieldValues: fieldValues,
                    labelHeadline: labelData.headline,
                  });
                }}
                className="w-full py-2 px-4 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Diesen Blend merken (für Nachbestellung)</span>
              </button>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
