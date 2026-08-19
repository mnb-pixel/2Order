import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { ProductionQueueKDS } from './ProductionQueueKDS';
import { ProductManager } from './ProductManager';
import { LabelTemplateEditor } from './LabelTemplateEditor';
import { MerchantSettings } from './MerchantSettings';
import { QuoteManager } from './QuoteManager';
import { Sliders, Kanban, LayoutTemplate, Settings, TrendingUp, Package, Clock, Plus, FileText, Lock, ShieldAlert } from 'lucide-react';

type ProducerTab = 'kds' | 'products' | 'templates' | 'settings' | 'quotes';

// Blocks the dashboard behind the Gewerbe's portal PIN before any order/customer
// data renders. This is a lightweight client-side deterrent, not real
// authentication — see the caveat on Producer.portalPin.
const PortalLockScreen: React.FC<{ producerName: string; producerId: string }> = ({ producerName, producerId }) => {
  const { unlockPortal, myProducers, setSelectedProducerId } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPortal(producerId, pin)) {
      setError('Falscher Zugriffscode.');
      setPin('');
    }
  };

  return (
    <div className="max-w-sm mx-auto py-20 text-center space-y-5">
      <div className="w-12 h-12 mx-auto rounded-full bg-stone-900 text-white flex items-center justify-center">
        <Lock className="w-5 h-5" />
      </div>
      <div>
        <h1 className="font-bold text-stone-900 text-lg">{producerName}</h1>
        <p className="text-xs text-stone-500 mt-1">Bitte Zugriffscode für dieses Gewerbe eingeben.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
          className="w-40 mx-auto block text-center px-3 py-2.5 border border-stone-300 rounded-lg text-sm font-mono font-bold tracking-[0.3em]"
          placeholder="••••"
        />
        {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
        <button
          type="submit"
          className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          Entsperren
        </button>
      </form>
      {myProducers.length > 1 && (
        <div className="pt-4 border-t border-stone-200 flex flex-wrap justify-center gap-2">
          {myProducers.filter(p => p.id !== producerId).map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProducerId(p.id)}
              className="text-[11px] font-mono text-stone-500 hover:text-stone-900 underline"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <p className="text-[10px] text-stone-400 flex items-center justify-center gap-1 pt-2">
        <ShieldAlert className="w-3 h-3" />
        Hinweis: einfacher Zugriffsschutz, kein vollständiges Login-System.
      </p>
    </div>
  );
};

export const ProducerDashboard: React.FC = () => {
  const { myProducers, currentProducer, setSelectedProducerId, orders, products, quotes, setIsOnboardingOpen, getBatchCapacityInfo, isPortalUnlocked } = useApp();
  const [activeTab, setActiveTab] = useState<ProducerTab>('products');

  if (!isPortalUnlocked(currentProducer.id)) {
    return <PortalLockScreen producerName={currentProducer.name} producerId={currentProducer.id} />;
  }

  const producerOrders = orders.filter(o => o.producerId === currentProducer.id);
  const openOrders = producerOrders.filter(o => o.status !== 'shipped' && o.status !== 'completed');
  const inProductionCount = producerOrders.filter(o => o.status === 'in_production' || o.status === 'labeling').length;
  const totalRevenue = producerOrders.reduce((sum, o) => sum + o.total, 0);
  const customizableCount = products.filter(p => p.producerId === currentProducer.id && p.isCustomizable).length;
  const standardCount = products.filter(p => p.producerId === currentProducer.id && !p.isCustomizable).length;
  const openQuoteCount = quotes.filter(q => q.producerId === currentProducer.id && (q.status === 'requested' || q.status === 'quoted' || q.status === 'accepted')).length;
  const capacityInfo = getBatchCapacityInfo(currentProducer.id);

  // Estimated COGS/margin: recipe grams x component cost-per-gram, vs. realized revenue.
  const producerProducts = products.filter(p => p.producerId === currentProducer.id);
  let estimatedCost = 0;
  producerOrders.forEach(o => {
    o.items.forEach(item => {
      if (!item.recipe) return;
      const product = producerProducts.find(p => p.id === item.productId);
      if (!product?.config) return;
      item.recipe.forEach(r => {
        const comp = product.config!.components.find(c => c.id === r.componentId);
        estimatedCost += (comp?.costPerUnit || 0) * r.grams * item.quantity;
      });
    });
  });
  const estimatedMargin = totalRevenue > 0 ? ((totalRevenue - estimatedCost) / totalRevenue) * 100 : null;

  return (
    <div className="space-y-8 pb-20">
      
      {/* Producer Portal Header & Atelier Selector */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-swiss-lg space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>PRODUZENTEN-PORTAL · GESCHÜTZTER WORKSPACE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-white">
              {currentProducer.name}
            </h1>
            <p className="text-xs font-serif italic text-stone-300 mt-0.5">
              {currentProducer.city}, {currentProducer.country} · {currentProducer.category.toUpperCase()} · MwSt. {currentProducer.vatNumber}
            </p>
          </div>

          {/* Quick Switcher between Craft Businesses + Add New Business Wizard */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-stone-800/90 border border-stone-700 p-1 rounded-xl flex items-center gap-1 text-xs font-mono">
              <span className="text-stone-400 px-2 text-[10px] uppercase font-bold">Gewerbe:</span>
              {myProducers.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProducerId(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    p.id === currentProducer.id
                      ? 'bg-white text-stone-900 shadow-sm font-bold'
                      : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
                  }`}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="px-3 py-2 bg-atelier-terracotta hover:bg-atelier-terracotta/90 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Neues Gewerbe anlegen</span>
            </button>
          </div>
        </div>

        {/* Live Workshop KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pt-2 border-t border-stone-800 text-xs font-mono">
          <div className="bg-stone-800/60 p-3.5 rounded-xl border border-stone-700/60">
            <div className="flex justify-between items-center text-stone-400 text-[10px]">
              <span>OFFENE AUFTRÄGE</span>
              <Package className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-xl font-bold text-white mt-1 block">{openOrders.length}</span>
            <span className="text-[10px] text-stone-400">in KDS-Queue</span>
          </div>

          <div className="bg-stone-800/60 p-3.5 rounded-xl border border-stone-700/60">
            <div className="flex justify-between items-center text-stone-400 text-[10px]">
              <span>IN RÖSTUNG/PRODUKTION</span>
              <Clock className="w-3.5 h-3.5 text-atelier-terracotta" />
            </div>
            <span className="text-xl font-bold text-white mt-1 block">{inProductionCount}</span>
            <span className="text-[10px] text-stone-400">aktuelle Einwaage</span>
          </div>

          <div className="bg-stone-800/60 p-3.5 rounded-xl border border-stone-700/60">
            <div className="flex justify-between items-center text-stone-400 text-[10px]">
              <span>CUSTOM MTO MODELLE</span>
              <Sliders className="w-3.5 h-3.5 text-atelier-terracotta" />
            </div>
            <span className="text-xl font-bold text-white mt-1 block">{customizableCount}</span>
            <span className="text-[10px] text-stone-400">mit Schieber-Canvas</span>
          </div>

          <div className="bg-stone-800/60 p-3.5 rounded-xl border border-stone-700/60">
            <div className="flex justify-between items-center text-stone-400 text-[10px]">
              <span>STANDARDSORTIMENT</span>
              <Package className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold text-white mt-1 block">{standardCount}</span>
            <span className="text-[10px] text-stone-400">feste Artikel</span>
          </div>

          <div className="bg-stone-800/60 p-3.5 rounded-xl border border-stone-700/60">
            <div className="flex justify-between items-center text-stone-400 text-[10px]">
              <span>Ø MARGE (GESCHÄTZT)</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold text-white mt-1 block">{estimatedMargin !== null ? `${estimatedMargin.toFixed(0)}%` : '–'}</span>
            <span className="text-[10px] text-stone-400">Umsatz ./. Rohstoffkosten</span>
          </div>

          <div className="bg-stone-800/60 p-3.5 rounded-xl border border-stone-700/60">
            <div className="flex justify-between items-center text-stone-400 text-[10px]">
              <span>OFFENE ANFRAGEN</span>
              <FileText className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-xl font-bold text-white mt-1 block">{openQuoteCount}</span>
            <span className="text-[10px] text-stone-400">
              {capacityInfo.capacity !== null ? `Charge ${capacityInfo.booked}/${capacityInfo.capacity}${capacityInfo.isFull ? ' · VOLL' : ''}` : 'Offerte & Rechnung'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 text-xs font-mono">
        <button
          onClick={() => setActiveTab('products')}
          className={`py-3.5 px-5 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'products'
              ? 'border-stone-900 text-stone-900 bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-atelier-terracotta" />
          <span>PRODUKTE & DYNAMISCHE SCHIEBER</span>
        </button>

        <button
          onClick={() => setActiveTab('kds')}
          className={`py-3.5 px-5 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'kds'
              ? 'border-stone-900 text-stone-900 bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Kanban className="w-4 h-4 text-atelier-terracotta" />
          <span>PRODUKTIONS-QUEUE (KDS)</span>
        </button>

        <button
          onClick={() => setActiveTab('quotes')}
          className={`py-3.5 px-5 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'quotes'
              ? 'border-stone-900 text-stone-900 bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <FileText className="w-4 h-4 text-atelier-terracotta" />
          <span>ANFRAGEN & RECHNUNGEN{openQuoteCount > 0 ? ` (${openQuoteCount})` : ''}</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3.5 px-5 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-stone-900 text-stone-900 bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <LayoutTemplate className="w-4 h-4 text-atelier-terracotta" />
          <span>SVG ETIKETTEN-STUDIO</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3.5 px-5 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-stone-900 text-stone-900 bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Settings className="w-4 h-4 text-atelier-terracotta" />
          <span>STRIPE & EINSTELLUNGEN</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'products' && <ProductManager />}
      {activeTab === 'kds' && <ProductionQueueKDS />}
      {activeTab === 'quotes' && <QuoteManager />}
      {activeTab === 'templates' && <LabelTemplateEditor />}
      {activeTab === 'settings' && <MerchantSettings key={currentProducer.id} />}

    </div>
  );
};
