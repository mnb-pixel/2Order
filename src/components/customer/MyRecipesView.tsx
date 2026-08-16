import React from 'react';
import { useApp } from '../../lib/store';
import { calculatePriceFromRecipe } from '../../lib/pricing';
import { ArrowLeft, Bookmark, ShoppingBag, Trash2 } from 'lucide-react';

export const MyRecipesView: React.FC = () => {
  const { savedRecipes, removeSavedRecipe, products, producers, setCustomerView, addToCart, setSelectedProducerId } = useApp();

  const handleReorder = (recipeId: string) => {
    const saved = savedRecipes.find(r => r.id === recipeId);
    if (!saved) return;
    const product = products.find(p => p.id === saved.productId);
    const producer = producers.find(p => p.id === saved.producerId);
    if (!product || !producer) {
      alert('Dieses Produkt ist bei der Manufaktur nicht mehr verfügbar.');
      return;
    }
    const unitPrice = calculatePriceFromRecipe(product, saved.recipe, saved.customFieldValues);
    setSelectedProducerId(producer.id);
    addToCart({
      id: `reorder-${Date.now()}`,
      product,
      producer,
      quantity: 1,
      unitPrice,
      recipe: saved.recipe,
      customFieldValues: saved.customFieldValues,
      customLabel: saved.labelHeadline ? {
        headline: saved.labelHeadline,
        subtitle: 'Nachbestellung Ihres gemerkten Blends',
        fontStyle: 'swiss-sans',
        batchNumber: `MZ-${Math.floor(100 + Math.random() * 900)}`,
        roastOrBrewDate: new Date().toLocaleDateString('de-CH'),
      } : undefined,
      leadTimeInfo: producer.leadTimeSchedule,
    });
  };

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
        <Bookmark className="w-5 h-5 text-atelier-terracotta" />
        <h1 className="text-xl font-bold text-stone-900">Meine gemerkten Blends</h1>
      </div>

      {savedRecipes.length === 0 ? (
        <div className="p-10 text-center bg-white border border-dashed border-stone-300 rounded-2xl text-xs text-stone-500 font-mono">
          Noch keine Rezepturen gemerkt. Speichern Sie im Blend-Canvas Ihre Lieblingsmischung für schnelle Nachbestellungen.
        </div>
      ) : (
        <div className="space-y-3">
          {savedRecipes.map(r => (
            <div key={r.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-swiss flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-stone-500 uppercase block">{r.producerName}</span>
                <h3 className="font-bold text-stone-900 text-sm">{r.labelHeadline || r.productTitle}</h3>
                {r.recipe && r.recipe.length > 0 && (
                  <p className="text-[11px] text-stone-500 font-mono">
                    {r.recipe.map(item => `${item.ratio}% ${item.componentName}`).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleReorder(r.id)}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Nochmal bestellen</span>
                </button>
                <button
                  onClick={() => removeSavedRecipe(r.id)}
                  className="p-2 text-stone-400 hover:text-red-600"
                  title="Entfernen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
