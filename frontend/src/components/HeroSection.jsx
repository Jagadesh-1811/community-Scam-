'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import LetterGlitch from './LetterGlitch';
import { ShieldAlert } from 'lucide-react';

export default function HeroSection({ onScanClick, onReportClick }) {
  const { t } = useI18n();

  return (
    <section id="home" className="relative w-full border-b border-[#F7F7F2]/15 bg-[#000000] text-[#F7F7F2] overflow-hidden min-h-[640px] sm:min-h-[720px] flex items-center justify-center">
      
      {/* 1. Subtle LetterGlitch cyber static layer in the deep background */}
      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-15 z-0">
        <LetterGlitch
          glitchColors={["#23E000", "#E5201B"]}
          baseColor="#ffffff"
          lightMode={false}
          glitchAmount={0.3}
          speed={0.5}
          flow={0.3}
          clickEffect="none"
          spacing={0.5}
          interactive={false}
          cursorRadius={40}
          density={0.65}
          baseOpacity={0.06}
        />
      </div>

      {/* 2. ROTATING EARTH SET AS THE BACKGROUND */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0 select-none">
        {/* Rotating Earth Orb Container */}
        <div className="relative w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] md:w-[680px] md:h-[680px] lg:w-[780px] lg:h-[780px] flex items-center justify-center opacity-45 sm:opacity-50">
          
          {/* Orbital Radar Dashed Ring 1 */}
          <div className="absolute inset-0 rounded-full border border-dashed border-[#F7F7F2]/20 animate-reverse-rotate"></div>
          
          {/* Orbital Radar Solid Ring 2 */}
          <div className="absolute -inset-8 rounded-full border border-[#23E000]/25 pointer-events-none"></div>

          {/* Sweeping Radar Scanner Line */}
          <div className="absolute inset-0 rounded-full pointer-events-none animate-radar-sweep overflow-hidden">
            <div className="w-1/2 h-1/2 bg-gradient-to-br from-[#23E000]/30 to-transparent origin-bottom-right"></div>
          </div>

          {/* The Earth Image (Rotating continuously) */}
          <div className="w-full h-full rounded-full overflow-hidden shadow-[0_0_120px_rgba(35,224,0,0.18)]">
            <img
              src="/earth.jpg"
              alt="Cyberforge Earth Surveillance Background"
              className="w-full h-full object-cover object-center animate-rotate-earth select-none"
              draggable={false}
            />
          </div>

          {/* Atmospheric Depth Vignette & Radial Edge Fade into Pure Black Background */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_40%,transparent_45%,rgba(0,0,0,0.7)_100%)]"></div>

          {/* Sci-Fi Targeting Crosshair Corners */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#23E000]"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#23E000]"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#23E000]"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#23E000]"></div>
        </div>

        {/* Global radial black vignette overlay to seamlessly melt earth into black canvas */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#000000_75%)]"></div>
      </div>

      {/* 3. Foreground Hero Content Layer (Layered cleanly on top of rotating earth) */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        
        {/* Main Title (Orbitron Font Style) */}
        <h1 
          className="font-futuristic font-black text-3xl sm:text-5xl md:text-6xl text-[#F7F7F2] tracking-wider leading-[1.12] max-w-4xl mb-4 drop-shadow-md uppercase"
          style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
        >
          {t('heroHeading')}
        </h1>

        {/* Subtitle (Monospaced Data) */}
        <p className="font-mono-data text-xs sm:text-sm font-semibold text-[#F7F7F2]/85 tracking-wide max-w-2xl mb-8 leading-relaxed">
          {t('heroSubtitle')}
        </p>

        {/* Action Button: POST REPORT (redirects to /map page) */}
        <div className="flex items-center justify-center w-full sm:w-auto">
          <Link
            href="/map"
            className="w-full sm:w-auto bg-[#E5201B] text-[#F7F7F2] hover:bg-[#E5201B]/90 px-8 py-3.5 rounded-flat font-futuristic text-xs font-bold tracking-wider border border-[#E5201B] tap-target transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-[#F7F7F2]" />
            <span>{t('navReport')}</span>
          </Link>
        </div>

      </div>
    </section>
  );
}

