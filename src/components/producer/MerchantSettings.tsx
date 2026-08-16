import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { ShieldCheck, CreditCard, Clock, CheckCircle2, Kanban } from 'lucide-react';

export const MerchantSettings: React.FC = () => {
  const { currentProducer, updateProducer, getBatchCapacityInfo } = useApp();
  const [capacityDraft, setCapacityDraft] = useState<string>(currentProducer.capacityPerBatch?.toString() || '');
  const capacityInfo = getBatchCapacityInfo(currentProducer.id);

  return (
    <div className="space-y-6">
      
      {/* Stripe Connect & Merchant of Record Status */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-stone-900" />
            <h3 className="text-xs uppercase font-mono font-bold text-stone-800 tracking-wider">
              STRIPE CONNECT & DIREKTAUSZAHLUNGEN (MERCHANT OF RECORD)
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Verbunden & Aktiv
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Zahlungen von Kunden fliessen ohne Zwischenhändler direkt auf Ihr verknüpftes Schweizer / DACH-Bankkonto via Stripe Custom Connect. ATELIER stellt ausschliesslich die Software-Infrastruktur bereit.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs font-mono">
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <span className="text-stone-500 block text-[10px]">VERKNÜPFTES KONTO</span>
            <span className="font-bold text-stone-900 text-sm mt-0.5 block">{currentProducer.name}</span>
            <span className="text-stone-500 text-[11px]">CH93 0076 2011 6238 5291</span>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <span className="text-stone-500 block text-[10px]">STANDARD-WÄHRUNG</span>
            <span className="font-bold text-stone-900 text-sm mt-0.5 block">{currentProducer.currency} (DACH)</span>
            <span className="text-emerald-700 text-[11px]">TWINT & Apple Pay aktiviert</span>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <span className="text-stone-500 block text-[10px]">MWST-NUMMER</span>
            <span className="font-bold text-stone-900 text-sm mt-0.5 block">{currentProducer.vatNumber}</span>
            <span className="text-stone-500 text-[11px]">8.1% CH Regelsatz</span>
          </div>
        </div>
      </div>

      {/* Production Cycle & Batch Schedule Config */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <Clock className="w-4 h-4 text-stone-900" />
          <h3 className="text-xs uppercase font-mono font-bold text-stone-800 tracking-wider">
            PRODUKTIONSRHYTHMUS & MTO-VORLAUFZEITEN
          </h3>
        </div>

        <p className="text-xs text-stone-600">
          Dieser Zeitplan wird Endkunden transparent im Konfigurator und Checkout angezeigt, um Erwartungen für Made-to-Order Chargen optimal zu steuern.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-mono text-stone-600 block mb-1 font-bold">Wöchentlicher Chargen-Hinweis</label>
            <input
              type="text"
              defaultValue={currentProducer.leadTimeSchedule}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium text-xs"
            />
          </div>

          <div>
            <label className="font-mono text-stone-600 block mb-1 font-bold">Nächster Produktionstag</label>
            <input
              type="text"
              defaultValue={currentProducer.batchScheduleNotice}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium text-xs"
            />
          </div>
        </div>
      </div>

      {/* Batch Capacity Limit */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <Kanban className="w-4 h-4 text-stone-900" />
          <h3 className="text-xs uppercase font-mono font-bold text-stone-800 tracking-wider">
            KAPAZITÄTSGRENZE PRO FERTIGUNGSCHARGE
          </h3>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Verhindert Überbuchung: Sobald diese Anzahl offener Made-to-Order Aufträge erreicht ist, sehen Kunden im Checkout einen Hinweis, dass die nächste Charge voll ist.
        </p>

        <div className="flex items-end gap-3 text-xs">
          <div>
            <label className="font-mono text-stone-600 block mb-1 font-bold">Max. Aufträge / Charge</label>
            <input
              type="number"
              min="0"
              placeholder="unbegrenzt"
              value={capacityDraft}
              onChange={(e) => setCapacityDraft(e.target.value)}
              onBlur={() => updateProducer(currentProducer.id, { capacityPerBatch: capacityDraft === '' ? undefined : parseInt(capacityDraft, 10) || 0 })}
              className="w-32 px-3 py-2 border border-stone-300 rounded-lg font-mono font-bold text-xs"
            />
          </div>
          {capacityInfo.capacity !== null && (
            <span className={`text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg ${capacityInfo.isFull ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              Aktuell {capacityInfo.booked}/{capacityInfo.capacity} belegt
            </span>
          )}
        </div>
      </div>

      {/* Legal & Compliance Notice */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-xs text-stone-600 space-y-2">
        <div className="flex items-center gap-2 text-stone-900 font-bold font-mono">
          <ShieldCheck className="w-4 h-4 text-atelier-terracotta" />
          <span>DACH-RECHTSKONFORMITÄT AKTIVIERT</span>
        </div>
        <p className="leading-relaxed">
          Alle im Shop angebotenen Produkte enthalten automatische Klauseln zum Ausschluss des gesetzlichen Widerrufsrechts für kundenspezifische Waren (§ 312g Abs. 2 Nr. 1 BGB, Art. 40g OR, § 18 Abs. 1 FAGG).
        </p>
      </div>

    </div>
  );
};
