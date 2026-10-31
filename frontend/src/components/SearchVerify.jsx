'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { apiClient } from '@/lib/api-client';
import FuzzyText from './FuzzyText';
import { Search, ShieldAlert, ShieldCheck, AlertTriangle, ExternalLink, Flag, Crosshair } from 'lucide-react';

export default function SearchVerify({ onOpenReportModal }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      // Sub-second response SLA (< 300ms)
      const data = await apiClient.searchThreat(query);
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "+91 98765 43210",
    "refund-support@okhdfcbank",
    "sbi-kyc-verification.top",
    "1930",
    "cybercrime.gov.in"
  ];

  return (
    <section id="verify" className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 bg-[#E5201B] border border-[#0A0A0A]"></span>
          <span className="font-futuristic font-bold text-xs tracking-widest text-[#E5201B]">
            SCANNER ENGINE // V4.2
          </span>
        </div>
        <h2 className="font-futuristic font-extrabold text-2xl sm:text-3xl text-[#0A0A0A] tracking-tight">
          {t('monitoringObject')}
        </h2>
        <p className="font-serif-filler italic text-sm text-[#0A0A0A]/70 mt-1">
          {t('latinFiller')}
        </p>
      </div>

      {/* Flat Search Box (1px black border, 12px rounded, min 44px tap target) */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-[#F7F7F2] border border-[#0A0A0A] rounded-flat px-4 py-3 font-mono-data text-sm text-[#0A0A0A] placeholder-[#0A0A0A]/50 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] tap-target"
            disabled={loading}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setHasSearched(false); setResult(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono-data text-[#0A0A0A]/60 hover:text-[#0A0A0A] px-2 py-1"
            >
              CLEAR
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-[#0A0A0A] text-[#F7F7F2] hover:opacity-90 px-6 py-3 rounded-flat font-futuristic text-xs font-bold tracking-wider border border-[#0A0A0A] tap-target transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? t('searching') : t('searchButton')}</span>
        </button>
      </form>

      {/* Suggested Quick Searches */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono-data text-[11px] text-[#0A0A0A]/60">TRY INTEL SAMPLES:</span>
        {sampleQueries.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setQuery(item); }}
            className="font-mono-data text-xs bg-[#0A0A0A]/5 hover:bg-[#0A0A0A]/10 border border-[#0A0A0A] rounded-flat px-2 py-1 text-[#0A0A0A] transition-colors"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Loading Skeleton / Empty State (< 1 sec SLA, zero layout shift) */}
      {loading && (
        <div className="mt-6 p-6 border border-[#0A0A0A] rounded-flat bg-[#F7F7F2] animate-pulse">
          <div className="h-4 bg-[#0A0A0A]/10 rounded w-1/4 mb-4"></div>
          <div className="h-6 bg-[#0A0A0A]/15 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-[#0A0A0A]/10 rounded w-1/2"></div>
        </div>
      )}

      {/* Result Display: Matched Record vs FuzzyText 404 Empty State */}
      {!loading && hasSearched && (
        <div className="mt-6">
          {result ? (
            /* Threat Found Card */
            <div 
              className={`border border-[#0A0A0A] rounded-flat p-6 ${
                result.status === 'safe' ? 'bg-[#23E000]/10' : 'bg-[#E5201B]/10'
              }`}
            >
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#0A0A0A] pb-4">
                <div className="flex items-center gap-3">
                  {result.status === 'safe' ? (
                    <span className="badge-safe px-3 py-1 rounded-flat text-xs font-futuristic tracking-wider inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#0A0A0A]" />
                      {t('statusSafe')}
                    </span>
                  ) : (
                    <span className="badge-danger px-3 py-1 rounded-flat text-xs font-futuristic tracking-wider inline-flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-[#F7F7F2]" />
                      {t('statusScam')}
                    </span>
                  )}
                  <span className="font-mono-data text-xs font-bold text-[#0A0A0A]">
                    REF: {result.id}
                  </span>
                </div>

                <div className="font-mono-data text-xs text-[#0A0A0A]/70">
                  CONFIDENCE: <strong className="text-[#0A0A0A]">{result.confidenceScore}%</strong>
                </div>
              </div>

              {/* Target Identifier Header */}
              <div className="mb-4">
                <span className="font-mono-data text-xs text-[#0A0A0A]/60 block uppercase">
                  {t('entityLabel')}
                </span>
                <h3 className="font-futuristic font-black text-xl sm:text-2xl text-[#0A0A0A] break-all">
                  {result.identifier}
                </h3>
                <span className="font-mono-data text-sm font-bold text-[#0A0A0A] inline-block mt-1">
                  CATEGORY: {result.category}
                </span>
              </div>

              {/* Telemetry and Coordinates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F7F7F2] border border-[#0A0A0A] rounded-flat mb-4 font-mono-data text-xs">
                <div>
                  <span className="text-[#0A0A0A]/60 block">{t('gpsCoordinates')}:</span>
                  <span className="font-bold text-[#0A0A0A]">{result.telemetryCoords}</span>
                </div>
                <div>
                  <span className="text-[#0A0A0A]/60 block">{t('lastReported')}:</span>
                  <span className="font-bold text-[#0A0A0A]">{result.lastDetected}</span>
                </div>
                <div>
                  <span className="text-[#0A0A0A]/60 block">{t('reportsCount')}:</span>
                  <span className="font-bold text-[#0A0A0A]">{result.reportCount}</span>
                </div>
              </div>

              {/* Incident Summary */}
              <div className="mb-4">
                <span className="font-mono-data text-xs text-[#0A0A0A]/60 block uppercase mb-1">
                  {t('descriptionLabel')}
                </span>
                <p className="font-mono-data text-sm text-[#0A0A0A] leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenReportModal(result.identifier)}
                  className="bg-[#0A0A0A] text-[#F7F7F2] px-4 py-2 rounded-flat font-futuristic text-xs font-bold tracking-wider border border-[#0A0A0A] tap-target hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>ADD SUPPLEMENTARY EVIDENCE</span>
                </button>
              </div>
            </div>
          ) : (
            /* EMPTY STATE: USER PROMPT REQUIREMENT 1 (<FuzzyText /> Component Integration) */
            <div className="border border-[#0A0A0A] rounded-flat p-8 bg-[#F7F7F2] text-center flex flex-col items-center justify-center">
              {/* FuzzyText Component Rendering Not Found State */}
              <div className="my-2 py-4 flex justify-center w-full overflow-hidden">
                <FuzzyText
                  color="#E5201B"
                  fontSize="clamp(2rem, 6vw, 3.5rem)"
                  fontWeight={900}
                  baseIntensity={0.25}
                  hoverIntensity={0.65}
                  fuzzRange={25}
                  trigger="hover"
                  intro={true}
                  introDuration={1000}
                >
                  404 NOT FOUND
                </FuzzyText>
              </div>

              <h3 className="font-futuristic font-black text-xl text-[#0A0A0A] mt-2 mb-1">
                {t('emptyTitle')}
              </h3>

              <div className="font-mono-data text-xs text-[#0A0A0A] max-w-md bg-[#0A0A0A]/5 border border-[#0A0A0A] rounded-flat p-3 my-4">
                TARGET IDENTIFIER: <span className="font-bold underline">{query}</span>
                <p className="mt-1 text-[#0A0A0A]/70">
                  {t('emptyDesc')}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => onOpenReportModal(query)}
                  className="bg-[#E5201B] text-[#F7F7F2] hover:bg-[#E5201B]/90 px-6 py-3 rounded-flat font-futuristic text-xs font-bold tracking-wider border border-[#0A0A0A] tap-target transition-all flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('reportThisEntity')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
