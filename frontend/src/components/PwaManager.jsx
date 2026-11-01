"use client";

import { useState, useEffect } from "react";
import { Download, X, WifiOff, ShieldAlert, PhoneCall } from "lucide-react";

export default function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineNoticeDismissed, setOfflineNoticeDismissed] = useState(false);

  useEffect(() => {
    // 1. Detect if running in standalone PWA mode
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standaloneMode);

    // 2. Register Service Worker in production/browser
    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    // 3. Listen for PWA Install Prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed it in this session
      const dismissed = sessionStorage.getItem("scamradar_install_dismissed");
      if (!dismissed && !standaloneMode) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 4. Online/Offline Network Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setOfflineNoticeDismissed(false);
    };

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("scamradar_install_dismissed", "true");
  };

  return (
    <>
      {/* ── Offline Alert Banner ── */}
      {isOffline && !offlineNoticeDismissed && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#E5201B] text-[#F7F7F2] px-4 py-2 text-xs font-mono font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>OFFLINE MODE // Local cached emergency protocols active. Dial 1930 for urgent aid.</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="tel:1930"
              className="px-2 py-0.5 rounded bg-black text-[#23E000] text-[11px] font-black uppercase flex items-center gap-1 hover:bg-white hover:text-black transition"
            >
              <PhoneCall className="w-3 h-3" />
              <span>1930</span>
            </a>
            <button
              onClick={() => setOfflineNoticeDismissed(true)}
              className="p-1 hover:bg-black/20 rounded cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile PWA Install Floating Banner ── */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-18 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[9990] bg-[#0A0A0A] text-[#F7F7F2] border-2 border-[#23E000] rounded-[16px] p-3.5 shadow-2xl animate-bounce-subtle backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#141414] border border-[#23E000]/50 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-[#23E000]" />
              </div>
              <div>
                <h4 className="font-futuristic font-black text-xs uppercase tracking-wider text-[#F7F7F2]">
                  Install ScamRadar App
                </h4>
                <p className="text-[11px] text-[#F7F7F2]/75 leading-tight mt-0.5">
                  Offline 1930 helpline &amp; instant scam alerts on your phone.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissBanner}
              className="w-7 h-7 rounded-[8px] border border-white/20 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 min-h-[38px] bg-[#23E000] text-[#0A0A0A] rounded-[10px] text-xs font-black uppercase tracking-wider hover:bg-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install to Home Screen</span>
            </button>
            <button
              onClick={handleDismissBanner}
              className="px-3 min-h-[38px] border border-white/20 rounded-[10px] text-[11px] font-bold text-white/80 hover:bg-white/10 transition cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}
