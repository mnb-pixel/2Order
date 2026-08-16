import React from 'react';
import { useApp } from '../../lib/store';
import { ArrowLeft, FileText, CheckCircle2, XCircle, Receipt, ShieldCheck } from 'lucide-react';

export const RequestsTracker: React.FC = () => {
  const { quotes, invoices, activeQuote, acceptQuote, declineQuote, setCustomerView } = useApp();

  const myQuotes = activeQuote ? [activeQuote, ...quotes.filter(q => q.id !== activeQuote.id)] : quotes;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => setCustomerView('discover')}
        className="inline-flex items-center gap-2 text-xs font-mono text-stone-600 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        ZURÜCK ZUR STARTSEITE
      </button>

      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-atelier-terracotta" />
        <h1 className="text-xl font-bold text-stone-900">Meine Anfragen & Rechnungen</h1>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-atelier-terracotta shrink-0 mt-0.5" />
        <p className="text-[11px] text-stone-600 leading-relaxed">
          Bei Anfragen erhalten Sie eine individuelle Offerte direkt von der Manufaktur. Nach Annahme stellt Ihnen die Manufaktur eine Rechnung — die Zahlung erfolgt direkt an sie, nicht über ATELIER.
        </p>
      </div>

      {myQuotes.length === 0 ? (
        <div className="p-10 text-center bg-white border border-dashed border-stone-300 rounded-2xl text-xs text-stone-500 font-mono">
          Noch keine Anfragen gestellt.
        </div>
      ) : (
        <div className="space-y-4">
          {myQuotes.map(quote => {
            const invoice = invoices.find(i => i.quoteId === quote.id);
            return (
              <div key={quote.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-swiss space-y-3">
                <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 uppercase block">{quote.quoteNumber}</span>
                    <h3 className="font-bold text-stone-900 text-sm">{quote.producerName}</h3>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase ${
                    quote.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                    quote.status === 'quoted' ? 'bg-blue-100 text-blue-800' :
                    quote.status === 'declined' ? 'bg-red-100 text-red-800' :
                    quote.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-stone-100 text-stone-700'
                  }`}>
                    {quote.status === 'requested' && 'Warten auf Offerte'}
                    {quote.status === 'quoted' && 'Offerte erhalten'}
                    {quote.status === 'declined' && 'Abgelehnt'}
                    {quote.status === 'accepted' && 'Angenommen'}
                    {quote.status === 'invoiced' && 'Rechnung offen'}
                    {quote.status === 'paid' && 'Bezahlt'}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  {quote.items.map((it, idx) => (
                    <div key={idx} className="text-stone-700">{it.quantity}x {it.productTitle}</div>
                  ))}
                </div>

                {quote.status === 'quoted' && (
                  <div className="pt-2 border-t border-stone-100 space-y-2">
                    <div className="text-xs text-stone-700">
                      Offertpreis: <strong className="font-mono text-stone-900">{quote.currency} {quote.quotedPrice?.toFixed(2)}</strong>
                      {quote.quotedNote && <span className="block text-[11px] text-stone-500 mt-0.5">{quote.quotedNote}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptQuote(quote.id)}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Offerte annehmen</span>
                      </button>
                      <button
                        onClick={() => declineQuote(quote.id)}
                        className="px-3 py-2 border border-stone-200 hover:bg-stone-100 text-stone-600 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Ablehnen</span>
                      </button>
                    </div>
                  </div>
                )}

                {invoice && (
                  <div className="pt-3 border-t border-stone-100 bg-stone-50 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-800">
                      <Receipt className="w-3.5 h-3.5 text-atelier-terracotta" />
                      <span>RECHNUNG {invoice.invoiceNumber}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                      <div><span className="text-stone-500 block">Betrag</span><span className="font-bold text-stone-900">{invoice.currency} {invoice.amount.toFixed(2)}</span></div>
                      <div><span className="text-stone-500 block">Fällig bis</span><span className="font-bold text-stone-900">{invoice.dueDate}</span></div>
                      <div><span className="text-stone-500 block">QR-Referenz</span><span className="font-bold text-stone-900">{invoice.qrReference}</span></div>
                    </div>
                    <p className="text-[10px] text-stone-500 pt-1">
                      {invoice.status === 'paid' ? 'Zahlung wurde von der Manufaktur bestätigt.' : 'Bitte begleichen Sie diese Rechnung direkt bei der Manufaktur (z. B. per Swiss-QR-Rechnung/Überweisung).'}
                    </p>
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
