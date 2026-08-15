import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { BlendComponent, RecipeItem, CustomLabelData } from '../../lib/types';
import { generateLabelSvg } from '../../lib/labelRenderer';
import { ArrowLeft, Sparkles, Check, Info, ShoppingBag, Eye, SlidersHorizontal, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export const BlendCustomizer: React.FC = () => {
  const { activeProduct, currentProducer, setCustomerView, addToCart } = useApp();

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

  // Initialize ratios evenly distributed to sum to 100%
  const [ratios, setRatios] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const count = components.length;
    let remaining = 100;
    components.forEach((c, idx) => {
      if (idx === count - 1) {
        initial[c.id] = remaining;
      } else {
        const val = Math.floor(100 / count);
        initial[c.id] = val;
        remaining -= val;
      }
    });
    return initial;
  });

  // Selected Variant Options (e.g. Mahlgrad)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config.options.forEach(opt => {
      initial[opt.key] = opt.defaultValue;
    });
    return initial;
  });

  // Custom Label State
  const [labelData, setLabelData] = useState<CustomLabelData>({
    headline: 'Mein persönlicher Signature Blend',
    subtitle: '100% Arabica · Frisch geröstet',
    dedication: 'Exklusiv für mich kreiert',
    fontStyle: config.labelCustomization.fontStyles[0]?.id || 'swiss-sans',
    batchNumber: `MZ-${Math.floor(100 + Math.random() * 900)}`,
    roastOrBrewDate: new Date().toLocaleDateString('de-CH'),
  });

  const [activeTab, setActiveTab] = useState<'recipe' | 'options' | 'label'>('recipe');

  // Multi-Slider 100% Lock Redistribution Algorithm
  const handleRatioChange = (changedId: string, rawNewValue: number) => {
    const targetVal = Math.max(0, Math.min(100, Math.round(rawNewValue)));
    const oldVal = ratios[changedId] || 0;
    const diff = targetVal - oldVal;

    if (diff === 0) return;

    // Distribute diff proportionally among other components
    const otherIds = components.filter(c => c.id !== changedId).map(c => c.id);
    const sumOthers = otherIds.reduce((sum, id) => sum + (ratios[id] || 0), 0);

    const newRatios: Record<string, number> = { ...ratios, [changedId]: targetVal };

    if (sumOthers === 0) {
      // Evenly distribute the remainder among others
      const remainder = 100 - targetVal;
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
          newRatios[id] = Math.max(0, 100 - allocated);
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

  // Quick Preset Handlers (e.g. 50/50, 70/30, Single Origin focus)
  const applyPreset = (presetName: string) => {
    if (components.length >= 2) {
      if (presetName === '50/50') {
        const next: Record<string, number> = {};
        components.forEach((c, idx) => {
          next[c.id] = idx === 0 ? 50 : idx === 1 ? 50 : 0;
        });
        setRatios(next);
      } else if (presetName === 'balanced') {
        const share = Math.floor(100 / components.length);
        let rem = 100;
        const next: Record<string, number> = {};
        components.forEach((c, idx) => {
          if (idx === components.length - 1) next[c.id] = rem;
          else {
            next[c.id] = share;
            rem -= share;
          }
        });
        setRatios(next);
      } else if (presetName === 'fruit_forward') {
        const next: Record<string, number> = {};
        components.forEach((c, idx) => {
          next[c.id] = idx === 0 ? 70 : idx === 1 ? 30 : 0;
        });
        setRatios(next);
      }
    }
  };

  // Recipe calculation (grams & percentage)
  const totalWeightGrams = config.totalWeightGrams || 500;
  const calculatedRecipe: RecipeItem[] = useMemo(() => {
    return components
      .filter(c => (ratios[c.id] || 0) > 0)
      .map(c => {
        const ratio = ratios[c.id] || 0;
        const grams = Math.round((ratio / 100) * totalWeightGrams);
        return {
          componentId: c.id,
          componentName: c.name,
          origin: c.origin,
          ratio: ratio,
          grams: grams,
        };
      });
  }, [components, ratios, totalWeightGrams]);

  // Dynamic Price calculation
  const calculatedPrice = useMemo(() => {
    let price = activeProduct.basePrice;

    // Component weight multipliers
    let componentFactor = 0;
    components.forEach(c => {
      const share = (ratios[c.id] || 0) / 100;
      componentFactor += share * (c.priceMultiplier || 1.0);
    });

    price = price * (componentFactor > 0 ? componentFactor : 1.0);

    // Option price deltas
    config.options.forEach(opt => {
      const chosenValue = selectedOptions[opt.key];
      const match = opt.values.find(v => v.value === chosenValue);
      if (match && match.priceDelta) {
        price += match.priceDelta;
      }
    });

    return Number(price.toFixed(2));
  }, [activeProduct.basePrice, components, ratios, config.options, selectedOptions]);

  // Generate real-time SVG for preview
  const renderedSvg = useMemo(() => {
    return generateLabelSvg({
      category: activeProduct.category,
      producerName: currentProducer.name,
      customLabel: labelData,
      recipe: calculatedRecipe,
      selections: selectedOptions,
      productTitle: activeProduct.title,
      weightText: activeProduct.unitText,
    });
  }, [activeProduct, currentProducer.name, labelData, calculatedRecipe, selectedOptions]);

  const handleAddToCart = () => {
    // Confetti effect on custom creation
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.85 },
        colors: ['#111111', '#9C4A2F', '#EAEAEA'],
      });
    } catch (e) {
      // fallback if canvas-confetti is not loaded
    }

    addToCart({
      id: `mto-${Date.now()}`,
      product: activeProduct,
      producer: currentProducer,
      quantity: 1,
      unitPrice: calculatedPrice,
      recipe: calculatedRecipe,
      selections: selectedOptions,
      customLabel: labelData,
      renderedLabelSvg: renderedSvg,
      leadTimeInfo: currentProducer.leadTimeSchedule,
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Bar Navigation & Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <button
          onClick={() => setCustomerView('producer')}
          className="inline-flex items-center gap-2 text-xs font-mono text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          ZURÜCK ZUM ATELIER
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 bg-stone-900 text-white rounded">
            Live MTO Canvas
          </span>
        </div>
      </div>

      {/* Main Layout: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Product Headline & Dynamic Price Sticky Header */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-swiss space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-stone-500 uppercase tracking-widest block">
                  {currentProducer.name}
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

          {/* Stepper / Tab Switcher */}
          <div className="flex border-b border-stone-200 text-xs font-mono">
            <button
              onClick={() => setActiveTab('recipe')}
              className={`flex-1 py-3 font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeTab === 'recipe'
                  ? 'border-stone-900 text-stone-900 bg-stone-50/50'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              1. REZEPTUR (100%)
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`flex-1 py-3 font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeTab === 'options'
                  ? 'border-stone-900 text-stone-900 bg-stone-50/50'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              2. MAHLGRAD & OPTIONEN
            </button>
            <button
              onClick={() => setActiveTab('label')}
              className={`flex-1 py-3 font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeTab === 'label'
                  ? 'border-stone-900 text-stone-900 bg-stone-50/50'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              3. LIVE ETIKETT
            </button>
          </div>

          {/* TAB 1: Recipe & Blend Sliders */}
          {activeTab === 'recipe' && (
            <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-5 shadow-swiss">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider font-mono">
                    PROZENTUALE MISCHUNG (100% GESPERRT)
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Verschieben Sie die Regler. Die Gesamtrezeptur bleibt immer exakt bei 100%.
                  </p>
                </div>
                {/* Presets */}
                <div className="flex gap-1">
                  <button
                    onClick={() => applyPreset('balanced')}
                    className="text-[10px] font-mono px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
                  >
                    Gleichmässig
                  </button>
                  <button
                    onClick={() => applyPreset('50/50')}
                    className="text-[10px] font-mono px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
                  >
                    50 / 50
                  </button>
                </div>
              </div>

              {/* Visual Multi-Color Stack Bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-stone-100 border border-stone-300">
                  {components.map(comp => {
                    const ratio = ratios[comp.id] || 0;
                    if (ratio === 0) return null;
                    return (
                      <div
                        key={comp.id}
                        style={{ width: `${ratio}%`, backgroundColor: comp.color }}
                        className="h-full transition-all duration-200"
                        title={`${comp.name}: ${ratio}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-stone-500">
                  <span>Gesamt: 100%</span>
                  <span>{totalWeightGrams} Gramm Frischmenge</span>
                </div>
              </div>

              {/* Component Sliders List */}
              <div className="space-y-4 pt-2">
                {components.map(comp => {
                  const ratio = ratios[comp.id] || 0;
                  const grams = Math.round((ratio / 100) * totalWeightGrams);

                  return (
                    <div
                      key={comp.id}
                      className={`p-4 rounded-lg border transition-all ${
                        ratio > 0 ? 'bg-stone-50/70 border-stone-300' : 'bg-white border-stone-200 opacity-60'
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
                          </div>
                          <p className="text-xs text-stone-500">{comp.origin} · {comp.process}</p>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-base font-bold text-stone-900">{ratio}%</span>
                          <span className="text-xs text-stone-500 block">({grams}g)</span>
                        </div>
                      </div>

                      {/* Flavor Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {comp.notes.map(note => (
                          <span
                            key={note}
                            className="text-[10px] px-2 py-0.5 bg-white border border-stone-200 text-stone-600 rounded"
                          >
                            {note}
                          </span>
                        ))}
                      </div>

                      {/* Slider Control */}
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={ratio}
                          onChange={(e) => handleRatioChange(comp.id, parseInt(e.target.value, 10))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('options')}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Weiter zu Mahlgrad & Optionen</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Variants & Options */}
          {activeTab === 'options' && (
            <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-5 shadow-swiss">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider font-mono">
                HERSTELLUNGSOPTIONEN & ZUBEREITUNG
              </h3>

              {config.options.map(option => (
                <div key={option.key} className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 uppercase font-mono block">
                    {option.title}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {option.values.map(val => {
                      const isSelected = selectedOptions[option.key] === val.value;
                      return (
                        <button
                          key={val.value}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [option.key]: val.value }))}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                              : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-xs sm:text-sm">{val.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-atelier-terracotta" />}
                          </div>
                          {val.description && (
                            <p className={`text-[11px] mt-1 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                              {val.description}
                            </p>
                          )}
                          {val.priceDelta ? (
                            <span className={`text-[10px] font-mono block mt-1 ${isSelected ? 'text-stone-300' : 'text-stone-600'}`}>
                              +{currentProducer.currency} {val.priceDelta.toFixed(2)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setActiveTab('recipe')}
                  className="py-2.5 px-4 border border-stone-200 hover:bg-stone-100 rounded-lg text-xs font-semibold text-stone-700"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setActiveTab('label')}
                  className="flex-1 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Weiter zur Etiketten-Personalisierung</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Label Customization */}
          {activeTab === 'label' && (
            <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-5 shadow-swiss">
              <div>
                <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider font-mono">
                  INDIVIDUELLE VERPACKUNG & ETIKETT
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Geben Sie Ihrem Blend einen persönlichen Namen und wählen Sie die typografische Ästhetik.
                </p>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <label className="font-bold text-stone-700 uppercase">Titel des Blends</label>
                  <span className="text-stone-400">
                    {labelData.headline.length}/{config.labelCustomization.maxTitleLength}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={config.labelCustomization.maxTitleLength}
                  value={labelData.headline}
                  onChange={(e) => setLabelData(prev => ({ ...prev, headline: e.target.value }))}
                  placeholder="z.B. Julians Morning Roast"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-900 font-medium"
                />
              </div>

              {/* Dedication input */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <label className="font-bold text-stone-700 uppercase">Widmung / Notiz (Optional)</label>
                  <span className="text-stone-400">
                    {(labelData.dedication || '').length}/{config.labelCustomization.maxDedicationLength}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={config.labelCustomization.maxDedicationLength}
                  value={labelData.dedication || ''}
                  onChange={(e) => setLabelData(prev => ({ ...prev, dedication: e.target.value }))}
                  placeholder="z.B. Frisch geröstet für das Team Zürich"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-900 italic font-serif"
                />
              </div>

              {/* Font Style Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 uppercase font-mono block">
                  Schweizer Typografie-Stil
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {config.labelCustomization.fontStyles.map(font => {
                    const isSelected = labelData.fontStyle === font.id;
                    return (
                      <button
                        key={font.id}
                        onClick={() => setLabelData(prev => ({ ...prev, fontStyle: font.id }))}
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

        {/* Right Column: Live Packaging Mockup & Sticky Order Bar (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="sticky top-6 space-y-6">
            
            {/* Live Vector Packaging Preview */}
            <div className="bg-stone-900 rounded-2xl p-6 text-white border border-stone-800 shadow-swiss-lg space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE VEKTOR-VORSCHAU
                </span>
                <span>{activeProduct.unitText}</span>
              </div>

              {/* Realistic Packaging Mockup Canvas */}
              <div className="relative bg-[#1A1A1A] rounded-xl p-4 sm:p-6 border border-stone-700 shadow-inner flex items-center justify-center min-h-[300px] overflow-hidden">
                
                {/* SVG Rendered Label placed directly */}
                <div 
                  className="w-full max-w-[360px] bg-white rounded shadow-2xl p-1 border border-stone-400 transition-transform duration-300"
                  dangerouslySetInnerHTML={{ __html: renderedSvg }}
                />
              </div>

              {/* Recipe Breakdown Pill Summary */}
              <div className="bg-white/5 rounded-lg p-3 space-y-2 text-xs">
                <span className="font-mono text-stone-400 uppercase text-[10px] block">
                  Aktuelle Chargen-Metriken
                </span>
                <div className="space-y-1">
                  {calculatedRecipe.map(r => (
                    <div key={r.componentId} className="flex justify-between font-mono text-stone-300 text-[11px]">
                      <span>{r.ratio}% {r.componentName}</span>
                      <span className="text-stone-400">{r.grams}g</span>
                    </div>
                  ))}
                </div>
                {selectedOptions['grind'] && (
                  <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-stone-400">
                    <span>Mahlgrad:</span>
                    <span className="text-white font-medium capitalize">
                      {selectedOptions['grind'].replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Batch Lead Time Notice */}
              <div className="text-[11px] text-stone-400 flex items-center gap-2 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-atelier-terracotta shrink-0"></span>
                <span>{currentProducer.batchScheduleNotice}</span>
              </div>

              {/* Add to Cart CTA */}
              <button
                onClick={handleAddToCart}
                className="w-full py-3.5 px-5 bg-white hover:bg-stone-100 text-stone-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <ShoppingBag className="w-4 h-4 text-atelier-terracotta" />
                <span>In den Warenkorb — {currentProducer.currency} {calculatedPrice.toFixed(2)}</span>
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
