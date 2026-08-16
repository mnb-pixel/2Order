import React from 'react';
import { useApp } from '../../lib/store';
import { ShoppingBag, Smartphone, Laptop, FileText, Bookmark } from 'lucide-react';

export const Header: React.FC = () => {
  const { mode, setMode, cart, setIsCartOpen, customerView, setCustomerView, quotes, savedRecipes } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-[#F9F9F8]/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo with Swiss Typographic Mark */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (mode === 'customer') setCustomerView('discover');
            }}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-7 h-7 bg-stone-900 text-white rounded flex items-center justify-center font-serif text-base font-bold shadow-xs">
              ✦
            </div>
            <div>
              <span className="font-bold text-stone-900 tracking-tight text-sm uppercase block font-sans">
                ATELIER
              </span>
              <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block -mt-1">
                SWISS CRAFT · MTO
              </span>
            </div>
          </button>

          {/* Quick Breadcrumb if in subview */}
          {mode === 'customer' && customerView !== 'discover' && (
            <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-stone-400">
              <span>/</span>
              <span className="text-stone-700 capitalize">
                {customerView === 'producer' ? 'Atelier-Profil'
                  : customerView === 'customizer' ? 'Blend Canvas'
                  : customerView === 'requests' ? 'Anfragen & Rechnungen'
                  : customerView === 'recipes' ? 'Meine Blends'
                  : 'Auftragsstatus'}
              </span>
            </div>
          )}
        </div>

        {/* Global Mode Switcher Pill (Customer Experience vs Producer Portal) */}
        <div className="flex items-center gap-2">
          
          <div className="bg-stone-200/70 p-1 rounded-full flex items-center gap-1 border border-stone-300/80">
            <button
              onClick={() => setMode('customer')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                mode === 'customer'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-atelier-terracotta" />
              <span className="hidden sm:inline">Kunden-App</span>
            </button>

            <button
              onClick={() => setMode('producer')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                mode === 'producer'
                  ? 'bg-stone-900 text-white shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Produzenten-Portal</span>
            </button>
          </div>

          {/* Saved Recipes & Requests (in Customer Mode) */}
          {mode === 'customer' && (
            <>
              <button
                onClick={() => setCustomerView('recipes')}
                className="relative p-2.5 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors text-stone-900 hidden sm:inline-flex"
                title="Meine gemerkten Blends"
              >
                <Bookmark className="w-4 h-4" />
                {savedRecipes.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-[10px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {savedRecipes.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCustomerView('requests')}
                className="relative p-2.5 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors text-stone-900 hidden sm:inline-flex"
                title="Meine Anfragen & Rechnungen"
              >
                <FileText className="w-4 h-4" />
                {quotes.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-[10px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {quotes.length}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Cart Icon (in Customer Mode) */}
          {mode === 'customer' && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors text-stone-900"
              title="Warenkorb öffnen"
            >
              <ShoppingBag className="w-4 h-4" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-[10px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {cart.length}
                </span>
              )}
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
