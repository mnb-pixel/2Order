import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { OrderStatus, Order } from '../../lib/types';
import { Printer, Clock, CheckCircle2, ArrowRight, ArrowLeft, Search } from 'lucide-react';

const COLUMNS: Array<{ id: OrderStatus; label: string; color: string; badgeBg: string }> = [
  { id: 'paid', label: 'Eingang / Bezahlt', color: 'border-amber-500', badgeBg: 'bg-amber-100 text-amber-900' },
  { id: 'in_production', label: 'In Röstung / Produktion', color: 'border-atelier-terracotta', badgeBg: 'bg-orange-100 text-orange-900' },
  { id: 'labeling', label: 'Etikettierung & Endkontrolle', color: 'border-blue-500', badgeBg: 'bg-blue-100 text-blue-900' },
  { id: 'ready_for_pickup', label: 'Bereit zur Übergabe', color: 'border-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-900' },
];

// The order's final pre-completion status depends on how it leaves the atelier —
// picked up in person vs. handed to a carrier — so "labeling" never advances
// into the wrong one of the two.
const finalHandoverStatus = (order: Order): OrderStatus =>
  order.fulfillmentType === 'pickup' ? 'ready_for_pickup' : 'shipped';

export const ProductionQueueKDS: React.FC = () => {
  const { orders, currentProducer, updateOrderStatus, setPrintSlipOrder } = useApp();
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter orders for current active producer
  const producerOrders = orders.filter(o => o.producerId === currentProducer.id);

  const filteredOrders = searchQuery
    ? producerOrders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.items.some(i => i.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) || (i.customLabel && i.customLabel.headline.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    : producerOrders;

  const handleNextStatus = (order: Order) => {
    switch (order.status) {
      case 'paid':
        updateOrderStatus(order.id, 'in_production');
        break;
      case 'in_production':
        updateOrderStatus(order.id, 'labeling');
        break;
      case 'labeling':
        updateOrderStatus(order.id, finalHandoverStatus(order));
        break;
      case 'ready_for_pickup':
      case 'shipped':
        updateOrderStatus(order.id, 'completed');
        break;
    }
  };

  const handlePrevStatus = (order: Order) => {
    switch (order.status) {
      case 'in_production':
        updateOrderStatus(order.id, 'paid');
        break;
      case 'labeling':
        updateOrderStatus(order.id, 'in_production');
        break;
      case 'ready_for_pickup':
      case 'shipped':
        updateOrderStatus(order.id, 'labeling');
        break;
      case 'completed':
        updateOrderStatus(order.id, finalHandoverStatus(order));
        break;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-swiss flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Suche nach Auftrags-Nr, Kunde, Blend..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-xs font-medium focus:outline-none focus:border-stone-900"
            />
          </div>
          <span className="text-xs font-mono text-stone-500 shrink-0">
            {filteredOrders.length} Aufträge aktiv
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-stone-600">
          <Clock className="w-3.5 h-3.5 text-atelier-terracotta" />
          <span>Chargen-Rhythmus: <strong>{currentProducer.batchScheduleNotice}</strong></span>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {COLUMNS.map(col => {
          const colOrders = filteredOrders.filter(o => {
            if (col.id === 'ready_for_pickup') {
              return o.status === 'ready_for_pickup' || o.status === 'shipped' || o.status === 'completed';
            }
            return o.status === col.id;
          });

          return (
            <div
              key={col.id}
              className="bg-[#F6F6F2] border border-stone-200/90 rounded-2xl p-4 flex flex-col min-h-[550px] shadow-swiss"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center pb-3 border-b border-stone-300 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full border-2 ${col.color}`}></span>
                  <h3 className="font-bold text-xs uppercase font-mono text-stone-800 tracking-wider">
                    {col.label}
                  </h3>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Column Orders */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colOrders.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 text-xs font-mono">
                    Keine Aufträge in dieser Phase
                  </div>
                ) : (
                  colOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-white border border-stone-200 hover:border-stone-400 rounded-xl p-4 shadow-sm hover:shadow-swiss transition-all space-y-3"
                    >
                      {/* Card Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">
                            #{order.orderNumber}
                          </span>
                          <h4 className="font-bold text-stone-900 text-sm">{order.customer.name}</h4>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {order.customer.city} · {order.fulfillmentType === 'shipping' ? 'Post' : 'Abholung'}
                          </span>
                        </div>
                        <button
                          onClick={() => setPrintSlipOrder(order)}
                          className="p-1.5 bg-stone-100 hover:bg-stone-900 hover:text-white rounded-md text-stone-700 transition-colors"
                          title="Laufzettel & Etikett drucken"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Items & Recipe Breakdown in Card */}
                      {order.items.map(item => (
                        <div key={item.id} className="space-y-1.5 pt-1 border-t border-stone-100 text-xs">
                          <div className="flex justify-between font-semibold text-stone-900">
                            <span>{item.quantity}x {item.productTitle}</span>
                          </div>

                          {item.customLabel && (
                            <p className="text-[11px] font-serif italic text-atelier-terracotta">
                              "{item.customLabel.headline}"
                            </p>
                          )}

                          {/* Quick recipe summary */}
                          {item.recipe && (
                            <div className="bg-stone-50 rounded p-2 text-[10px] font-mono text-stone-700 space-y-0.5 border border-stone-150">
                              {item.recipe.map(r => (
                                <div key={r.componentId} className="flex justify-between">
                                  <span>{r.ratio}% {r.componentName}</span>
                                  <span className="font-bold">{r.grams * item.quantity}g</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {item.customFieldValues && (
                            <div className="text-[10px] font-mono text-stone-500">
                              {Object.entries(item.customFieldValues).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </div>
                          )}
                          {item.lotNumber && (
                            <div className="text-[10px] font-mono text-stone-400">Lot: {item.lotNumber}</div>
                          )}
                        </div>
                      ))}

                      {/* Status Action Buttons */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                        {order.status !== 'paid' && (
                          <button
                            onClick={() => handlePrevStatus(order)}
                            className="p-1.5 border border-stone-200 hover:bg-stone-100 rounded text-stone-600 transition-colors"
                            title="Zurück in vorherige Phase"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          onClick={() => setPrintSlipOrder(order)}
                          className="text-[10px] font-mono text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3 text-atelier-terracotta" />
                          Laufzettel
                        </button>

                        {order.status !== 'completed' ? (
                          <button
                            onClick={() => handleNextStatus(order)}
                            className="flex-1 py-1.5 px-2 bg-stone-900 hover:bg-stone-800 text-white rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>
                              {(order.status === 'ready_for_pickup' || order.status === 'shipped')
                                ? (order.fulfillmentType === 'pickup' ? 'Als abgeholt bestätigen' : 'Als zugestellt bestätigen')
                                : 'Weiter'}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Erledigt
                          </span>
                        )}
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
