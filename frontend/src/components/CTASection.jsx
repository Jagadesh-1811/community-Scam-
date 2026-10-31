'use client';

import Link from 'next/link';
import { Radio } from 'lucide-react';

export default function CTASection({ onReportClick, theme = 'dark' }) {
  return (
    <section id="cta" className="w-full max-w-4xl mx-auto px-4 py-16 sm:py-20 text-center select-none">
      
      {/* Container Box: Soft white background */}
      <div className={`rounded-flat border p-8 sm:p-12 transition-all ${
        theme === 'dark'
          ? 'bg-[#141418] border-[#F7F7F2]/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
          : 'bg-[#F7F7F2] border-[#0A0A0A] shadow-[0_20px_50px_rgba(0,0,0,0.06)]'
      }`}>

        {/* Main Title (Orbitron Font) */}
        <h2
          className="font-futuristic font-black text-2xl sm:text-4xl lg:text-4xl tracking-wide uppercase leading-tight mb-6"
          style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
        >
          DEFEND YOUR DIGITAL ASSETS TODAY
        </h2>

        {/* Action Button: RADAR MAP -> linking to internal ScamMap page */}
        <div className="flex items-center justify-center">
          <Link
            href="/map"
            className={`w-full sm:w-auto px-8 py-3.5 rounded-flat font-futuristic text-xs font-bold tracking-wider border tap-target transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer group ${
              theme === 'dark'
                ? 'bg-[#141418] text-[#F7F7F2] border-[#F7F7F2]/40 hover:bg-[#1e1e24]'
                : 'bg-[#F7F7F2] text-[#0A0A0A] border-[#0A0A0A] hover:bg-white'
            }`}
          >
            <Radio className="w-4 h-4 text-current group-hover:animate-pulse" />
            <span>RADAR MAP &rarr;</span>
          </Link>
        </div>

      </div>

    </section>
  );
}
