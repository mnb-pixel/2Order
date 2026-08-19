import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { CheckCircle2, Clock, Package, Truck, Home, ArrowLeft, Sliders, ShieldCheck, QrCode, AlertTriangle, Gift, Star } from 'lucide-react';
import { OrderStatus } from '../../lib/types';
import { generateTraceabilityQrSvg } from '../../lib/labelRenderer';
import { ALLERGEN_LABELS } from '../../lib/allergens';

type StatusStep = { id: OrderStatus; label: string; description: string; icon: any };

// Pickup and shipped orders diverge from "labeling" onward — a pickup order
// is never "unterwegs", so the copy branches on fulfillmentType instead of
// forcing shipping language onto every order.
function getStatusSteps(fulfillmentType: 'shipping' | 'pickup'): StatusStep[] {
  const base: StatusStep[] = [
    { id: 'paid', label: 'Bezahlt & Eingeplant', description: 'Rezeptur an Werkstatt übermittelt', icon: CheckCircle2 },
    { id: 'in_production', label: 'In Röstung / Produktion', description: 'Frisch nach Mass eingewogen & verarbeitet', icon: Clock },
    { id: 'labeling', label: 'Etikettierung & Endkontrolle', description: 'Vektor-Etikett gedruckt & appliziert', icon: Package },
  ];
  if (fulfillmentType === 'pickup') {
    return [
      ...base,
      { id: 'ready_for_pickup', label: 'Abholbereit', description: 'Frisch verpackt & bereit im Atelier', icon: Home },
      { id: 'completed', label: 'Abgeholt', description: 'Vielen Dank für Ihren Besuch', icon: CheckCircle2 },
    ];
  }
  return [
    ...base,
    { id: 'shipped', label: 'Versendet', description: 'Unterwegs zu Ihnen mit Frischegarantie', icon: Truck },
    { id: 'completed', label: 'Zugestellt', description: 'Bestellung erfolgreich zugestellt', icon: CheckCircle2 },
  ];
}

export const OrderTracker: React.FC = () => {
  const { activeOrder, setCustomerView, setMode, addReview } = useApp();
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  const currentOrder = activeOrder;

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

  const STATUS_STEPS = getStatusSteps(currentOrder.fulfillmentType);

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'paid': return 0;
      case 'in_production': return 1;
      case 'labeling': return 2;
      case 'ready_for_pickup':
      case 'shipped': return 3;
      case 'completed': return 4;
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

        {currentOrder.isGift && (
          <div className="pt-2 border-t border-stone-800 flex items-start gap-2 text-xs text-stone-300">
            <Gift className="w-4 h-4 text-atelier-terracotta shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Geschenkversand an {currentOrder.giftRecipient?.name}</span>
              {currentOrder.giftMessage && <span className="italic font-serif">"{currentOrder.giftMessage}"</span>}
            </div>
          </div>
        )}
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

            {/* Allergens + Batch Traceability */}
            <div className="flex flex-col sm:flex-row gap-3 items-start bg-stone-50 rounded-xl p-3 border border-stone-200">
              <div className="flex-1 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-atelier-terracotta" />
                  <span>Allergenkennzeichnung</span>
                </div>
                <p className="text-stone-600">
                  {item.allergens && item.allergens.length > 0
                    ? `Enthält: ${item.allergens.map(a => ALLERGEN_LABELS[a]).join(', ')}`
                    : 'Keine deklarationspflichtigen Allergene bekannt'}
                </p>
                {item.lotNumber && (
                  <p className="font-mono text-[11px] text-stone-500 pt-1">Charge / Lot: <strong className="text-stone-800">{item.lotNumber}</strong></p>
                )}
              </div>
              {item.lotNumber && (
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div
                    className="bg-white p-1 rounded border border-stone-300"
                    dangerouslySetInnerHTML={{ __html: generateTraceabilityQrSvg(`ATELIER Charge ${item.lotNumber} · ${currentOrder.producerName} · ${item.productTitle}`, 72) }}
                  />
                  <span className="text-[9px] font-mono text-stone-400 flex items-center gap-1"><QrCode className="w-2.5 h-2.5" /> Herkunft</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review Form (once fully completed — delivered or picked up) */}
      {currentOrder.status === 'completed' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-stone-700">
            WIE WAR IHRE ERFAHRUNG MIT {currentOrder.producerName.toUpperCase()}?
          </h2>
          {reviewSubmitted ? (
            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Vielen Dank für Ihre Bewertung!
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)}>
                    <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-atelier-terracotta text-atelier-terracotta' : 'text-stone-300'}`} />
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Erzählen Sie anderen Kunden von Ihrer Kreation..."
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
              />
              <button
                onClick={() => {
                  addReview({
                    producerId: currentOrder.producerId,
                    orderId: currentOrder.id,
                    customerName: currentOrder.customer.name,
                    rating: reviewRating,
                    comment: reviewComment,
                  });
                  setReviewSubmitted(true);
                }}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold"
              >
                Bewertung abgeben
              </button>
            </div>
          )}
        </div>
      )}

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
