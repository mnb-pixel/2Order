import React from 'react';
import { useApp } from '../../lib/store';
import { X, ShoppingBag, AlertTriangle } from 'lucide-react';
import { ALLERGEN_LABELS } from '../../lib/allergens';

export const ProductInfoModal: React.FC = () => {
  const { infoProduct, setInfoProduct, producers, addToCart } = useApp();

  if (!infoProduct) return null;

  const producer = producers.find(p => p.id === infoProduct.producerId);
  if (!producer) return null;

  const handleAddToCart = () => {
    addToCart({
      id: `cart-${Date.now()}`,
      product: infoProduct,
      producer,
      quantity: 1,
      unitPrice: infoProduct.basePrice,
      leadTimeInfo: producer.leadTimeSchedule,
    });
    setInfoProduct(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => setInfoProduct(null)}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56 bg-stone-100 shrink-0">
          <img src={infoProduct.images[0]} alt={infoProduct.title} className="w-full h-full object-cover" />
          <button
            onClick={() => setInfoProduct(null)}
            className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-sm text-stone-900 transition-colors"
            title="Schliessen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
              {producer.name} · {producer.city}
            </span>
            <h2 className="text-xl font-bold text-stone-900 mt-1">{infoProduct.title}</h2>
            {infoProduct.subtitle && (
              <p className="text-xs text-stone-500 mt-0.5">{infoProduct.subtitle}</p>
            )}
          </div>

          <p className="text-sm text-stone-700 leading-relaxed">{infoProduct.description}</p>

          {infoProduct.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {infoProduct.tags.map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 bg-stone-100 rounded text-stone-600 font-mono">
                  {t}
                </span>
              ))}
            </div>
          )}

          {infoProduct.allergens && infoProduct.allergens.length > 0 && (
            <div className="flex items-start gap-1.5 text-xs text-stone-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>Enthält: {infoProduct.allergens.map(a => ALLERGEN_LABELS[a]).join(', ')}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <div>
              <span className="text-xs text-stone-400 font-mono block">{infoProduct.unitText}</span>
              <span className="font-bold text-stone-900 text-lg">
                {producer.currency} {infoProduct.basePrice.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleAddToCart}
              className="py-2.5 px-5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors active:scale-[0.98]"
            >
              <ShoppingBag className="w-4 h-4 text-atelier-terracotta" />
              <span>In den Warenkorb</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
