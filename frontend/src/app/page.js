'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, ShieldAlert, PhoneCall } from 'lucide-react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import HeaderBar from '@/components/HeaderBar';
import HeroSection from '@/components/HeroSection';
import LiveResults from '@/components/LiveResults';
import TrustView from '@/components/TrustView';
import FAQSection from '@/components/FAQSection';
import AboutSection from '@/components/AboutSection';
import CTASection from '@/components/CTASection';
import ReportModal from '@/components/ReportModal';
import Footer from '@/components/Footer';

function CyberforgeContent() {
  const { t } = useI18n();
  // Active section tracked via scroll & nav clicks: 'home' | 'live-results' | 'trust' | 'about' | 'faq' | 'cta'
  const [currentView, setCurrentView] = useState('home');
  const [theme, setTheme] = useState('dark');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState('');

  // Synchronize theme with localStorage and document
  useEffect(() => {
    const savedTheme = localStorage.getItem('cyberforge_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('cyberforge_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Smooth scroll to target section when clicking nav items
  const scrollToView = (viewKey) => {
    setCurrentView(viewKey);
    const element = document.getElementById(viewKey);
    if (element) {
      const yOffset = -70; // Header height offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Scroll spy to update active nav indicator as user scrolls through sections
  useEffect(() => {
    const sectionIds = ['home', 'live-results', 'trust', 'about', 'faq', 'cta'];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setCurrentView(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openReport = (identifier = '') => {
    setReportTarget(identifier);
    setReportModalOpen(true);
  };

  const handleScanClick = () => {
    scrollToView('trust');
  };

  return (
    <div className={`flex-1 flex flex-col w-full min-h-screen transition-colors duration-300 pb-16 md:pb-0 ${
      theme === 'dark' ? 'bg-[#000000] text-[#F7F7F2]' : 'bg-[#F7F7F2] text-[#0A0A0A]'
    }`}>
      {/* Top Header Bar with Centered 5-Button PillNav + Bulb Icon + Language Selector */}
      <HeaderBar
        currentView={currentView}
        onSelectView={(viewKey) => scrollToView(viewKey)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Page: All sections rendered sequentially in order */}
      <main className="flex-1 flex flex-col w-full">
        {/* 1. LANDING PAGE (Hero with Rotating Earth on Pure Black Theme) */}
        <section id="home" className="w-full scroll-mt-16">
          <HeroSection
            onScanClick={handleScanClick}
            onReportClick={() => openReport()}
          />
        </section>

        {/* 2. LIVE RESULTS (Real-time Threat Stream & Incident Intercepts) */}
        <section id="live-results" className={`w-full py-14 border-t transition-colors duration-300 scroll-mt-16 ${
          theme === 'dark' ? 'bg-[#080808] border-[#F7F7F2]/15 text-[#F7F7F2]' : 'bg-[#F7F7F2] border-[#0A0A0A]/10 text-[#0A0A0A]'
        }`}>
          <LiveResults
            onInspectThreat={(ident) => openReport(ident)}
            theme={theme}
          />
        </section>

        {/* 3. TRUST / PRIVACY (Zero-Knowledge Privacy Charter & DPDP Compliance) */}
        <section id="trust" className="w-full bg-[#F7F7F2] py-14 border-t border-[#0A0A0A]/10 scroll-mt-16 text-[#0A0A0A]">
          <TrustView theme={theme} />
        </section>

        {/* 4. ABOUT (About Cyberforge Tool - Ordered before FAQ's) */}
        <section id="about" className={`w-full py-16 border-t transition-colors duration-300 scroll-mt-16 ${
          theme === 'dark' ? 'bg-[#000000] border-[#F7F7F2]/15 text-[#F7F7F2]' : 'bg-[#F7F7F2] border-[#0A0A0A]/10 text-[#0A0A0A]'
        }`}>
          <AboutSection theme={theme} />
        </section>

        {/* 5. FAQS (Frequently Asked Questions - Top 4 Single-Line Q&As) */}
        <section id="faq" className={`w-full py-14 border-t transition-colors duration-300 scroll-mt-16 ${
          theme === 'dark' ? 'bg-[#0a0a0d] border-[#F7F7F2]/15 text-[#F7F7F2]' : 'bg-[#F7F7F2] border-[#0A0A0A]/10 text-[#0A0A0A]'
        }`}>
          <FAQSection theme={theme} />
        </section>

        {/* 6. CTA (Call To Action - Just after FAQ's section) */}
        <section id="cta" className={`w-full py-16 border-t transition-colors duration-300 scroll-mt-16 ${
          theme === 'dark' ? 'bg-[#050507] border-[#F7F7F2]/15 text-[#F7F7F2]' : 'bg-[#F0F0EB] border-[#0A0A0A]/10 text-[#0A0A0A]'
        }`}>
          <CTASection onReportClick={() => openReport()} theme={theme} />
        </section>
      </main>

      {/* Footer matching uploaded design */}
      <Footer onNavigate={(view) => scrollToView(view)} />

      {/* ── Mobile PWA Sticky Bottom Quick Action Bar ── */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A0A0A] border-t-2 border-[#23E000]/40 px-3 py-2 flex items-center justify-between gap-2 shadow-2xl"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Link
          href="/map"
          className="flex-1 min-h-[42px] px-3 rounded-[10px] bg-[#141414] border border-[#23E000]/40 text-[#23E000] flex items-center justify-center gap-1.5 text-xs font-futuristic font-black uppercase tracking-wider hover:bg-[#23E000] hover:text-[#0A0A0A] transition"
        >
          <Compass className="w-4 h-4 animate-spin-slow" />
          <span>Threat Radar</span>
        </Link>

        <button
          onClick={() => openReport()}
          className="flex-1 min-h-[42px] px-3 rounded-[10px] bg-[#E5201B] border border-[#E5201B] text-[#F7F7F2] flex items-center justify-center gap-1.5 text-xs font-futuristic font-black uppercase tracking-wider hover:bg-white hover:text-[#E5201B] transition shadow-md cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Report Scam</span>
        </button>

        <a
          href="tel:1930"
          className="min-h-[42px] px-3 rounded-[10px] bg-[#141414] border border-[#E5201B] text-[#E5201B] flex items-center justify-center gap-1 text-xs font-mono font-black uppercase hover:bg-[#E5201B] hover:text-[#F7F7F2] transition"
          title="Emergency Cyber Crime Helpline 1930"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>1930</span>
        </a>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        initialIdentifier={reportTarget}
        onReportSuccess={() => { }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <CyberforgeContent />
    </I18nProvider>
  );
}
