'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { apiClient } from '@/lib/api-client';
import {
  ShieldAlert,
  ShieldCheck,
  Bot,
  User,
  Radio,
  Send,
  ArrowRight,
  Activity,
  MapPin,
  Clock,
  Zap,
  AlertTriangle
} from 'lucide-react';

export default function LiveResults({ onInspectThreat, theme = 'dark' }) {
  const { t } = useI18n();
  // 0 = AI Chat Card in front, 1 = Live Results Card in front
  const [frontCard, setFrontCard] = useState(0);
  const [stats, setStats] = useState({
    activeNodes: 142,
    scamsNeutralized: 18492,
    safelistedEntities: 8931,
    networkLatencyMs: '18ms',
    systemTime: '22:21:03 IST'
  });

  // Automated 1.5-second front/rear card swapping interval
  useEffect(() => {
    const swapInterval = setInterval(() => {
      setFrontCard((prev) => (prev === 0 ? 1 : 0));
    }, 1500);

    return () => clearInterval(swapInterval);
  }, []);

  // Live real-time clock ticker & radar telemetry stats
  useEffect(() => {
    const syncStats = async () => {
      try {
        const liveStats = await apiClient.getRadarStats();
        setStats(liveStats);
      } catch (e) {
        const now = new Date();
        setStats((prev) => ({
          ...prev,
          systemTime: now.toLocaleTimeString() + ' IST'
        }));
      }
    };

    syncStats();
    const statsInterval = setInterval(syncStats, 3000);
    return () => clearInterval(statsInterval);
  }, []);

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        
        {/* ================= LEFT SIDE: INFORMATIVE TEXT ABOUT LIVE RESULTS ================= */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">
          
      

          {/* Section Main Title (Orbitron Font - Refined Size) */}
          <h2
            className="font-futuristic font-bold text-lg sm:text-xl lg:text-2xl tracking-wide leading-snug uppercase max-w-lg"
            style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
          >
            REAL-TIME INTERCEPT &amp; THREAT TELEMETRY
          </h2>

          {/* Informative Telemetry Context: Strictly 3 Lines with Clean Alignment */}
          <p className="font-mono-data text-xs sm:text-sm leading-relaxed opacity-85 max-w-lg">
            Cyberforge&apos;s threat radar continuously intercepts digital extortion vectors nationwide. Powered by AI heuristics, our sentinel cross-references spoofed nodes to freeze mule accounts before financial loss occurs.
          </p>

          {/* Live Metrics Quick Grid */}
          <div className="grid grid-cols-3 gap-3 font-mono-data text-xs pt-1">
            <div className="border border-current/20 rounded-flat p-3 bg-current/5 backdrop-blur-xs">
              <span className="block text-[10px] opacity-60 font-bold uppercase">Active Sensors</span>
              <span className="font-futuristic font-black text-sm sm:text-base text-[#23E000]">
                {stats.activeNodes} ONLINE
              </span>
            </div>

            <div className="border border-current/20 rounded-flat p-3 bg-current/5 backdrop-blur-xs">
              <span className="block text-[10px] opacity-60 font-bold uppercase">Latency SLA</span>
              <span className="font-futuristic font-black text-sm sm:text-base text-[#23E000]">
                {stats.networkLatencyMs}
              </span>
            </div>

            <div className="border border-current/20 rounded-flat p-3 bg-current/5 backdrop-blur-xs">
              <span className="block text-[10px] opacity-60 font-bold uppercase">Neutralized</span>
              <span className="font-futuristic font-black text-sm sm:text-base text-[#E5201B]">
                18.4K+
              </span>
            </div>
          </div>    
        </div>

        {/* ================= RIGHT SIDE: 2 CARDS SWAPPING EVERY 1.5 SECONDS ================= */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          
         

          {/* Stacking 3D Card Stage */}
          <div className="relative w-full max-w-[360px] sm:max-w-[410px] h-[340px] sm:h-[365px] mx-auto select-none">
            
            {/* ---------------- CARD 1: USER HAVING AI CHATTING ---------------- */}
            <div
              onClick={() => setFrontCard(0)}
              style={{ backgroundColor: theme === 'dark' ? '#141418' : '#ffffff' }}
              className={`absolute top-0 left-0 w-[295px] sm:w-[335px] h-[330px] sm:h-[355px] rounded-flat border p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-700 ease-in-out cursor-pointer select-none ${
                frontCard === 0
                  ? 'z-20 transform translate-x-0 translate-y-0 scale-100 opacity-100 shadow-[0_16px_36px_rgba(0,0,0,0.35)]'
                  : 'z-10 transform translate-x-11 sm:translate-x-16 translate-y-2.5 sm:translate-y-3 scale-[0.95] opacity-85 shadow-md'
              } ${
                theme === 'dark'
                  ? 'border-[#F7F7F2]/25 text-[#F7F7F2]'
                  : 'border-[#0A0A0A] text-[#0A0A0A]'
              }`}
            >
              {/* Card Header: AI Status */}
              <div>
                <div className="flex items-center justify-between border-b border-current/15 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#23E000] text-[#0A0A0A] flex items-center justify-center font-bold shrink-0">
                      <Bot className="w-4 h-4 text-[#0A0A0A]" />
                    </div>
                    <div>
                      <h4
                        className="font-futuristic font-black text-xs sm:text-[13px] tracking-wider uppercase leading-none"
                        style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
                      >
                        CYBERFORGE AI SENTINEL
                      </h4>
                      <span className="font-mono-data text-[9px] text-[#23E000] flex items-center gap-1 mt-0.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#23E000] animate-ping"></span>
                        LIVE SCAM INTERCEPTOR
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded-full bg-current/10 font-bold shrink-0">
                    CARD 01
                  </span>
                </div>

                {/* Conversation Mockup */}
                <div className="space-y-2 font-mono-data text-xs">
                  
                  {/* User Question Bubble */}
                  <div className="flex items-start justify-end gap-1.5">
                    <div className="bg-current/10 border border-current/15 rounded-xl rounded-tr-xs px-2.5 py-1.5 max-w-[88%] text-left">
                      <span className="block text-[8px] font-bold opacity-60 mb-0.5">
                        YOU (10:48 PM)
                      </span>
                      <p className="leading-tight text-[10px] sm:text-[11px]">
                        &quot;Received an urgent SMS: power cutoff at 11 PM unless I pay ₹4,999 to <span className="underline font-bold text-[#E5201B]">upi-discom@paytm</span>. Is this safe?&quot;
                      </p>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3 h-3" />
                    </div>
                  </div>

                  {/* AI Response Bubble */}
                  <div className="flex items-start gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#23E000] text-[#0A0A0A] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-[#0A0A0A]" />
                    </div>
                    <div className="bg-[#E5201B]/15 border border-[#E5201B]/40 rounded-xl rounded-tl-xs px-2.5 py-1.5 max-w-[90%] text-left">
                      <div className="flex items-center gap-1 mb-0.5 text-[#E5201B] font-bold text-[10px]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>CRITICAL EXTORTION DETECTED</span>
                      </div>
                      <p className="leading-tight opacity-95 text-[9.5px] sm:text-[10px]">
                        ⚠️ DO NOT TRANSFER. Handle matches 42 extortion FIRs. Official utilities never request direct UPI to personal handles.
                      </p>
                      <div className="mt-1.5 pt-1 border-t border-[#E5201B]/20 flex flex-wrap gap-1 text-[8px] font-bold">
                        <span className="bg-[#E5201B] text-white px-1.5 py-0.5 rounded">99.4% SCAM CONFIDENCE</span>
                        <span className="bg-black/30 px-1 py-0.5 rounded">AUTO-FROZEN</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Interactive Prompt Mockup */}
              <div className="pt-2 border-t border-current/15">
                <div className="flex items-center gap-1.5 bg-current/5 border border-current/20 rounded-full px-2.5 py-1.5 font-mono-data text-xs">
                  <input
                    type="text"
                    readOnly
                    value="Ask AI about any suspicious number, UPI, or link..."
                    className="bg-transparent flex-1 focus:outline-none text-[10px] opacity-70 cursor-pointer"
                  />
                  <div className="w-5 h-5 rounded-full bg-[#23E000] text-[#0A0A0A] flex items-center justify-center cursor-pointer shrink-0">
                    <Send className="w-2.5 h-2.5 text-[#0A0A0A]" />
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------- CARD 2: RELATED TO LIVE RESULTS ---------------- */}
            <div
              onClick={() => setFrontCard(1)}
              style={{ backgroundColor: theme === 'dark' ? '#141418' : '#ffffff' }}
              className={`absolute top-0 left-0 w-[295px] sm:w-[335px] h-[330px] sm:h-[355px] rounded-flat border p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-700 ease-in-out cursor-pointer select-none ${
                frontCard === 1
                  ? 'z-20 transform translate-x-0 translate-y-0 scale-100 opacity-100 shadow-[0_16px_36px_rgba(0,0,0,0.35)]'
                  : 'z-10 transform translate-x-11 sm:translate-x-16 translate-y-2.5 sm:translate-y-3 scale-[0.95] opacity-85 shadow-md'
              } ${
                theme === 'dark'
                  ? 'border-[#F7F7F2]/25 text-[#F7F7F2]'
                  : 'border-[#0A0A0A] text-[#0A0A0A]'
              }`}
            >
              {/* Card Header: Live Intercept Alert */}
              <div>
                <div className="flex items-center justify-between border-b border-current/15 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#E5201B] text-[#F7F7F2] flex items-center justify-center font-bold shrink-0">
                      <Radio className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div>
                      <h4
                        className="font-futuristic font-black text-xs sm:text-[13px] tracking-wider uppercase leading-none"
                        style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
                      >
                        INTERCEPT RADAR #CF-98210
                      </h4>
                      <span className="font-mono-data text-[9px] text-[#E5201B] flex items-center gap-1 mt-0.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E5201B] animate-ping"></span>
                        LIVE INTERCEPT BUFFER
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded-full bg-[#E5201B] text-white font-bold shrink-0">
                    CRITICAL
                  </span>
                </div>

                {/* Target Vector Main Box */}
                <div className="border border-current/20 rounded-flat p-2.5 bg-current/5 mb-2 text-left font-mono-data">
                  <span className="text-[8px] font-bold opacity-60 uppercase block">
                    INTERCEPTED ATTACK VECTOR
                  </span>
                  <div className="font-futuristic font-black text-base sm:text-lg tracking-wider text-[#E5201B] mt-0.5 break-all">
                    +91 98450-29184
                  </div>
                  <span className="text-[9px] opacity-75 font-bold">
                    SIM Box Spoof // Mumbai-Andheri Node
                  </span>
                </div>

                {/* Live Result Details 2x2 Grid */}
                <div className="grid grid-cols-2 gap-1.5 font-mono-data text-xs text-left">
                  <div className="border border-current/15 rounded-flat p-2 bg-current/5">
                    <span className="text-[8px] opacity-60 uppercase block font-bold">Category</span>
                    <span className="font-bold text-[10px] text-[#E5201B] truncate block">Digital Arrest Scheme</span>
                  </div>

                  <div className="border border-current/15 rounded-flat p-2 bg-current/5">
                    <span className="text-[8px] opacity-60 uppercase block font-bold">Response SLA</span>
                    <span className="font-bold text-[10px] text-[#23E000] block">18ms Intercept</span>
                  </div>

                  <div className="border border-current/15 rounded-flat p-2 bg-current/5">
                    <span className="text-[8px] opacity-60 uppercase block font-bold">Mule Account</span>
                    <span className="font-bold text-[10px] block truncate">SBI-MULE-8491</span>
                  </div>

                  <div className="border border-current/15 rounded-flat p-2 bg-current/5">
                    <span className="text-[8px] opacity-60 uppercase block font-bold">Victims Flagged</span>
                    <span className="font-bold text-[10px] text-[#E5201B] block">34 Citizens</span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Action Footer */}
              <div className="pt-2 border-t border-current/15 flex items-center justify-between font-mono-data text-xs">
                <div className="flex items-center gap-1 text-[10px] opacity-80">
                  <MapPin className="w-3 h-3 text-[#23E000]" />
                  <span>19.0760° N, 72.8777° E</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onInspectThreat) onInspectThreat('+91 98450-29184');
                  }}
                  className="bg-[#E5201B] text-white hover:opacity-90 px-2.5 py-1 rounded-flat font-futuristic text-[10px] font-bold tracking-wider transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  <span>INSPECT THREAT</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

          </div>      
        </div>

      </div>
    </section>
  );
}
