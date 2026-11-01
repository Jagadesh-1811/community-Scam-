"use client";
import { useState, useEffect } from "react";
import { Download, X, ShieldCheck } from "lucide-react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa_banner_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Android/Chrome: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show manual instructions after 3s if mobile
    if (ios && window.innerWidth < 768) {
      setTimeout(() => setShowBanner(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  if (!showBanner || isStandalone || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-[9999] sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-[#0A0A0A] text-[#F7F7F2] rounded-[14px] p-4 shadow-2xl border border-[#23E000]/30">
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full bg-[#F7F7F2]/10 hover:bg-[#F7F7F2]/20 transition"
        >
          <X className="w-3.5 h-3.5 text-[#F7F7F2]" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-[10px] bg-[#23E000]/15 border border-[#23E000]/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#23E000]" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#F7F7F2]">Install ScamRadar</p>
            <p className="text-[10px] text-[#F7F7F2]/70 mt-0.5 leading-relaxed">
              {isIOS
                ? "Tap Share → Add to Home Screen for instant scam checking"
                : "Add to your home screen for quick fraud lookups offline"}
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="mt-3 p-2.5 bg-[#F7F7F2]/5 rounded-[8px] text-[10px] text-[#F7F7F2]/80 leading-relaxed">
            Tap <strong className="text-[#23E000]">⎙ Share</strong> at the bottom of Safari, then tap <strong className="text-[#23E000]">Add to Home Screen</strong>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="mt-3 w-full min-h-[38px] bg-[#23E000] text-[#0A0A0A] rounded-[8px] text-xs font-black uppercase flex items-center justify-center gap-2 hover:opacity-90 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}
      </div>
    </div>
  );
}
