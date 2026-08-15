import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { DACHCountry, CustomerDetails } from '../../lib/types';
import { X, ShieldCheck, Lock, CheckCircle, CreditCard, ArrowRight, AlertCircle, Smartphone } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CheckoutModal: React.FC = () => {
  const { isCheckoutOpen, setIsCheckoutOpen, cart, cartTotal, currentProducer, createOrderFromCart } = useApp();

  const [customer, setCustomer] = useState<CustomerDetails>({
    name: 'Julian Steiner',
    email: 'julian.steiner@bluewin.ch',
    phone: '+41 79 123 45 67',
    street: 'Seestrasse 42',
    postalCode: '8002',
    city: 'Zürich',
    country: 'CH',
  });

  const [paymentMethod, setPaymentMethod] = useState<'twint' | 'apple_pay' | 'card'>('twint');
  const [fulfillmentType, setFulfillmentType] = useState<'shipping' | 'pickup'>('shipping');
  const [agreedMtoReturnPolicy, setAgreedMtoReturnPolicy] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isCheckoutOpen) return null;

  const taxRate = customer.country === 'CH' ? 0.081 : customer.country === 'DE' ? 0.19 : 0.20;
  const taxAmount = cartTotal * (taxRate / (1 + taxRate));

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedMtoReturnPolicy) {
      alert('Bitte bestätigen Sie den rechtlichen Hinweis zur Sonderanfertigung.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsCheckoutOpen(false);

      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#111111', '#9C4A2F', '#D4AF37'],
        });
      } catch (e) {}

      createOrderFromCart({
        customer,
        paymentMethod,
        fulfillmentType,
      });
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-stone-900" />
            <h2 className="font-bold text-stone-900 text-base">
              DIREKT-CHECKOUT · {currentProducer.name.toUpperCase()}
            </h2>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handlePlaceOrder} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Fulfillment Type */}
          <div className="space-y-2">
            <label className="font-mono uppercase font-bold text-stone-700 block">
              Übergabe & Versand
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentType('shipping')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  fulfillmentType === 'shipping'
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-800'
                }`}
              >
                <span className="font-bold block text-xs sm:text-sm">Postversand (DACH)</span>
                <span className="text-[10px] opacity-80 mt-0.5 block">Klimaneutraler Frischeversand</span>
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType('pickup')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  fulfillmentType === 'pickup'
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-800'
                }`}
              >
                <span className="font-bold block text-xs sm:text-sm">Abholung vor Ort</span>
                <span className="text-[10px] opacity-80 mt-0.5 block">Direkt im Atelier ({currentProducer.city})</span>
              </button>
            </div>
          </div>

          {/* Customer Address Details */}
          <div className="space-y-3">
            <label className="font-mono uppercase font-bold text-stone-700 block">
              Liefer- & Rechnungsadresse
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-stone-500 block mb-1">Vollständiger Name</span>
                <input
                  type="text"
                  required
                  value={customer.name}
                  onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <span className="text-stone-500 block mb-1">E-Mail für Auftragsstatus</span>
                <input
                  type="email"
                  required
                  value={customer.email}
                  onChange={(e) => setCustomer(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <span className="text-stone-500 block mb-1">Strasse & Hausnummer</span>
                <input
                  type="text"
                  required
                  value={customer.street}
                  onChange={(e) => setCustomer(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <span className="text-stone-500 block mb-1">PLZ & Ort</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    style={{ width: '80px' }}
                    value={customer.postalCode}
                    onChange={(e) => setCustomer(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium"
                  />
                  <input
                    type="text"
                    required
                    value={customer.city}
                    onChange={(e) => setCustomer(prev => ({ ...prev, city: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <span className="text-stone-500 block mb-1">Land</span>
                <select
                  value={customer.country}
                  onChange={(e) => setCustomer(prev => ({ ...prev, country: e.target.value as DACHCountry }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium bg-white"
                >
                  <option value="CH">Schweiz (CHF · 8.1% MwSt.)</option>
                  <option value="DE">Deutschland (EUR · 19% MwSt.)</option>
                  <option value="AT">Österreich (EUR · 20% MwSt.)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Methods (TWINT / Stripe Direct) */}
          <div className="space-y-3">
            <label className="font-mono uppercase font-bold text-stone-700 block">
              Zahlungsmethode (Direkt an Erzeuger)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('twint')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  paymentMethod === 'twint'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                    : 'border-stone-200 bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>TWINT</span>
                </div>
                {paymentMethod === 'twint' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('apple_pay')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  paymentMethod === 'apple_pay'
                    ? 'border-stone-900 bg-stone-900 text-white font-bold'
                    : 'border-stone-200 bg-stone-50 text-stone-700'
                }`}
              >
                <span>Apple Pay / GPay</span>
                {paymentMethod === 'apple_pay' && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  paymentMethod === 'card'
                    ? 'border-stone-900 bg-stone-900 text-white font-bold'
                    : 'border-stone-200 bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-stone-800" />
                  <span>Kreditkarte</span>
                </div>
                {paymentMethod === 'card' && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>

            <p className="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sichere Direktabwicklung über das Stripe Connect Konto der Manufaktur.
            </p>
          </div>

          {/* Legal Compliance Box: Made-to-Order statutory return exclusion */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-atelier-terracotta shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900 text-xs block">
                  Rechtlicher Hinweis zu Sonderanfertigungen (DACH)
                </span>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                  Da Ihre Bestellung individuell nach Ihren Spezifikationen frisch geröstet, gebraut bzw. gegossen und etikettiert wird (Made-to-Order), ist das gesetzliche 14-tägige Widerrufsrecht gemäss <strong>§ 312g Abs. 2 Nr. 1 BGB (DE)</strong>, <strong>Art. 40g OR (CH)</strong> und <strong>§ 18 Abs. 1 FAGG (AT)</strong> ausgeschlossen.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-2 border-t border-stone-200/80 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreedMtoReturnPolicy}
                onChange={(e) => setAgreedMtoReturnPolicy(e.target.checked)}
                className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 w-4 h-4"
              />
              <span className="text-[11px] font-medium text-stone-800">
                Ich stimme der frischen On-Demand-Produktion und den AGB der Manufaktur ausdrücklich zu.
              </span>
            </label>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-stone-200">
            <div className="flex justify-between text-stone-600">
              <span>Zwischensumme ({cart.length} Positionen)</span>
              <span className="font-mono">{currentProducer.currency} {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Inklusive MwSt. ({customer.country}: {(taxRate * 100).toFixed(1)}%)</span>
              <span className="font-mono">{currentProducer.currency} {taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-stone-900 text-base pt-2 border-t border-stone-100">
              <span>Zu zahlender Gesamtbetrag</span>
              <span className="font-mono text-lg">{currentProducer.currency} {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 px-6 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
          >
            {isProcessing ? (
              <span>Zahlung wird autorisiert...</span>
            ) : (
              <>
                <span>Jetzt kostenpflichtig bestellen</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};
