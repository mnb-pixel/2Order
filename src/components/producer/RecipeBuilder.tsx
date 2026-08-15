import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Product, BlendComponent, CustomizationOption } from '../../lib/types';
import { Plus, Trash2, Save, Sliders, Check, Sparkles } from 'lucide-react';

export const RecipeBuilder: React.FC = () => {
  const { products, currentProducer, saveProduct } = useApp();

  const producerProducts = products.filter(p => p.producerId === currentProducer.id);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    producerProducts.find(p => p.isCustomizable)?.id || producerProducts[0]?.id || ''
  );

  const activeEditingProduct = producerProducts.find(p => p.id === selectedProductId) || producerProducts[0];

  const [formData, setFormData] = useState<Product>(activeEditingProduct || {
    id: `prod-${Date.now()}`,
    producerId: currentProducer.id,
    title: 'Neuer Custom Blend (500g)',
    subtitle: 'Individuelle Röstung nach Kundenwunsch',
    description: 'Frisch chargiert nach individueller Kundenrezeptur.',
    category: currentProducer.category,
    basePrice: 24.00,
    unitText: '500g Beutel',
    weightGrams: 500,
    isCustomizable: true,
    isActive: true,
    images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80'],
    tags: ['Made to Order', 'Single Origin Blend'],
    config: {
      id: `cfg-${Date.now()}`,
      productId: `prod-${Date.now()}`,
      type: 'blend_or_mix',
      targetTotalPercent: 100,
      totalWeightGrams: 500,
      components: [
        { id: 'c-1', name: 'Äthiopien Sidamo', origin: 'Sidamo, 1900m', notes: ['Jasmin', 'Zitrus'], maxRatio: 100, priceMultiplier: 1.1, color: '#E0A96D', inStock: true },
        { id: 'c-2', name: 'Kolumbien Supremo', origin: 'Huila, 1750m', notes: ['Karamell', 'Nuss'], maxRatio: 100, priceMultiplier: 1.0, color: '#A65335', inStock: true },
      ],
      options: [
        {
          key: 'grind',
          title: 'Mahlgrad',
          type: 'pills',
          defaultValue: 'whole_bean',
          values: [
            { label: 'Ganze Bohne', value: 'whole_bean' },
            { label: 'Espresso', value: 'espresso' },
            { label: 'Filter', value: 'filter' },
          ],
        },
      ],
      labelCustomization: {
        allowed: true,
        maxTitleLength: 28,
        maxDedicationLength: 45,
        templateType: 'coffee_bag',
        fontStyles: [
          { id: 'swiss-sans', label: 'Swiss Neo-Grotesk', fontFamily: 'Inter, sans-serif', styleClass: 'font-sans uppercase' },
          { id: 'editorial-serif', label: 'Zurich Heritage Serif', fontFamily: 'Playfair Display, serif', styleClass: 'font-serif italic' },
        ],
      },
    },
  });

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setFormData(prod);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveProduct(formData);
    alert('Produkt & Made-to-Order Konfiguration erfolgreich gespeichert!');
  };

  // Component manipulation
  const handleAddComponent = () => {
    if (!formData.config) return;
    const newComp: BlendComponent = {
      id: `comp-${Date.now()}`,
      name: 'Neuer Rohstoff',
      origin: 'Ursprungsregion',
      notes: ['Aroma 1', 'Aroma 2'],
      maxRatio: 100,
      priceMultiplier: 1.0,
      color: '#8E8E84',
      inStock: true,
    };
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        components: [...formData.config.components, newComp],
      },
    });
  };

  const handleRemoveComponent = (id: string) => {
    if (!formData.config) return;
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        components: formData.config.components.filter(c => c.id !== id),
      },
    });
  };

  const handleUpdateComponent = (id: string, updates: Partial<BlendComponent>) => {
    if (!formData.config) return;
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        components: formData.config.components.map(c => c.id === id ? { ...c, ...updates } : c),
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Product Selector Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-swiss flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-stone-500 uppercase font-bold">Produkt wählen:</span>
          <div className="flex flex-wrap gap-2">
            {producerProducts.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  p.id === selectedProductId
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {p.isCustomizable && '✦ '} {p.title}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            const newProdId = `prod-${Date.now()}`;
            const newProd: Product = {
              id: newProdId,
              producerId: currentProducer.id,
              title: 'Neues Produkt',
              subtitle: 'Beschreibung der Sonderedition',
              description: 'Produktbeschreibung eingeben...',
              category: currentProducer.category,
              basePrice: 20.00,
              unitText: '500g',
              weightGrams: 500,
              isCustomizable: true,
              isActive: true,
              images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80'],
              tags: ['Neu'],
              config: {
                id: `cfg-${Date.now()}`,
                productId: newProdId,
                type: 'blend_or_mix',
                targetTotalPercent: 100,
                totalWeightGrams: 500,
                components: [
                  { id: 'c-1', name: 'Komponente 1', origin: 'Origin 1', notes: ['Fruchtig'], maxRatio: 100, priceMultiplier: 1.0, color: '#A65335', inStock: true },
                  { id: 'c-2', name: 'Komponente 2', origin: 'Origin 2', notes: ['Nussig'], maxRatio: 100, priceMultiplier: 1.0, color: '#633A26', inStock: true },
                ],
                options: [],
                labelCustomization: {
                  allowed: true,
                  maxTitleLength: 28,
                  maxDedicationLength: 45,
                  templateType: 'coffee_bag',
                  fontStyles: [
                    { id: 'swiss-sans', label: 'Swiss Neo-Grotesk', fontFamily: 'Inter, sans-serif', styleClass: 'font-sans' },
                  ],
                },
              },
            };
            setSelectedProductId(newProdId);
            setFormData(newProd);
          }}
          className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Neues Produkt anlegen</span>
        </button>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Step 1: Base Information */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="text-xs uppercase font-mono font-bold text-stone-800 tracking-wider">
              1. BASIS-DATEN & PREISGESTALTUNG
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isCustomizable}
                onChange={(e) => setFormData({ ...formData, isCustomizable: e.target.checked })}
                className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 w-4 h-4"
              />
              <span className="text-xs font-bold text-stone-900">Made-to-Order Konfigurator aktivieren</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="font-mono text-stone-600 block mb-1 font-bold">Produkttitel</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium text-xs"
              />
            </div>

            <div>
              <label className="font-mono text-stone-600 block mb-1 font-bold">
                Basispreis ({currentProducer.currency})
              </label>
              <input
                type="number"
                step="0.10"
                required
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono font-bold text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-mono text-stone-600 block mb-1 font-bold">Untertitel / Slogan</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-mono text-stone-600 block mb-1 font-bold">Einheit / Netto-Gewicht (Gramm)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.unitText}
                  onChange={(e) => setFormData({ ...formData, unitText: e.target.value })}
                  placeholder="500g Beutel"
                  className="w-1/2 px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
                <input
                  type="number"
                  value={formData.weightGrams}
                  onChange={(e) => setFormData({ ...formData, weightGrams: parseInt(e.target.value, 10) || 500 })}
                  placeholder="500"
                  className="w-1/2 px-3 py-2 border border-stone-300 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Made-to-Order Components & Stock Management */}
        {formData.isCustomizable && formData.config && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-xs uppercase font-mono font-bold text-stone-800 tracking-wider">
                  2. ROHSTOFFE & MISCHUNGS-KOMPONENTEN (100% REGELWERK)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Legen Sie die Bohnen, Malze oder Kakaosorten fest, die Kunden prozentual mischen dürfen.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddComponent}
                className="px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Rohstoff hinzufügen</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.config.components.map((comp, idx) => (
                <div
                  key={comp.id}
                  className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="font-mono text-stone-600 block mb-1 font-bold">Rohstoff-Name</label>
                      <input
                        type="text"
                        value={comp.name}
                        onChange={(e) => handleUpdateComponent(comp.id, { name: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-stone-600 block mb-1 font-bold">Herkunft & Anbau</label>
                      <input
                        type="text"
                        value={comp.origin}
                        onChange={(e) => handleUpdateComponent(comp.id, { origin: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-stone-600 block mb-1 font-bold">Preisfaktor (1.0 = Standard)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.05"
                          value={comp.priceMultiplier}
                          onChange={(e) => handleUpdateComponent(comp.id, { priceMultiplier: parseFloat(e.target.value) || 1.0 })}
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(comp.id)}
                          className="text-stone-400 hover:text-red-600 p-1"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Save className="w-4 h-4 text-atelier-terracotta" />
            <span>Produkt & Rezeptur speichern</span>
          </button>
        </div>

      </form>
    </div>
  );
};
