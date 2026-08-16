import React from 'react';
import { useApp } from '../../lib/store';
import { ArrowLeft, MapPin, Clock, ShieldCheck, Sliders, ShoppingBag, Package } from 'lucide-react';
import { Product } from '../../lib/types';

export const ProducerProfile: React.FC = () => {
  const { currentProducer, products, setCustomerView, setActiveProduct, addToCart } = useApp();

  const producerProducts = products.filter(p => p.producerId === currentProducer.id);
  const customizableProducts = producerProducts.filter(p => p.isCustomizable);
  const standardProducts = producerProducts.filter(p => !p.isCustomizable);

  const handleStartCustomizing = (product: Product) => {
    setActiveProduct(product);
    setCustomerView('customizer');
  };

  const handleAddStandardToCart = (product: Product) => {
    addToCart({
      id: `cart-${Date.now()}`,
      product: product,
      producer: currentProducer,
      quantity: 1,
      unitPrice: product.basePrice,
      leadTimeInfo: currentProducer.leadTimeSchedule,
    });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Back Button */}
      <button
        onClick={() => setCustomerView('discover')}
        className="inline-flex items-center gap-2 text-xs font-mono text-stone-600 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        ZURÜCK ZUR ENTDECKEN-ÜBERSICHT
      </button>

      {/* Producer Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-stone-900 text-white border border-stone-800">
        <div className="absolute inset-0 opacity-30">
          <img
            src={currentProducer.heroImage}
            alt={currentProducer.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative p-6 sm:p-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-300">
            <span className="px-2.5 py-1 bg-white/10 backdrop-blur rounded border border-white/20 uppercase tracking-widest text-[10px]">
              {currentProducer.category.toUpperCase()} · EST. {currentProducer.establishedYear}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-atelier-terracotta" />
              {currentProducer.city}, {currentProducer.country}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            {currentProducer.name}
          </h1>

          <p className="text-sm font-serif italic text-stone-300">
            "{currentProducer.tagline}"
          </p>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {currentProducer.bio}
          </p>

          {/* Schedule / Production Badge */}
          <div className="pt-2 flex flex-wrap gap-4 border-t border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-stone-300">
              <Clock className="w-4 h-4 text-atelier-terracotta" />
              <span><strong>Vorlauf:</strong> {currentProducer.leadTimeSchedule}</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>MwSt. {currentProducer.vatNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BEREICH 1: MADE-TO-ORDER & MASSANFERTIGUNG */}
      {customizableProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-atelier-terracotta"></span>
              <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-stone-900">
                1. MADE-TO-ORDER & SONDERANFERTIGUNG ({customizableProducts.length})
              </h2>
            </div>
            <span className="text-xs text-stone-500 font-mono">Schieberegler & Live-Etikett</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {customizableProducts.map(product => (
              <div
                key={product.id}
                className="bg-white border-2 border-stone-900 rounded-xl p-5 shadow-swiss space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-stone-900 text-white px-2 py-0.5 rounded">
                      ✦ Bespoke Canvas
                    </span>
                    <span className="font-mono font-bold text-sm text-stone-900">
                      ab {currentProducer.currency} {product.basePrice.toFixed(2)}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-stone-900">{product.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{product.description}</p>

                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {product.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-stone-100 rounded text-stone-600 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleStartCustomizing(product)}
                  className="w-full mt-4 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
                >
                  <Sliders className="w-4 h-4 text-atelier-terracotta" />
                  <span>Jetzt Rezeptur & Etikett kreieren</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BEREICH 2: STANDARDSORTIMENT DER MANUFAKTUR */}
      {standardProducts.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-stone-700">
                2. STANDARDSORTIMENT ({standardProducts.length})
              </h2>
            </div>
            <span className="text-xs text-stone-500 font-mono">Sofort versandfertig</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {standardProducts.map(product => (
              <div
                key={product.id}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden p-4 space-y-3 flex flex-col justify-between hover:border-stone-400 transition-colors shadow-swiss"
              >
                <div>
                  <div className="h-36 rounded-lg overflow-hidden bg-stone-100 mb-3">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-semibold text-stone-900 text-sm">{product.title}</h4>
                  <p className="text-xs text-stone-500 line-clamp-2 mt-1">{product.description}</p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-400 font-mono block">{product.unitText}</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {currentProducer.currency} {product.basePrice.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddStandardToCart(product)}
                    className="p-2 bg-stone-100 hover:bg-stone-900 hover:text-white rounded-lg transition-colors text-stone-900"
                    title="In den Warenkorb"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
