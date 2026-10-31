'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import PillNav from './PillNav';
import { Globe, X } from 'lucide-react';

function LinkedInIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function MailIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default function HeaderBar({ currentView = 'home', onSelectView }) {
  const { t, locale, setLocale, languages } = useI18n();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // 5 navigation items in order: HOME, LIVE RESULTS, PRIVACY, ABOUT, FAQS
  const navItems = [
    { id: 'home', label: t('navHome'), href: '#home' },
    { id: 'live-results', label: t('navLiveResults'), href: '#live-results' },
    { id: 'trust', label: t('navTrust'), href: '#trust' },
    { id: 'about', label: t('navAbout'), href: '#about' },
    { id: 'faq', label: t('navFaq'), href: '#faq' }
  ];

  const handleNavClick = (viewId, event) => {
    if (event) event.preventDefault();
    if (onSelectView) onSelectView(viewId);
  };

  return (
    <>
      {/* Sticky Top Bar: CF on Left, Centered PillNav in Middle, Language on Right */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0A0A] border-b border-[#F7F7F2]/15 px-4 py-3 flex items-center justify-between relative min-h-[64px]">

        {/* Left Side: CF Icon (stays in the same place) */}
        <div className="flex items-center gap-3 z-20 shrink-0">
          <button
            type="button"
            onClick={(e) => handleNavClick('home', e)}
            className="w-10 h-10 rounded-full bg-[#18181b] text-[#F7F7F2] flex items-center justify-center font-futuristic font-black text-sm border border-[#F7F7F2]/20 hover:scale-105 transition-transform shadow-sm cursor-pointer"
            aria-label="Cyberforge Home"
          >
            CF
          </button>
        </div>

        {/* Center: PillNav Strictly in the Middle with 4 Items: HOME, LIVE RESULTS, TRUST, ABOUT */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 items-center justify-center z-10 font-futuristic text-xs font-bold tracking-wider">
          <PillNav
            items={navItems}
            activeHref={`#${currentView}`}
            itemStyle="pill"
            hoverEffect="fill"
            indicator="dot"
            theme="dark"
            layout="split"
            size="md"
            onItemClick={(item, index, event) => handleNavClick(item.id, event)}
          />
        </div>

        {/* Right Side: Multi-Lingual Switcher & Mobile Trigger */}
        <div className="flex items-center gap-2 z-20 shrink-0">


          <div className="flex items-center bg-[#18181b] border border-[#F7F7F2]/20 rounded-full px-2.5 py-1 text-xs font-mono-data">
            <Globe className="w-3.5 h-3.5 mr-1 text-[#F7F7F2]/80" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="bg-transparent text-[#F7F7F2] font-bold focus:outline-none cursor-pointer pr-1"
              aria-label="Select Language"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#18181b] text-[#F7F7F2]">
                  {lang.short}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden bg-[#E5201B] text-[#F7F7F2] px-3 py-1.5 rounded-full font-futuristic text-[11px] font-bold tracking-wider border border-[#E5201B] tap-target flex items-center justify-center cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            {t('openMenu')}
          </button>
        </div>
      </header>

      {/* Slide-out Full Curtain Menu (Mobile Drawer) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0A0A0A]/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full sm:w-[360px] h-full bg-[#F7F7F2] border-l border-[#0A0A0A] flex flex-col justify-between p-6 shadow-2xl overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Top Bar with CF Logo + Dark Red Pill CLOSE button */}
            <div>
              <div className="flex items-center justify-between pb-8">
                <div className="w-11 h-11 rounded-full bg-[#E5201B] text-[#F7F7F2] flex items-center justify-center font-futuristic font-black text-xl border border-[#0A0A0A]">
                  CF
                </div>

                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="bg-[#E5201B] text-[#F7F7F2] hover:bg-[#E5201B]/90 px-6 py-2 rounded-full font-futuristic text-xs font-bold tracking-widest border border-[#0A0A0A] transition-all tap-target flex items-center justify-center cursor-pointer"
                  aria-label="Close menu"
                >
                  {t('closeMenu')}
                </button>
              </div>

              {/* Bold Navigation Links: HOME, LIVE RESULTS, TRUST, ABOUT */}
              <nav className="flex flex-col space-y-4 pt-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      handleNavClick(item.id);
                    }}
                    className="text-left font-futuristic font-black text-2xl sm:text-3xl tracking-tight text-[#0A0A0A] hover:text-[#E5201B] transition-colors py-1 flex items-center justify-between cursor-pointer"
                  >
                    <span>{item.label}</span>
                    {currentView === item.id && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#23E000] border border-[#0A0A0A]"></span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Horizontal Divider Line */}
              <div className="my-8 border-t border-[#0A0A0A] w-full" />

              {/* SOCIALS Subheader */}
              <div>
                <span className="font-futuristic font-bold text-xs tracking-widest text-[#E5201B] uppercase block mb-4">
                  {t('socials')}
                </span>

                <div className="flex flex-col space-y-3 font-mono-data text-sm font-bold text-[#0A0A0A]">
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-[#E5201B] transition-colors tap-target py-1"
                  >
                    <LinkedInIcon className="w-4 h-4 text-[#0A0A0A]" />
                    <span>LinkedIn</span>
                  </a>

                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-[#E5201B] transition-colors tap-target py-1"
                  >
                    <GitHubIcon className="w-4 h-4 text-[#0A0A0A]" />
                    <span>GitHub</span>
                  </a>

                  <a
                    href="mailto:intel@cyberforge.gov"
                    className="flex items-center gap-3 hover:text-[#E5201B] transition-colors tap-target py-1"
                  >
                    <MailIcon className="w-4 h-4 text-[#0A0A0A]" />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Status */}
            <div className="pt-8 border-t border-[#0A0A0A]/20 mt-6 font-mono-data text-xs text-[#0A0A0A]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#23E000] animate-ping"></span>
                <span className="font-bold">RADAR SENSORS: ONLINE</span>
              </div>
              <p className="font-serif-filler italic text-xs text-[#0A0A0A]/60 mt-1">
                {t('latinFiller')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
