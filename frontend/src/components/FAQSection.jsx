'use client';

import { useState } from 'react';
import { ChevronDown, PhoneCall } from 'lucide-react';

export default function FAQSection({ theme = 'dark' }) {
  const [openIndex, setOpenIndex] = useState(0);

  // Top 4 best questions: Single-line short questions & single-line answers
  const faqs = [
    {
      id: 1,
      question: "What is a 'Digital Arrest' scam and what should I do?",
      answer: "Police and agencies never interrogate or arrest citizens over video calls; disconnect immediately and report to 1930.",
      tag: "CRITICAL"
    },
    {
      id: 2,
      
      question: "How does Cyberforge identify fake UPI IDs and mule accounts?",
      answer: "Our AI sentinel cross-references handles against national FIR registries to flag mule rings before funds leave your account.",
      tag: "AI DEFENSE"
    },
    {
      id: 3,
     
      question: "Does Cyberforge share threat intelligence directly with I4C?",
      answer: "Yes, verified extortion vectors are relayed instantly to 1930 authorities and bank nodal desks to accelerate account freezes.",
      tag: "1930 SYNC"
    },
    {
      id: 4,
  
      question: "Is my personal identity or search query logged on Cyberforge?",
      answer: "No, all scans are SHA-256 hashed and processed in volatile RAM buffers without recording personal citizen credentials.",
      tag: "ZERO LOGS"
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex((prev) => (prev === index ? -1 : index));
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-12 sm:py-16 text-left select-none">
      
      {/* Section Header */}
      <div className="mb-6">
        <h2
          className="font-futuristic font-black text-2xl sm:text-3xl tracking-wide uppercase leading-tight"
          style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
        >
          FREQUENTLY ASKED QUESTIONS
        </h2>
      </div>

      {/* Accordion List (Top 4 Questions Only) */}
      <div className="space-y-3 font-mono-data">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={faq.id}
              className={`border rounded-flat transition-all duration-200 overflow-hidden ${
                isOpen
                  ? theme === 'dark'
                    ? 'border-[#23E000]/50 bg-[#121215] shadow-md'
                    : 'border-[#0A0A0A] bg-white shadow-md'
                  : theme === 'dark'
                  ? 'border-[#F7F7F2]/15 bg-[#0e0e11] hover:border-[#F7F7F2]/30'
                  : 'border-[#0A0A0A]/15 bg-white/60 hover:border-[#0A0A0A]/40'
              }`}
            >
              {/* Question Header: Single Line */}
              <button
                type="button"
                onClick={() => toggleFAQ(index)}
                className="w-full p-4 sm:p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex-1 flex items-center gap-2 sm:gap-3">
                  <h3
                    className="font-futuristic font-bold text-xs sm:text-sm tracking-wide leading-snug truncate"
                    style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
                  >
                    {faq.question}
                  </h3>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-[#23E000] text-[#0A0A0A] border-[#23E000]' : 'border-current/20 bg-current/5'
                  }`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Answer Content: Single Line */}
              {isOpen && (
                <div className="px-4 pb-4 sm:px-4.5 sm:pb-4.5 text-xs sm:text-sm leading-normal opacity-90 border-t border-current/10 pt-2.5">
                  <p className="truncate sm:whitespace-normal">{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Emergency Contact Banner */}
    

    </section>
  );
}
