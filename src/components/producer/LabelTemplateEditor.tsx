import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { generateLabelSvg } from '../../lib/labelRenderer';
import { Sparkles, Eye, Save, Code, Check } from 'lucide-react';

export const LabelTemplateEditor: React.FC = () => {
  const { currentProducer } = useApp();

  const [templateName, setTemplateName] = useState<string>('Standard Swiss Grid A6');
  const [selectedFont, setSelectedFont] = useState<string>('swiss-sans');
  const [sampleHeadline, setSampleHeadline] = useState<string>('Signature Reserve Blend');
  const [sampleDedication, setSampleDedication] = useState<string>('Geröstet für das Atelier');

  const previewSvg = generateLabelSvg({
    category: currentProducer.category,
    producerName: currentProducer.name,
    customLabel: {
      headline: sampleHeadline,
      subtitle: '60% Yirgacheffe / 40% Huila · Espresso Grind',
      dedication: sampleDedication,
      fontStyle: selectedFont,
      batchNumber: 'MZ-TEMPLATE-01',
      roastOrBrewDate: new Date().toLocaleDateString('de-CH'),
    },
    recipe: [
      { componentId: '1', componentName: 'Äthiopien Yirgacheffe', origin: 'Washed', ratio: 60, grams: 300 },
      { componentId: '2', componentName: 'Kolumbien Huila', origin: 'Washed', ratio: 40, grams: 200 },
    ],
    productTitle: 'Custom Made-to-Order Roast',
    weightText: '500g Beutel',
  });

  return (
    <div className="space-y-6">
      
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-swiss space-y-6">
        <div>
          <h2 className="text-xs uppercase font-mono font-bold text-stone-800 tracking-wider">
            SVG ETIKETTEN-STUDIO & VEKTOR-SLOTS
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Konfigurieren Sie die dynamischen Text- und Rezeptur-Platzhalter (`{{custom_title}}`, `{{recipe_breakdown}}`, `{{batch_date}}`) für Ihren Thermotransfer- oder Laserdrucker.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            <div>
              <label className="font-mono text-stone-600 block mb-1 font-bold">Template-Bezeichnung</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium"
              />
            </div>

            <div>
              <label className="font-mono text-stone-600 block mb-1 font-bold">Test-Headline</label>
              <input
                type="text"
                value={sampleHeadline}
                onChange={(e) => setSampleHeadline(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium"
              />
            </div>

            <div>
              <label className="font-mono text-stone-600 block mb-1 font-bold">Test-Widmung / Notiz</label>
              <input
                type="text"
                value={sampleDedication}
                onChange={(e) => setSampleDedication(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium italic font-serif"
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-stone-600 block font-bold">Schweizer Schriftarten-Set</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'swiss-sans', name: 'Swiss Neo-Grotesk (Inter/Haas)', desc: 'Streng minimalistisch, serifenlos' },
                  { id: 'editorial-serif', name: 'Zurich Heritage Serif (Playfair)', desc: 'Traditionell, edel & kursiv' },
                  { id: 'minimal-mono', name: 'Atelier Artisan Mono (JetBrains)', desc: 'Technisch, präzise & Chargen-Look' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFont(f.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedFont === f.id
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{f.name}</span>
                      {selectedFont === f.id && <Check className="w-3.5 h-3.5 text-atelier-terracotta" />}
                    </div>
                    <span className={`text-[10px] block mt-0.5 ${selectedFont === f.id ? 'text-stone-300' : 'text-stone-500'}`}>
                      {f.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => alert('Etiketten-Template erfolgreich aktualisiert!')}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4 text-atelier-terracotta" />
                <span>Template speichern</span>
              </button>
            </div>
          </div>

          {/* Live High-Res Vector Rendering (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-stone-500">
              <span>Echtzeit-Vektor-Vorschau (SVG 800x500)</span>
              <span>100% Druckschärfe</span>
            </div>

            <div className="bg-stone-100 border border-stone-300 rounded-xl p-4 sm:p-6 shadow-inner flex items-center justify-center min-h-[380px]">
              <div
                className="w-full max-w-lg bg-white rounded shadow-xl p-1 border border-stone-400"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
