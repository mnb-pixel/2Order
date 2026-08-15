import React from 'react';
import { useApp } from '../../lib/store';
import { X, Trash2, ArrowRight, ShieldCheck, ShoppingBag, Clock } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const { isCartOpen, setIsCartOpen, cart, removeFromCart, cartTotal, currentProducer, setIsCheckoutOpen } = useApp();

  if (!isCartOpen) return null;

  const handleOpenCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FBFBF9] border-l border-stone-200 shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 border-b border-stone-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-stone-900" />
              <h2 className="font-bold text-stone-900 text-sm tracking-tight">
                WARENKORB ({cart.length})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 text-stone-400 hover:text-stone-900 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-stone-500 text-xs">Ihr Warenkorb ist noch leer.</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium"
                >
                  Manufakturen entdecken
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-stone-200 rounded-xl p-4 shadow-swiss space-y-3 relative"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-stone-500 block">
                        {item.producer.name}
                      </span>
                      <h4 className="font-bold text-stone-900 text-sm">{item.product.title}</h4>
                      {item.customLabel && (
                        <p className="text-xs font-serif italic text-atelier-terracotta mt-0.5">
                          "{item.customLabel.headline}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-stone-400 hover:text-red-600 transition-colors p-1"
                      title="Entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Custom Recipe Summary */}
                  {item.recipe && item.recipe.length > 0 && (
                    <div className="bg-stone-50 rounded-lg p-2.5 space-y-1 text-[11px] font-mono text-stone-600 border border-stone-150">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Mischung:</div>
                      {item.recipe.map(r => (
                        <div key={r.componentId} className="flex justify-between">
                          <span>{r.ratio}% {r.componentName}</span>
                          <span>{r.grams}g</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Batch Schedule */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-500 pt-1">
                    <Clock className="w-3 h-3 text-atelier-terracotta" />
                    <span>{item.leadTimeInfo}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-stone-100 font-mono">
                    <span className="text-xs text-stone-500">Menge: {item.quantity}</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {item.producer.currency} {(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-stone-200 bg-white space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Zwischensumme</span>
                  <span className="font-mono">{currentProducer.currency} {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Versand (Schweiz/DACH)</span>
                  <span className="font-mono text-emerald-700">Kostenfrei ab CHF 40</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 text-base pt-2 border-t border-stone-100">
                  <span>Gesamtbetrag (inkl. MwSt.)</span>
                  <span className="font-mono">{currentProducer.currency} {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleOpenCheckout}
                className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
              >
                <span>Zur Kasse gehen</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Direktabrechnung mit dem Erzeuger</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
