import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { CraftCategory, Producer, Product } from '../../lib/types';
import { Sparkles, ArrowRight, Sliders, MapPin, Clock, ShieldCheck, Flame, Wine, Coffee } from 'lucide-react';

const CATEGORY_TABS: Array<{ id: CraftCategory | 'all'; label: string; icon: any }> = [
  { id: 'all', label: 'Alle Ateliers', icon: Sparkles },
  { id: 'coffee', label: 'Röstereien', icon: Coffee },
  { id: 'beer', label: 'Brauereien', icon: Wine },
  { id: 'chocolate', label: 'Chocolatiers', icon: Flame },
];

export const DiscoverFeed: React.FC = () => {
  const { producers, products, setSelectedProducerId, setActiveProduct, setCustomerView } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<CraftCategory | 'all'>('all');

  const filteredProducers = selectedCategory === 'all' 
    ? producers 
    : producers.filter(p => p.category === selectedCategory);

  const handleOpenProducer = (producer: Producer) => {
    setSelectedProducerId(producer.id);
    setCustomerView('producer');
  };

  const handleOpenCustomizer = (product: Product, producer: Producer) => {
    setSelectedProducerId(producer.id);
    setActiveProduct(product);
    setCustomerView('customizer');
  };

  // Find featured customizable products
  const featuredCustomProducts = products.filter(p => p.isCustomizable);

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section with Swiss Minimalist Typography */}
      <div className="border-b border-stone-200 pb-8 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full text-xs font-mono font-medium text-stone-700 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-atelier-terracotta animate-pulse"></span>
          DACH DIRECT-TO-CONSUMER & CRAFTING
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 leading-tight">
          Handwerk auf Bestellung.<br />
          <span className="font-serif italic font-normal text-stone-700">Massgeschneidert für Kenner.</span>
        </h1>
        <p className="mt-3 text-stone-600 text-sm sm:text-base max-w-xl leading-relaxed">
          Entdecken Sie urbane Schweizer Röster, Brauer & Manufakturen. Gestalten Sie Ihre eigene Rezeptur frisch on-demand mit persönlichem Etikett.
        </p>

        {/* Value Props Bar */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-stone-200/60 text-xs text-stone-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-atelier-terracotta shrink-0" />
            <span className="font-medium">100% Direktkauf</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-atelier-terracotta shrink-0" />
            <span className="font-medium">Made-to-Order</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-atelier-terracotta shrink-0" />
            <span className="font-medium">Frische Batches</span>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORY_TABS.map(tab => {
          const Icon = tab.icon;
          const isSelected = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Customizer Highlight Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest font-bold text-stone-500 font-mono">
            ★ JETZT INDIVIDUELL KREIEREN
          </h2>
          <span className="text-xs text-stone-500 font-medium">Interaktiver Canvas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredCustomProducts.map(product => {
            const producer = producers.find(p => p.id === product.producerId) || producers[0];
            return (
              <div
                key={product.id}
                className="group relative bg-white border border-stone-200/90 rounded-xl overflow-hidden hover:border-stone-400 transition-all duration-300 shadow-swiss hover:shadow-swiss-lg flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-stone-100">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-stone-900/90 backdrop-blur-md text-white text-[10px] font-mono uppercase px-2.5 py-1 rounded-sm tracking-wider">
                      ✦ Made-to-Order
                    </div>
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-stone-900 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                      ab {producer.currency} {product.basePrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                      {producer.name} · {producer.city}
                    </div>
                    <h3 className="font-semibold text-stone-900 text-base leading-snug group-hover:text-atelier-terracotta transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {product.subtitle}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => handleOpenCustomizer(product, producer)}
                    className="w-full mt-2 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Sliders className="w-3.5 h-3.5 text-atelier-terracotta" />
                    <span>Rezeptur & Etikett gestalten</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Producers Directory */}
      <div className="space-y-4 pt-6 border-t border-stone-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest font-bold text-stone-500 font-mono">
            PARTNER-MANUFAKTUREN IM DACH-RAUM
          </h2>
          <span className="text-xs text-stone-500">{filteredProducers.length} Manufakturen</span>
        </div>

        <div className="space-y-4">
          {filteredProducers.map(producer => {
            const producerProducts = products.filter(p => p.producerId === producer.id);
            return (
              <div
                key={producer.id}
                onClick={() => handleOpenProducer(producer)}
                className="group cursor-pointer bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-400 hover:shadow-swiss transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
                  <div className="flex gap-4 items-start">
                    <img
                      src={producer.heroImage}
                      alt={producer.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-stone-200 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-900 text-lg group-hover:text-atelier-terracotta transition-colors">
                          {producer.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-stone-100 rounded text-stone-700">
                          <MapPin className="w-2.5 h-2.5" />
                          {producer.city}, {producer.country}
                        </span>
                      </div>
                      <p className="text-xs font-serif italic text-stone-600">{producer.tagline}</p>
                      <p className="text-xs text-stone-500 line-clamp-2 max-w-xl">{producer.bio}</p>
                      
                      <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-stone-500">
                        <span className="inline-flex items-center gap-1 font-mono text-atelier-terracotta">
                          <Clock className="w-3 h-3" />
                          {producer.leadTimeSchedule}
                        </span>
                        <span className="text-stone-300">·</span>
                        <span>{producerProducts.length} Produkte verfügbar</span>
                      </div>
                    </div>
                  </div>

                  <div className="self-end sm:self-center shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-900 group-hover:translate-x-1 transition-transform">
                      Atelier betreten <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
