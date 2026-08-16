import React, { useState } from 'react';
import { useApp } from './lib/store';
import { Header } from './components/layout/Header';
import { DiscoverFeed } from './components/customer/DiscoverFeed';
import { ProducerProfile } from './components/customer/ProducerProfile';
import { BlendCustomizer } from './components/customer/BlendCustomizer';
import { OrderTracker } from './components/customer/OrderTracker';
import { CartDrawer } from './components/customer/CartDrawer';
import { CheckoutModal } from './components/customer/CheckoutModal';
import { ProducerDashboard } from './components/producer/ProducerDashboard';
import { ProductionSlipModal } from './components/producer/ProductionSlipModal';
import { ProducerOnboardingModal } from './components/producer/ProducerOnboardingModal';
import { Smartphone, Monitor } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { mode, customerView } = useApp();
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#111111] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Customer Experience View */}
        {mode === 'customer' && (
          <div>
            {/* Optional Device View Toggle for testing mobile viewport */}
            <div className="mb-4 flex justify-end no-print">
              <button
                onClick={() => setDeviceFrameMode(!deviceFrameMode)}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-md transition-colors"
                title="Zwischen Desktop- und Mobilansichts-Rahmen wechseln"
              >
                {deviceFrameMode ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                <span>{deviceFrameMode ? 'Vollbildansicht' : 'Mobile-Simulator'}</span>
              </button>
            </div>

            <div className={deviceFrameMode ? 'max-w-md mx-auto bg-[#FBFBF9] border-4 border-stone-800 rounded-3xl p-4 shadow-2xl overflow-hidden' : ''}>
              {customerView === 'discover' && <DiscoverFeed />}
              {customerView === 'producer' && <ProducerProfile />}
              {customerView === 'customizer' && <BlendCustomizer />}
              {customerView === 'tracking' && <OrderTracker />}
            </div>
          </div>
        )}

        {/* Producer Web Dashboard & KDS View */}
        {mode === 'producer' && (
          <ProducerDashboard />
        )}

      </main>

      {/* Persistent Modals & Overlays */}
      <CartDrawer />
      <CheckoutModal />
      <ProductionSlipModal />
      <ProducerOnboardingModal />
    </div>
  );
};
