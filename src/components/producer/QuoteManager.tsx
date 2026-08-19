import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Send, CheckCircle2, Receipt, ShieldCheck } from 'lucide-react';

export const QuoteManager: React.FC = () => {
  const { quotes, invoices, currentProducer, respondToQuote, declineQuote, issueInvoice, markInvoicePaid } = useApp();
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const producerQuotes = quotes.filter(q => q.producerId === currentProducer.id);

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-atelier-terracotta shrink-0 mt-0.5" />
        <p className="text-xs text-stone-600 leading-relaxed">
          Offerte → Rechnung läuft komplett ausserhalb des ATELIER-Zahlungsflusses: Sie stellen die Rechnung selbst (z. B. per Swiss-QR-Rechnung), der Kunde zahlt direkt an Sie. ATELIER speichert hier nur die Anfrage-Kommunikation und die Referenznummer — es fliesst zu keinem Zeitpunkt Geld über die Plattform.
        </p>
      </div>

      {producerQuotes.length === 0 ? (
        <div className="p-10 text-center bg-white border border-dashed border-stone-300 rounded-2xl text-xs text-stone-500 font-mono">
          Noch keine Anfragen eingegangen.
        </div>
      ) : (
        <div className="space-y-4">
          {producerQuotes.map(quote => {
            const invoice = invoices.find(i => i.quoteId === quote.id);
            return (
              <div key={quote.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-swiss space-y-4">
                <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 uppercase block">{quote.quoteNumber}</span>
                    <h3 className="font-bold text-stone-900 text-sm">{quote.customer.name}</h3>
                    <span className="text-[11px] text-stone-500">{quote.customer.email} · {quote.customer.city}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase ${
                    quote.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                    quote.status === 'quoted' ? 'bg-blue-100 text-blue-800' :
                    quote.status === 'declined' ? 'bg-red-100 text-red-800' :
                    quote.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-stone-100 text-stone-700'
                  }`}>
                    {quote.status === 'requested' && 'Neue Anfrage'}
                    {quote.status === 'quoted' && 'Offeriert — wartet auf Kunde'}
                    {quote.status === 'declined' && 'Abgelehnt'}
                    {quote.status === 'accepted' && 'Angenommen'}
                    {quote.status === 'invoiced' && 'Rechnung offen'}
                    {quote.status === 'paid' && 'Bezahlt'}
                  </span>
                </div>

                {/* Requested items */}
                <div className="space-y-1.5 text-xs">
                  {quote.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
                      <span className="font-medium text-stone-800">{it.quantity}x {it.productTitle}</span>
                    </div>
                  ))}
                  {quote.customerNote && (
                    <p className="text-[11px] text-stone-500 italic pt-1">„{quote.customerNote}"</p>
                  )}
                </div>

                {/* Respond with price */}
                {quote.status === 'requested' && (
                  <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-stone-100">
                    <div>
                      <label className="text-[10px] font-mono font-bold text-stone-600 block mb-1">Offertpreis ({quote.currency})</label>
                      <input
                        type="number"
                        step="0.50"
                        value={priceDrafts[quote.id] || ''}
                        onChange={(e) => setPriceDrafts({ ...priceDrafts, [quote.id]: e.target.value })}
                        className="w-32 px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-[10px] font-mono font-bold text-stone-600 block mb-1">Notiz / Konditionen (optional)</label>
                      <input
                        type="text"
                        value={noteDrafts[quote.id] || ''}
                        onChange={(e) => setNoteDrafts({ ...noteDrafts, [quote.id]: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                        placeholder="z.B. Lieferung in 3 Wochen, 50% Anzahlung"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const price = parseFloat(priceDrafts[quote.id] || '0');
                        if (!price) { alert('Bitte einen Offertpreis eingeben.'); return; }
                        respondToQuote(quote.id, price, noteDrafts[quote.id]);
                      }}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Offerte senden</span>
                    </button>
                    <button
                      onClick={() => declineQuote(quote.id)}
                      className="px-3 py-2 border border-stone-200 hover:bg-stone-100 text-stone-600 rounded-lg text-xs font-semibold"
                    >
                      Ablehnen
                    </button>
                  </div>
                )}

                {quote.status === 'quoted' && (
                  <div className="pt-2 border-t border-stone-100 text-xs text-stone-600">
                    Offeriert: <strong className="text-stone-900 font-mono">{quote.currency} {quote.quotedPrice?.toFixed(2)}</strong>
                    {quote.quotedNote && <span> · {quote.quotedNote}</span>}
                    <span className="block text-[11px] text-stone-400 mt-1">Wartet auf Annahme durch den Kunden.</span>
                  </div>
                )}

                {quote.status === 'accepted' && (
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div className="text-xs text-stone-600">
                      Angenommen zu <strong className="text-stone-900 font-mono">{quote.currency} {quote.quotedPrice?.toFixed(2)}</strong>
                    </div>
                    <button
                      onClick={() => issueInvoice(quote.id)}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Rechnung erstellen</span>
                    </button>
                  </div>
                )}

                {/* Invoice section */}
                {invoice && (
                  <div className="pt-3 border-t border-stone-100 bg-stone-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-800">
                      <Receipt className="w-3.5 h-3.5 text-atelier-terracotta" />
                      <span>RECHNUNG {invoice.invoiceNumber}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                      <div><span className="text-stone-500 block">Betrag</span><span className="font-bold text-stone-900">{invoice.currency} {invoice.amount.toFixed(2)}</span></div>
                      <div><span className="text-stone-500 block">Fällig bis</span><span className="font-bold text-stone-900">{invoice.dueDate}</span></div>
                      <div><span className="text-stone-500 block">QR-Referenz</span><span className="font-bold text-stone-900">{invoice.qrReference}</span></div>
                    </div>
                    <p className="text-[10px] text-stone-500">Stellen Sie diese Rechnung (z. B. als Swiss-QR-Rechnung) selbst an den Kunden aus. Sobald die Zahlung auf Ihrem Konto eingegangen ist, bestätigen Sie hier manuell.</p>
                    {invoice.status === 'open' ? (
                      <button
                        onClick={() => markInvoicePaid(invoice.id)}
                        className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Als bezahlt markieren</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Zahlung bestätigt am {invoice.paidAt?.slice(0, 10)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
