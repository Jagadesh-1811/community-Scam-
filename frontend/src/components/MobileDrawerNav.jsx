'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { ShieldAlert, Globe } from 'lucide-react';

// Crisp, lightweight inline icons for Socials
function LinkedInIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
    </svg>
  );
}

function MailIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

export default function MobileDrawerNav({ onNavigate, activeSection = 'home' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, locale, setLocale, languages } = useI18n();

  const navLinks = [
    { id: 'home', label: t('navHome') },
    { id: 'radar', label: t('navExperience') },
    { id: 'verify', label: t('navProjects') },
    { id: 'threats', label: t('navSkills') },
    { id: 'about', label: t('navAbout') },
    { id: 'contact', label: t('navContact') },
  ];

  const handleLinkClick = (id) => {
    setIsOpen(false);
    if (onNavigate) onNavigate(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-[#F7F7F2] border-b border-[#0A0A0A] px-4 py-3 flex items-center justify-between">
        {/* Brand Monogram Badge (Matching Reference Screenshot circle) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0A0A0A] text-[#F7F7F2] flex items-center justify-center font-futuristic font-black text-lg border border-[#0A0A0A]">
            CF
          </div>
          <div className="hidden min-[400px]:block">
            <span className="font-futuristic font-bold text-sm tracking-widest block text-[#0A0A0A]">
              CYBERFORGE
            </span>
            <span className="font-mono-data text-[10px] text-[#0A0A0A]/60 block leading-none">
              DEFENSE RADAR
            </span>
          </div>
        </div>

        {/* Right Action: Language Quick Switcher & Open Menu Button */}
        <div className="flex items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="relative flex items-center bg-[#F7F7F2] border border-[#0A0A0A] rounded-flat px-2 py-1 text-xs font-mono-data tap-target">
            <Globe className="w-3.5 h-3.5 mr-1 text-[#0A0A0A]" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="bg-transparent text-[#0A0A0A] font-bold focus:outline-none cursor-pointer pr-1"
              aria-label="Select Language"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#F7F7F2] text-[#0A0A0A]">
                  {lang.short}
                </option>
              ))}
            </select>
          </div>

          {/* Menu Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="bg-[#0A0A0A] text-[#F7F7F2] px-4 py-2 rounded-full font-futuristic text-xs font-bold tracking-wider border border-[#0A0A0A] hover:opacity-90 transition-opacity tap-target flex items-center justify-center"
            aria-label="Open Navigation Menu"
          >
            {t('openMenu')}
          </button>
        </div>
      </header>

      {/* Slide-out Full Screen / Curtain Menu (Direct Reference to Uploaded Image) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0A0A0A]/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="w-full sm:w-[360px] h-full bg-[#F7F7F2] border-l border-[#0A0A0A] flex flex-col justify-between p-6 shadow-2xl overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Top: Logo + Red Pill CLOSE button (Exact Match to Reference Image) */}
            <div>
              <div className="flex items-center justify-between pb-8">
                {/* Round Brand Icon */}
                <div className="w-11 h-11 rounded-full bg-[#E5201B] text-[#F7F7F2] flex items-center justify-center font-futuristic font-black text-xl border border-[#0A0A0A]">
                  CF
                </div>

                {/* Dark Red Pill CLOSE Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-[#E5201B] text-[#F7F7F2] hover:bg-[#E5201B]/90 px-6 py-2 rounded-full font-futuristic text-xs font-bold tracking-widest border border-[#0A0A0A] transition-all tap-target flex items-center justify-center"
                  aria-label="Close menu"
                >
                  {t('closeMenu')}
                </button>
              </div>

              {/* Bold Uppercase Navigation Links (Matching Reference Image) */}
              <nav className="flex flex-col space-y-4 pt-2">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => handleLinkClick(link.id)}
                    className="text-left font-futuristic font-black text-2xl sm:text-3xl tracking-tight text-[#0A0A0A] hover:text-[#E5201B] transition-colors py-1 flex items-center justify-between group"
                  >
                    <span>{link.label}</span>
                    {activeSection === link.id && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#23E000] border border-[#0A0A0A]"></span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Solid Horizontal Divider Line (Matching Reference Image) */}
              <div className="my-8 border-t border-[#0A0A0A] w-full" />

              {/* SOCIALS Subheader in Red (Matching Reference Image) */}
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

            {/* Bottom System Status Badge */}
            <div className="pt-8 border-t border-[#0A0A0A]/20 mt-6">
              <div className="flex items-center gap-2 font-mono-data text-xs text-[#0A0A0A]">
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
