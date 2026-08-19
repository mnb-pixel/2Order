import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Product, ShippingRestriction, TransactionMode } from '../../lib/types';
import { DynamicCanvasBuilder } from './DynamicCanvasBuilder';
import { CATEGORY_META } from '../../lib/categoryPresets';
import { ALL_ALLERGEN_CODES, ALLERGEN_LABELS } from '../../lib/allergens';
import { Plus, Trash2, Save, Sliders, Package, ImageUp } from 'lucide-react';

// Downscales an uploaded photo client-side (max 1000px edge, JPEG q0.85) before
// turning it into a data URL. There is no backend/object storage in this app —
// everything lives in localStorage — so keeping the encoded size sane matters.
function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
      img.onload = () => {
        const maxEdge = 1000;
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas nicht verfügbar.')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const ProductManager: React.FC = () => {
  const { products, currentProducer, saveProduct, deleteProduct } = useApp();

  // Mode: 'standards' vs 'custom_mto'
  const [productSection, setProductSection] = useState<'standards' | 'custom_mto'>('custom_mto');

  const producerProducts = products.filter(p => p.producerId === currentProducer.id);
  const standardProducts = producerProducts.filter(p => !p.isCustomizable);
  const customProducts = producerProducts.filter(p => p.isCustomizable);

  const activeProductList = productSection === 'standards' ? standardProducts : customProducts;

  const [selectedProductId, setSelectedProductId] = useState<string>(activeProductList[0]?.id || '');
  const editingProduct = producerProducts.find(p => p.id === selectedProductId) || activeProductList[0];

  const [formData, setFormData] = useState<Product | null>(editingProduct || null);
  const [imageUploadError, setImageUploadError] = useState<string>('');

  const handleImageUpload = async (file: File | undefined) => {
    if (!file || !formData) return;
    setImageUploadError('');
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setFormData({ ...formData, images: [dataUrl, ...formData.images.slice(1)] });
    } catch {
      setImageUploadError('Bild konnte nicht verarbeitet werden. Bitte JPG/PNG versuchen.');
    }
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setFormData(prod);
  };

  const handleCreateNewProduct = (isMto: boolean) => {
    const newId = `prod-${Date.now()}`;
    const meta = CATEGORY_META[currentProducer.category];
    const archetype = meta.archetype;
    const startsWithComponents = archetype !== 'bespoke';

    const newProd: Product = {
      id: newId,
      producerId: currentProducer.id,
      title: isMto ? 'Neues Made-to-Order Produkt' : 'Neues Standard-Produkt',
      subtitle: isMto ? 'Individuell konfigurierbar & personalisierbar' : 'Klassischer Artikel aus dem Sortiment',
      description: `Produktbeschreibung der ${meta.label}... (${meta.exampleComponents})`,
      category: currentProducer.category,
      basePrice: isMto ? 24.00 : 18.00,
      unitText: isMto ? '500g Beutel' : '250g Packung',
      weightGrams: 500,
      isCustomizable: isMto,
      stockQuantity: isMto ? undefined : 50,
      isActive: true,
      images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80'],
      tags: isMto ? ['Made to Order'] : ['Klassiker'],
      transactionMode: 'instant_checkout',
      shippingRestriction: meta.shippingRestriction,
      allergens: [],
      config: isMto ? {
        id: `cfg-${newId}`,
        productId: newId,
        archetype,
        sliderMode: archetype === 'build_a_box' ? 'free_quantity' : 'percentage_100',
        targetTotal: 100,
        targetUnit: archetype === 'build_a_box' ? 'Stk.' : '%',
        totalWeightGrams: 500,
        sliderTitle: archetype === 'bespoke' ? 'Keine Rezeptur — nur Zusatzfelder' : 'Rezeptur-Mischung',
        components: startsWithComponents ? [
          { id: 'c1', name: 'Komponente 1', origin: 'Origin 1', notes: ['Note 1'], maxRatio: 100, priceMultiplier: 1.0, color: '#A65335', inStock: true, unitText: archetype === 'build_a_box' ? 'Stk.' : '%' },
          { id: 'c2', name: 'Komponente 2', origin: 'Origin 2', notes: ['Note 2'], maxRatio: 100, priceMultiplier: 1.0, color: '#633A26', inStock: true, unitText: archetype === 'build_a_box' ? 'Stk.' : '%' },
        ] : [],
        customFields: [],
        labelConfig: {
          allowed: true,
          templateType: meta.labelTemplateType,
          headlinePlaceholder: 'z.B. Julians Signature Creation',
          maxHeadlineLength: 28,
          allowDedication: true,
          dedicationPlaceholder: 'z.B. Für besondere Anlässe',
          maxDedicationLength: 45,
          fixedBrandStamp: `+ SWISS CRAFT · ${currentProducer.name.toUpperCase()}`,
          availableFonts: [
            { id: 'swiss-sans', label: 'Swiss Neo-Grotesk', fontFamily: 'Inter, sans-serif', styleClass: 'font-sans' },
          ],
        },
      } : undefined,
    };

    saveProduct(newProd);
    setSelectedProductId(newId);
    setFormData(newProd);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    saveProduct(formData);
    alert('Produkt erfolgreich gespeichert!');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Main Section Switcher: Standard vs Custom MTO */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-swiss flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setProductSection('custom_mto');
              const firstCustom = customProducts[0];
              if (firstCustom) handleSelectProduct(firstCustom);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all ${
              productSection === 'custom_mto'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-atelier-terracotta" />
            <span>1. MADE-TO-ORDER PRODUKTE ({customProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProductSection('standards');
              const firstStandard = standardProducts[0];
              if (firstStandard) handleSelectProduct(firstStandard);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all ${
              productSection === 'standards'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. STANDARDSORTIMENT ({standardProducts.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleCreateNewProduct(productSection === 'custom_mto')}
          className="w-full sm:w-auto px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{productSection === 'custom_mto' ? 'Neues MTO Produkt anlegen' : 'Neuen Standardartikel anlegen'}</span>
        </button>

      </div>

      {/* Product Sub-Selector Pills */}
      {activeProductList.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="font-mono text-xs text-stone-500 uppercase font-bold shrink-0">Ausgewählt:</span>
          {activeProductList.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectProduct(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                p.id === formData?.id
                  ? 'bg-stone-800 text-white shadow-xs font-bold'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {/* Main Editor Form */}
      {formData && (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Card 1: Basic Information */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold">
                  {formData.isCustomizable ? '✦ Made-to-Order Konfigurierbar' : '📦 Fertiger Standard-Artikel'}
                </span>
                <h3 className="font-mono font-bold text-xs uppercase text-stone-800 tracking-wider mt-1">
                  GRUNDDATEN & PREIS
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Möchten Sie dieses Produkt wirklich löschen?')) {
                    deleteProduct(formData.id);
                  }
                }}
                className="text-stone-400 hover:text-red-600 text-xs font-mono flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Produkt löschen</span>
              </button>
            </div>

            {/* Product Photo */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 shrink-0">
                {formData.images[0] && (
                  <img src={formData.images[0]} alt={formData.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="space-y-1">
                <label className="font-mono font-bold text-stone-700 block">Produktfoto</label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                  <ImageUp className="w-3.5 h-3.5" />
                  <span>Foto hochladen</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                </label>
                {imageUploadError && <p className="text-[11px] text-red-600">{imageUploadError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="font-mono font-bold text-stone-700 block mb-1">Produkttitel</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-semibold text-xs"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-stone-700 block mb-1">
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
                <label className="font-mono font-bold text-stone-700 block mb-1">Untertitel / Kurzbeschreibung</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-stone-700 block mb-1">
                  {formData.isCustomizable ? 'Einheit & Grammatur' : 'Lagerbestand (Stk.)'}
                </label>
                {formData.isCustomizable ? (
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
                ) : (
                  <input
                    type="number"
                    value={formData.stockQuantity || 0}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono font-bold text-xs"
                  />
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="font-mono font-bold text-stone-700 block mb-1">Ausführliche Beschreibung</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-stone-700 block mb-1">Transaktionsmodus</label>
                <select
                  value={formData.transactionMode || 'instant_checkout'}
                  onChange={(e) => setFormData({ ...formData, transactionMode: e.target.value as TransactionMode })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white text-xs font-semibold"
                >
                  <option value="instant_checkout">Sofortkauf (Direktzahlung)</option>
                  <option value="quote_request">Nur auf Anfrage (Offerte → Rechnung)</option>
                </select>
              </div>

              <div>
                <label className="font-mono font-bold text-stone-700 block mb-1">Versandbeschränkung</label>
                <select
                  value={formData.shippingRestriction || 'standard'}
                  onChange={(e) => setFormData({ ...formData, shippingRestriction: e.target.value as ShippingRestriction })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white text-xs font-semibold"
                >
                  <option value="standard">Standardversand möglich</option>
                  <option value="cold_chain">Nur Kühlversand</option>
                  <option value="pickup_only">Nur Abholung vor Ort</option>
                </select>
              </div>

              <div>
                <label className="font-mono font-bold text-stone-700 block mb-1">Fixe Produkt-Allergene</label>
                <div className="flex flex-wrap gap-1 pt-1">
                  {ALL_ALLERGEN_CODES.map(code => {
                    const active = (formData.allergens || []).includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          const current = formData.allergens || [];
                          const next = active ? current.filter(a => a !== code) : [...current, code];
                          setFormData({ ...formData, allergens: next });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
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
          </div>

          {/* Card 2: Dynamic Canvas Builder (Only for Custom Made-to-Order Products) */}
          {formData.isCustomizable && (
            <div className="bg-white border-2 border-stone-900 rounded-2xl p-6 shadow-swiss space-y-4">
              <div className="border-b border-stone-200 pb-3">
                <h3 className="font-mono font-bold text-xs uppercase text-stone-900 tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-atelier-terracotta" />
                  <span>DYNAMISCHER HERSTELLER-CANVAS & ETIKETTEN-EDITOR</span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Hier definieren Sie die Schieberegler, Mahlgrade/Optionen und Etikettenvorgaben für Kunden.
                </p>
              </div>

              <DynamicCanvasBuilder
                product={formData}
                onUpdateConfig={(newConfig) => {
                  setFormData({ ...formData, config: newConfig });
                }}
              />
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Save className="w-4 h-4 text-atelier-terracotta" />
              <span>Änderungen dauerhaft speichern</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
