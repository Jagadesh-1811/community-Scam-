'use client';

import { useState, useEffect } from 'react';
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
    <div className={`flex-1 flex flex-col w-full min-h-screen transition-colors duration-300 ${
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
