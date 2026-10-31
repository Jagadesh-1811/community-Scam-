'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { apiClient } from '@/lib/api-client';
import { Activity, Radio, ShieldAlert, ShieldCheck, MapPin, Clock } from 'lucide-react';

export default function MonitoringRadar({ onInspectThreat }) {
  const { t } = useI18n();
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState({
    activeNodes: 142,
    scamsNeutralized: 18492,
    safelistedEntities: 8931,
    networkLatencyMs: "18ms",
    systemTime: "18:50:32 IST"
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    apiClient.getTelemetryFeed().then((data) => {
      if (mounted) setFeed(data);
    });
    apiClient.getRadarStats().then((data) => {
      if (mounted) setStats(data);
    });

    const interval = setInterval(() => {
      // Simulate live clock update
      const now = new Date();
      setStats((prev) => ({
        ...prev,
        systemTime: now.toLocaleTimeString() + ' IST'
      }));
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredFeed = feed.filter((item) => {
    if (filter === 'scam') return item.status === 'scam';
    if (filter === 'safe') return item.status === 'safe';
    return true;
  });

  return (
    <section id="radar" className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#0A0A0A] pb-4 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#23E000] animate-pulse border border-[#0A0A0A]"></span>
            <span className="font-futuristic font-bold text-xs tracking-widest text-[#0A0A0A]">
              TELEMETRY RADAR SENSOR GRID
            </span>
          </div>
          <h2 className="font-futuristic font-black text-2xl sm:text-3xl text-[#0A0A0A]">
            {t('telemetryTitle')}
          </h2>
          <p className="font-serif-filler italic text-sm text-[#0A0A0A]/70 mt-1">
            {t('latinFiller')}
          </p>
        </div>

        {/* Live Status Indicators (Monospaced Data) */}
        <div className="font-mono-data text-xs bg-[#0A0A0A] text-[#F7F7F2] p-3 rounded-flat border border-[#0A0A0A] flex flex-wrap gap-4 sm:gap-6">
          <div>
            <span className="text-[#F7F7F2]/60 block text-[10px]">RADAR TIME</span>
            <span className="font-bold">{stats.systemTime}</span>
          </div>
          <div>
            <span className="text-[#F7F7F2]/60 block text-[10px]">NETWORK RTT</span>
            <span className="font-bold text-[#23E000]">{stats.networkLatencyMs}</span>
          </div>
          <div>
            <span className="text-[#F7F7F2]/60 block text-[10px]">ACTIVE NODES</span>
            <span className="font-bold">{stats.activeNodes} SENSORS</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Flat 1px borders, min 44px tap target) */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-flat font-futuristic text-xs font-bold tracking-wider border border-[#0A0A0A] tap-target transition-all ${
            filter === 'all' ? 'bg-[#0A0A0A] text-[#F7F7F2]' : 'bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A]/10'
          }`}
        >
          ALL OBJECTS ({feed.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('scam')}
          className={`px-4 py-2 rounded-flat font-futuristic text-xs font-bold tracking-wider border border-[#0A0A0A] tap-target transition-all ${
            filter === 'scam' ? 'bg-[#E5201B] text-[#F7F7F2]' : 'bg-[#E5201B]/10 text-[#0A0A0A] hover:bg-[#E5201B]/20'
          }`}
        >
          SCAM THREATS ONLY
        </button>

        <button
          type="button"
          onClick={() => setFilter('safe')}
          className={`px-4 py-2 rounded-flat font-futuristic text-xs font-bold tracking-wider border border-[#0A0A0A] tap-target transition-all ${
            filter === 'safe' ? 'bg-[#23E000] text-[#0A0A0A]' : 'bg-[#23E000]/10 text-[#0A0A0A] hover:bg-[#23E000]/20'
          }`}
        >
          SAFELISTED ONLY
        </button>
      </div>

      {/* Feed List Grid */}
      <div className="space-y-4">
        {filteredFeed.map((item) => (
          <div
            key={item.id}
            className={`border border-[#0A0A0A] rounded-flat p-4 sm:p-5 transition-all bg-[#F7F7F2] hover:bg-[#0A0A0A]/[0.02] flex flex-col justify-between`}
          >
            {/* Top Bar: Sensor + Status Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 font-mono-data text-xs text-[#0A0A0A]/70">
                <span className="w-2 h-2 rounded-full bg-[#0A0A0A]"></span>
                <span className="font-bold text-[#0A0A0A]">{item.sensorId}</span>
                <span>•</span>
                <span>ID: {item.id}</span>
              </div>

              {/* Status Badge: WCAG AA strictly compliant */}
              {item.status === 'safe' ? (
                <span className="badge-safe px-3 py-0.5 rounded-full text-xs font-mono-data uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0A0A0A]" />
                  {t('statusSafe')}
                </span>
              ) : (
                <span className="badge-danger px-3 py-0.5 rounded-full text-xs font-mono-data uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#F7F7F2]" />
                  {t('statusScam')}
                </span>
              )}
            </div>

            {/* Object Title & Category */}
            <div className="mb-3">
              <h3 className="font-futuristic font-black text-lg sm:text-xl text-[#0A0A0A] tracking-tight break-all">
                {item.identifier}
              </h3>
              <p className="font-mono-data text-xs font-bold text-[#0A0A0A]/80 mt-0.5">
                {item.category}
              </p>
            </div>

            {/* Incident Summary Brief */}
            <p className="font-mono-data text-xs text-[#0A0A0A] leading-relaxed mb-4">
              {item.summary}
            </p>

            {/* Bottom Row Telemetry Data */}
            <div className="pt-3 border-t border-[#0A0A0A]/20 flex flex-wrap items-center justify-between gap-3 font-mono-data text-xs">
              <div className="flex items-center gap-1.5 text-[#0A0A0A]/70">
                <MapPin className="w-3.5 h-3.5 text-[#0A0A0A]" />
                <span>{item.telemetryCoords}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#0A0A0A]/70">
                <Clock className="w-3.5 h-3.5 text-[#0A0A0A]" />
                <span>{item.lastDetected}</span>
              </div>

              <button
                type="button"
                onClick={() => onInspectThreat(item.identifier)}
                className="bg-[#0A0A0A] text-[#F7F7F2] px-3 py-1.5 rounded-flat text-xs font-futuristic font-bold border border-[#0A0A0A] tap-target hover:opacity-90 ml-auto"
              >
                ANALYZE OBJECT
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
