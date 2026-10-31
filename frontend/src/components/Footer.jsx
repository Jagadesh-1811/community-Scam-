'use client';

import { useI18n } from '@/lib/i18n';

// Geometric Delta / Shield Logo glyph
function DeltaLogo({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L1 21h22L12 2zm0 5.2l6.8 11.8H5.2L12 7.2z" />
    </svg>
  );
}

export default function Footer({ onNavigate }) {
  const { t } = useI18n();

  return (
    <footer className="w-full bg-[#EFEFEA] text-[#1E1E1E] font-mono-data pt-20 pb-12 px-6 sm:px-12 lg:px-20 border-t border-black/10 select-none">
      <div className="max-w-6xl mx-auto">

        {/* Top Section: Brand + Mission (Left) & Platform Navigation Columns (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 items-start pb-16">

          {/* Left Column: Brand Logo, Mission Statement */}
          <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-between space-y-7">

            {/* Brand Logo & Name (Orbitron Font) */}
            <div className="flex items-center gap-2.5 text-[#0A0A0A]">
              <DeltaLogo className="w-6 h-6 text-[#0A0A0A]" />
              <span
                className="font-futuristic font-black text-xl sm:text-2xl tracking-[0.16em] text-[#0A0A0A] uppercase"
                style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
              >
                CYBERFORGE
              </span>
            </div>

            {/* Authentic Tagline / Mission Statement (1-2 lines only) */}
            <p className="font-mono-data text-[#374151] text-xs sm:text-sm leading-relaxed max-w-sm font-medium">
              National scam threat radar safeguarding citizens against digital extortion and fraud.
            </p>

          </div>

          {/* Spacer for large screens */}
          <div className="hidden lg:block lg:col-span-1"></div>

          {/* Right Columns: Website-Related Navigation Links */}
          <div className="md:col-span-6 lg:col-span-6 grid grid-cols-2 gap-8 sm:gap-12 text-xs sm:text-sm font-mono-data">

            {/* Column 1: THREAT INTELLIGENCE & DETECTION */}
            <div className="flex flex-col space-y-3.5 text-[#2B2B2B]">
              <button
                type="button"
                onClick={() => onNavigate?.('live-results')}
                className="text-left hover:text-black transition-colors font-bold cursor-pointer"
              >
                Live Results Feed
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('live-results')}
                className="text-left hover:text-black transition-colors font-bold cursor-pointer"
              >
                Radar Telemetry
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('trust')}
                className="text-left hover:text-black transition-colors font-bold cursor-pointer"
              >
                Privacy Policies
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('trust')}
                className="text-left hover:text-black transition-colors font-bold cursor-pointer"
              >
                Data Governance
              </button>
              <a
                href="#live-results"
                onClick={() => onNavigate?.('live-results')}
                className="hover:text-black transition-colors font-bold cursor-pointer"
              >
                Threat Categories
              </a>
              <button
                type="button"
                onClick={() => onNavigate?.('faq')}
                className="text-left hover:text-black transition-colors font-bold cursor-pointer"
              >
                Threat Defense FAQs
              </button>
            </div>

            {/* Column 2: DEFENSE, CITIZEN REPORTING & ABOUT */}
            <div className="flex flex-col space-y-3.5 text-[#2B2B2B]">
              <button
                type="button"
                onClick={() => onNavigate?.('about')}
                className="text-left hover:text-black transition-colors font-bold cursor-pointer"
              >
                About Cyberforge
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('trust')}
                className="text-left hover:text-black transition-colors font-bold cursor-pointer"
              >
                Submit Fraud Report
              </button>
              <a
                href="tel:1930"
                className="hover:text-black transition-colors font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Helpline 1930</span>
                <span className="text-[10px] bg-[#E5201B] text-white px-1.5 py-0.2 rounded-full font-bold">I4C</span>
              </a>
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-black transition-colors font-bold cursor-pointer"
              >
                Cybercrime Portal
              </a>
              <button
                type="button"
                onClick={() => onNavigate?.('about')}
                className="text-left hover:text-black transition-colors font-bold cursor-pointer"
              >
                Our Defense Mission
              </button>
              <a
                href="mailto:support@cyberforge.gov"
                className="hover:text-black transition-colors font-bold cursor-pointer"
              >
                Incident Center
              </a>
            </div>

          </div>

        </div>

        {/* Crisp Divider Line */}
        <div className="w-full border-t border-black/15 pt-6 pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono-data text-[#4B5563]">

            {/* Authentic Copyright Notice */}
            <div>
              &copy; 2026 Cyberforge. National Cyber Defense Protocol. All rights reserved.
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-6 sm:gap-8 font-bold text-[#4B5563]">
              <a href="#about" onClick={() => onNavigate?.('about')} className="hover:text-black transition-colors">
                Terms of Defense
              </a>
              <a href="#trust" onClick={() => onNavigate?.('trust')} className="hover:text-black transition-colors">
                Privacy Protocol
              </a>
              <a href="#live-results" onClick={() => onNavigate?.('live-results')} className="hover:text-black transition-colors">
                Audit Logs
              </a>
            </div>

          </div>
        </div>

        

      </div>
    </footer>
  );
}
