import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { ProductionQueueKDS } from './ProductionQueueKDS';
import { ProductManager } from './ProductManager';
import { LabelTemplateEditor } from './LabelTemplateEditor';
import { MerchantSettings } from './MerchantSettings';
import { Sliders, Kanban, LayoutTemplate, Settings, TrendingUp, Package, Clock, Building2, Plus, ShieldCheck } from 'lucide-react';

type ProducerTab = 'kds' | 'products' | 'templates' | 'settings';

export const ProducerDashboard: React.FC = () => {
  const { producers, currentProducer, setSelectedProducerId, orders, products, setIsOnboardingOpen } = useApp();
  const [activeTab, setActiveTab] = useState<ProducerTab>('products');

  const producerOrders = orders.filter(o => o.producerId === currentProducer.id);
  const openOrders = producerOrders.filter(o => o.status !== 'shipped' && o.status !== 'completed');
  const inProductionCount = producerOrders.filter(o => o.status === 'in_production' || o.status === 'labeling').length;
  const totalRevenue = producerOrders.reduce((sum, o) => sum + o.total, 0);
  const customizableCount = products.filter(p => p.producerId === currentProducer.id && p.isCustomizable).length;
  const standardCount = products.filter(p => p.producerId === currentProducer.id && !p.isCustomizable).length;

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
              {producers.map(p => (
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-stone-800 text-xs font-mono">
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
      {activeTab === 'templates' && <LabelTemplateEditor />}
      {activeTab === 'settings' && <MerchantSettings />}

    </div>
  );
};
