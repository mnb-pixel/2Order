import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { CraftCategory, DACHCountry, CurrencyCode } from '../../lib/types';
import { CATEGORY_META, CATEGORY_LIST } from '../../lib/categoryPresets';
import { X, Building2, ArrowRight } from 'lucide-react';

export const ProducerOnboardingModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, createProducer, setMode } = useApp();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<CraftCategory>('coffee');
  const [country, setCountry] = useState<DACHCountry>('CH');
  const [city, setCity] = useState('Zürich');
  const [currency, setCurrency] = useState<CurrencyCode>('CHF');
  const [bio, setBio] = useState('');
  const [vatNumber, setVatNumber] = useState('CHE-123.456.789 MWST');
  const [leadTimeSchedule, setLeadTimeSchedule] = useState('Röstung dienstags, Versand mittwochs');
  const [batchScheduleNotice, setBatchScheduleNotice] = useState('Nächste Charge: Dienstag 08:00');
  const [contactEmail, setContactEmail] = useState('info@atelier-manufaktur.ch');
  const [heroImage] = useState('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80');
  const [portalPin, setPortalPin] = useState('');

  if (!isOnboardingOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^\d{4,6}$/.test(portalPin)) return;

    createProducer({
      name,
      tagline: tagline || 'Handwerkliche Manufaktur & Made-to-Order',
      category,
      country,
      city,
      currency,
      bio: bio || 'Wir fertigen handwerkliche Spitzenprodukte erst nach Eingang Ihrer individuellen Bestellung.',
      vatNumber,
      leadTimeSchedule,
      batchScheduleNotice,
      establishedYear: new Date().getFullYear(),
      contactEmail,
      heroImage,
      logoText: `${name.toUpperCase()} · ${city.toUpperCase()}`,
      portalPin,
    });

    setIsOnboardingOpen(false);
    setMode('producer');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-atelier-terracotta" />
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wider font-mono">
                NEUES GEWERBE / MANUFAKTUR REGISTRIEREN
              </h2>
              <p className="text-[11px] text-stone-400 font-sans">
                Legen Sie Ihr eigenes Atelier für Standard- und Made-to-Order Produkte an
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOnboardingOpen(false)}
            className="p-1 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Step 1: Business Basics */}
          <div className="space-y-3">
            <h3 className="font-mono uppercase font-bold text-stone-800 text-xs border-b border-stone-200 pb-1">
              1. STAMMDATEN DES GEWERBES
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="font-mono text-stone-700 block mb-1 font-bold">Gewerbe- / Betriebsname</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Alpine Roast Zürich oder Aare Craft Brewery"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="font-mono text-stone-700 block mb-1 font-bold">Handwerkskategorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CraftCategory)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white"
                >
                  {CATEGORY_LIST.map(id => (
                    <option key={id} value={id}>{CATEGORY_META[id].label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">{CATEGORY_META[category].exampleComponents}</p>
              </div>

              <div>
                <label className="font-mono text-stone-700 block mb-1 font-bold">Slogan / Tagline</label>
                <input
                  type="text"
                  placeholder="z.B. Micro-Roasting on Demand"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-mono text-stone-700 block mb-1 font-bold">Standort / Stadt</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Basel"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-mono text-stone-700 block mb-1 font-bold">Land & Währung</label>
                <div className="flex gap-2">
                  <select
                    value={country}
                    onChange={(e) => {
                      const c = e.target.value as DACHCountry;
                      setCountry(c);
                      setCurrency(c === 'CH' ? 'CHF' : 'EUR');
                    }}
                    className="w-1/2 px-2 py-2 border border-stone-300 rounded-lg text-xs bg-white"
                  >
                    <option value="CH">Schweiz (CH)</option>
                    <option value="DE">Deutschland (DE)</option>
                    <option value="AT">Österreich (AT)</option>
                  </select>
                  <input
                    type="text"
                    disabled
                    value={currency}
                    className="w-1/2 px-2 py-2 bg-stone-100 border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="font-mono text-stone-700 block mb-1 font-bold">Betriebsbeschreibung / Story</label>
                <textarea
                  rows={2}
                  placeholder="Beschreiben Sie Ihre Manufaktur, Rohstoffe und Handwerksphilosophie..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Production Schedule & Compliance */}
          <div className="space-y-3 pt-2">
            <h3 className="font-mono uppercase font-bold text-stone-800 text-xs border-b border-stone-200 pb-1">
              2. PRODUKTIONSRHYTHMUS & RECHTLICHES
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-stone-700 block mb-1 font-bold">MwSt.-Nummer (UID / Steuernummer)</label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-mono text-stone-700 block mb-1 font-bold">Kontakt E-Mail</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-mono text-stone-700 block mb-1 font-bold">Regulärer Chargen-Rhythmus</label>
                <input
                  type="text"
                  value={leadTimeSchedule}
                  onChange={(e) => setLeadTimeSchedule(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-mono text-stone-700 block mb-1 font-bold">Nächster Produktionstag (Hinweis)</label>
                <input
                  type="text"
                  value={batchScheduleNotice}
                  onChange={(e) => setBatchScheduleNotice(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Portal Access */}
          <div className="space-y-3 pt-2">
            <h3 className="font-mono uppercase font-bold text-stone-800 text-xs border-b border-stone-200 pb-1">
              3. PORTAL-ZUGRIFFSCODE
            </h3>
            <p className="text-[11px] text-stone-500">
              Ein 4–6-stelliger Code, mit dem Sie das Produzenten-Portal dieses Gewerbes künftig entsperren. Bewahren Sie ihn sicher auf — dies ist ein einfacher Zugriffsschutz, kein vollständiges Login-System.
            </p>
            <input
              type="text"
              inputMode="numeric"
              required
              pattern="\d{4,6}"
              placeholder="z.B. 4711"
              value={portalPin}
              onChange={(e) => setPortalPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-40 px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold tracking-widest"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(false)}
              className="px-4 py-2.5 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <span>Gewerbe erstellen & Dashboard öffnen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
