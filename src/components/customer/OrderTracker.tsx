import React from 'react';
import { useApp } from '../../lib/store';
import { CheckCircle2, Clock, Package, Truck, ArrowLeft, Sliders, ShieldCheck } from 'lucide-react';
import { OrderStatus } from '../../lib/types';

const STATUS_STEPS: Array<{ id: OrderStatus; label: string; description: string; icon: any }> = [
  { id: 'paid', label: 'Bezahlt & Eingeplant', description: 'Rezeptur an Werkstatt übermittelt', icon: CheckCircle2 },
  { id: 'in_production', label: 'In Röstung / Produktion', description: 'Frisch nach Mass eingewogen & verarbeitet', icon: Clock },
  { id: 'labeling', label: 'Etikettierung & Endkontrolle', description: 'Vektor-Etikett gedruckt & appliziert', icon: Package },
  { id: 'shipped', label: 'Versendet / Bereit', description: 'Unterwegs zu Ihnen mit Frischegarantie', icon: Truck },
];

export const OrderTracker: React.FC = () => {
  const { activeOrder, orders, setCustomerView, setMode } = useApp();

  const currentOrder = activeOrder || orders[0];

  if (!currentOrder) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500 text-sm">Keine aktuelle Bestellung gefunden.</p>
        <button
          onClick={() => setCustomerView('discover')}
          className="mt-4 px-4 py-2 bg-stone-900 text-white rounded text-xs"
        >
          Zurück zum Katalog
        </button>
      </div>
    );
  }

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'paid': return 0;
      case 'in_production': return 1;
      case 'labeling': return 2;
      case 'ready_for_pickup':
      case 'shipped':
      case 'completed': return 3;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(currentOrder.status);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <button
          onClick={() => setCustomerView('discover')}
          className="inline-flex items-center gap-2 text-xs font-mono text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          ZURÜCK ZUR STARTSEITE
        </button>

        <span className="font-mono text-xs text-stone-500 font-bold">
          AUFTRAG #{currentOrder.orderNumber}
        </span>
      </div>

      {/* Success Badge */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 space-y-3 shadow-swiss">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>AUFTRAG ERFOLGREICH BESTÄTIGT</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Vielen Dank, {currentOrder.customer.name}!
        </h1>
        <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
          Ihre Made-to-Order Rezeptur wurde direkt an das Werkstatt-Dashboard von <strong>{currentOrder.producerName}</strong> übermittelt.
        </p>

        <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-stone-400 border-t border-stone-800">
          <div>Geplante Produktion: <span className="text-white">{currentOrder.scheduledBatchDate}</span></div>
          <div>Zahlung: <span className="text-white uppercase">{currentOrder.paymentMethod}</span> (Bezahlt)</div>
        </div>
      </div>

      {/* Production Stepper */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-6">
        <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-stone-700">
          ECHTZEIT-PRODUKTIONSSTATUS
        </h2>

        <div className="space-y-6">
          {STATUS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div key={step.id} className="flex gap-4 items-start">
                <div className="relative flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isDone
                        ? 'bg-stone-900 border-stone-900 text-white'
                        : isCurrent
                        ? 'bg-atelier-terracotta border-atelier-terracotta text-white ring-4 ring-atelier-terracotta/20 animate-pulse-subtle'
                        : 'bg-stone-100 border-stone-300 text-stone-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-10 mt-1 ${
                        idx < currentStepIdx ? 'bg-stone-900' : 'bg-stone-200'
                      }`}
                    />
                  )}
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${isCurrent ? 'text-stone-900' : isDone ? 'text-stone-700' : 'text-stone-400'}`}>
                      {step.label}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-atelier-terracottaLight text-atelier-terracotta rounded font-bold">
                        AKTUELL
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Demo Switcher for testing producer progress */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>Simulation für Testzwecke:</span>
          <button
            onClick={() => setMode('producer')}
            className="text-atelier-terracotta hover:underline font-bold"
          >
            Im Produzenten-KDS ansehen ➔
          </button>
        </div>
      </div>

      {/* Ordered Items & Vector Label Snapshot */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-4">
        <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-stone-700">
          IHRE KREATION & SPEZIFIKATION
        </h2>

        {currentOrder.items.map((item) => (
          <div key={item.id} className="space-y-4 pt-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">{item.productTitle}</h4>
                {item.customLabel && (
                  <p className="text-xs font-serif italic text-atelier-terracotta mt-0.5">
                    "{item.customLabel.headline}"
                  </p>
                )}
              </div>
              <span className="font-mono font-bold text-sm text-stone-900">
                {currentOrder.currency} {item.totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Exact Grams & Recipe Table */}
            {item.recipe && item.recipe.length > 0 && (
              <div className="bg-stone-50 rounded-xl p-4 space-y-2 border border-stone-200">
                <span className="text-[10px] font-mono uppercase font-bold text-stone-500 block">
                  Rezeptur-Zusammensetzung ({item.weightGrams}g Basis)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {item.recipe.map(r => (
                    <div key={r.componentId} className="flex justify-between p-2 bg-white rounded border border-stone-200">
                      <span className="text-stone-800">{r.componentName}</span>
                      <span className="font-bold text-stone-900">{r.ratio}% ({r.grams}g)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Label Preview Snapshot */}
            {item.renderedLabelSvg && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono uppercase font-bold text-stone-500 block">
                  Druckfreigabe Ihres Vektor-Etiketts
                </span>
                <div
                  className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-1 border border-stone-300"
                  dangerouslySetInnerHTML={{ __html: item.renderedLabelSvg }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className="text-center pt-2">
        <button
          onClick={() => setCustomerView('discover')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Weiteres Handwerksprodukt kreieren</span>
        </button>
      </div>

    </div>
  );
};
