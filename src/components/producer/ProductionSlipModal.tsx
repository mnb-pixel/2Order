import React from 'react';
import { useApp } from '../../lib/store';
import { X, Printer, AlertTriangle } from 'lucide-react';
import { generateTraceabilityQrSvg } from '../../lib/labelRenderer';
import { ALLERGEN_LABELS } from '../../lib/allergens';

export const ProductionSlipModal: React.FC = () => {
  const { printSlipOrder, setPrintSlipOrder, currentProducer } = useApp();

  if (!printSlipOrder) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-300 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Action Header (Hidden in Print) */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
              PRODUKTIONS-LAUFZETTEL & DRUCKAUFTRAG #{printSlipOrder.orderNumber}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-atelier-terracotta hover:bg-atelier-terracotta/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Drucken (A4/A6)</span>
            </button>
            <button
              onClick={() => setPrintSlipOrder(null)}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-production-slip" className="p-8 sm:p-10 overflow-y-auto space-y-8 text-stone-900 bg-white font-sans">
          
          {/* Header Bar */}
          <div className="border-b-2 border-stone-900 pb-4 flex justify-between items-start">
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase font-bold text-stone-500">
                ✦ WERKSTATT-AUFTRAG · {currentProducer.name.toUpperCase()}
              </div>
              <h1 className="text-2xl font-bold font-mono tracking-tight mt-1">
                AUFTRAG #{printSlipOrder.orderNumber}
              </h1>
              <p className="text-xs text-stone-600 mt-0.5">
                Eingang: {new Date(printSlipOrder.createdAt).toLocaleString('de-CH')} · Soll-Fertigstellung: {printSlipOrder.scheduledBatchDate}
              </p>
            </div>

            <div className="text-right font-mono">
              <div className="inline-block px-3 py-1 bg-stone-900 text-white text-xs font-bold uppercase rounded">
                {printSlipOrder.fulfillmentType === 'shipping' ? 'POSTVERSAND' : 'SELBSTABHOLUNG'}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">Status: BEZAHLT ({printSlipOrder.paymentMethod.toUpperCase()})</div>
            </div>
          </div>

          {/* Customer & Shipping Summary */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div>
              <span className="font-bold text-stone-500 uppercase text-[10px] block mb-1">Empfänger & Lieferadresse</span>
              <p className="font-bold text-stone-900 text-sm">{printSlipOrder.customer.name}</p>
              <p className="text-stone-700">{printSlipOrder.customer.street}</p>
              <p className="text-stone-700">{printSlipOrder.customer.postalCode} {printSlipOrder.customer.city} ({printSlipOrder.customer.country})</p>
              <p className="text-stone-500 mt-1">{printSlipOrder.customer.email}</p>
            </div>
            <div>
              <span className="font-bold text-stone-500 uppercase text-[10px] block mb-1">Auftrags-Metadaten</span>
              <p className="text-stone-700">Manufaktur: {printSlipOrder.producerName}</p>
              <p className="text-stone-700">MwSt.-Nr: {currentProducer.vatNumber}</p>
              <p className="text-stone-700">Betrag: {printSlipOrder.currency} {printSlipOrder.total.toFixed(2)} (inkl. MwSt.)</p>
            </div>
          </div>

          {/* Items & Exact Recipe Bill of Materials (BoM) */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-stone-900 border-b border-stone-300 pb-1">
              STÜCKLISTE & REZEPTUR ZUM EINWÄGEN
            </h2>

            {printSlipOrder.items.map((item, idx) => (
              <div key={item.id} className="space-y-4 border border-stone-200 rounded-xl p-5 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] text-stone-500 block">POSITION #{idx + 1}</span>
                    <h3 className="font-bold text-stone-900 text-base">{item.productTitle}</h3>
                    {item.customLabel && (
                      <p className="text-xs font-serif italic text-atelier-terracotta mt-0.5">
                        Etiketten-Titel: "{item.customLabel.headline}"
                      </p>
                    )}
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-stone-900">Menge: {item.quantity} Stk.</span>
                    <span className="text-xs text-stone-500 block">({item.weightGrams * item.quantity}g Gesamtgewicht)</span>
                  </div>
                </div>

                {/* Recipe Composition Table */}
                {item.recipe && item.recipe.length > 0 && (
                  <div className="space-y-2">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-stone-200 text-left text-[10px] text-stone-500 uppercase">
                          <th className="py-1">Rohstoff / Komponente</th>
                          <th className="py-1">Ursprung</th>
                          <th className="py-1 text-center">Anteil (%)</th>
                          <th className="py-1 text-right">Einwaage pro Stk.</th>
                          <th className="py-1 text-right font-bold text-stone-900">Total Einwaage</th>
                          <th className="py-1 text-center">Kontrolle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {item.recipe.map(r => (
                          <tr key={r.componentId} className="hover:bg-stone-50">
                            <td className="py-2 font-bold text-stone-900">{r.componentName}</td>
                            <td className="py-2 text-stone-600">{r.origin}</td>
                            <td className="py-2 text-center">{r.ratio}%</td>
                            <td className="py-2 text-right">{r.grams}g</td>
                            <td className="py-2 text-right font-bold text-stone-900">{r.grams * item.quantity}g</td>
                            <td className="py-2 text-center">
                              <span className="inline-block w-4 h-4 border border-stone-400 rounded-xs"></span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Selections & Variations */}
                {item.customFieldValues && (
                  <div className="flex flex-wrap gap-2 text-xs font-mono bg-stone-50 p-2.5 rounded border border-stone-200">
                    <span className="font-bold text-stone-700">Verarbeitung:</span>
                    {Object.entries(item.customFieldValues).map(([k, v]) => (
                      <span key={k} className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800 uppercase text-[10px]">
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Allergen declaration + Lot Traceability QR for the workshop file copy */}
                <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-800 block">Allergene (LMIV/LIV Pflichtangabe)</span>
                      <span className="text-stone-600">
                        {item.allergens && item.allergens.length > 0 ? item.allergens.map(a => ALLERGEN_LABELS[a]).join(', ') : 'Keine bekannt'}
                      </span>
                      {item.lotNumber && <span className="block font-mono text-[10px] text-stone-500 mt-1">Lot: {item.lotNumber}</span>}
                    </div>
                  </div>
                  {item.lotNumber && (
                    <div
                      className="bg-white p-1 rounded border border-stone-300 shrink-0"
                      dangerouslySetInnerHTML={{ __html: generateTraceabilityQrSvg(`ATELIER Charge ${item.lotNumber} · ${printSlipOrder.producerName} · ${item.productTitle}`, 56) }}
                    />
                  )}
                </div>

                {/* Rendered Label Vector ready for application */}
                {item.renderedLabelSvg && (
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 uppercase">
                      <span>Druckfertiges Etikett für Verpackung</span>
                      <span>Format: 800x500 Vektor SVG</span>
                    </div>
                    <div
                      className="w-full max-w-md mx-auto bg-white rounded shadow border border-stone-300 p-1"
                      dangerouslySetInnerHTML={{ __html: item.renderedLabelSvg }}
                    />
                  </div>
                )}

              </div>
            ))}
          </div>

          {/* Footer Quality Assurance & Signoff */}
          <div className="border-t-2 border-stone-900 pt-4 grid grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-stone-500 uppercase block">1. Einwaage & Mischung</span>
              <div className="mt-4 border-b border-stone-400 pb-1 text-stone-400">Handzeichen: ____________</div>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase block">2. Röstung / Abfüllung</span>
              <div className="mt-4 border-b border-stone-400 pb-1 text-stone-400">Handzeichen: ____________</div>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase block">3. Etikett & Versand</span>
              <div className="mt-4 border-b border-stone-400 pb-1 text-stone-400">Handzeichen: ____________</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
