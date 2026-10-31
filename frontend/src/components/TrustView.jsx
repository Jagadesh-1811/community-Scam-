'use client';

import ScrollStack, { ScrollStackItem } from './ScrollStack';
import { EyeOff, Server, Lock, ShieldCheck, FileCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function TrustView({ theme = 'dark' }) {
  // Each policy contains strictly a single-line answer
  const policies = [
    {
      id: "dpdp-01",
      icon: EyeOff,
      title: "ZERO-KNOWLEDGE QUERY HASHING",
      code: "DPDP-01",
      line: "All queries are SHA-256 hashed client-side and never stored on persistent disks."
    },
    {
      id: "dpdp-02",
      icon: Server,
      title: "EPHEMERAL VOLATILE MEMORY",
      code: "DPDP-02",
      line: "Telemetry runs strictly in volatile RAM and is completely purged within 250 milliseconds."
    },
    {
      id: "dpdp-03",
      icon: Lock,
      title: "NO COMMERCIAL PROFILING",
      code: "DPDP-03",
      line: "Zero user tracking cookies, ad networks, or commercial monetization of citizen searches."
    },
    {
      id: "dpdp-04",
      icon: ShieldCheck,
      title: "LAWFUL I4C ESCALATION ONLY",
      code: "DPDP-04",
      line: "Confirmed extortion vectors are relayed to 1930 / I4C while shielding reporter anonymity."
    },
    {
      id: "dpdp-05",
      icon: FileCheck,
      title: "SOVEREIGN INDIAN DATA RESIDENCY",
      code: "DPDP-05",
      line: "All AI sentinel models and threat databases reside within Indian sovereign data centers."
    },
    {
      id: "dpdp-06",
      icon: RefreshCw,
      title: "CITIZEN RECORD REDRESSAL",
      code: "DPDP-06",
      line: "Falsely spoofed benign entities are verified and immediately scrubbed from the active radar."
    }
  ];

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-8 text-left select-none">
      
      {/* Header */}
      <div className="mb-4">
        

        <h2
          className="font-futuristic font-black text-2xl sm:text-3xl tracking-tight uppercase leading-snug"
          style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
        >
          PRIVACY POLICIES &amp; DATA GOVERNANCE
        </h2>

        
      </div>

      {/* Interactive ScrollStack (No outer border box, hidden scrollbar) */}
      <div className="w-full h-[360px] sm:h-[380px] my-2 overflow-hidden">
        <ScrollStack
          itemDistance={65}
          itemStackDistance={18}
          stackPosition="8%"
          itemScale={0.035}
          baseScale={0.9}
          dimAmount={0.12}
          holdDistance={120}
        >
          {policies.map((policy) => {
            const Icon = policy.icon;
            return (
              <ScrollStackItem
                key={policy.id}
                itemClassName={`border transition-all select-none ${
                  theme === 'dark'
                    ? 'bg-[#141418] border-[#F7F7F2]/25 text-[#F7F7F2]'
                    : 'bg-white border-[#0A0A0A] text-[#0A0A0A]'
                }`}
                style={{
                  minHeight: '120px',
                  padding: '1.1rem 1.4rem',
                  borderRadius: '16px'
                }}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-3 mb-2 border-b border-current/10 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#23E000] text-[#0A0A0A] flex items-center justify-center font-bold shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#0A0A0A]" />
                    </div>
                    <h3
                      className="font-futuristic font-bold text-xs sm:text-sm uppercase tracking-wide truncate"
                      style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
                    >
                      {policy.title}
                    </h3>
                  </div>

                  <span className="font-mono-data text-[10px] font-bold px-2 py-0.5 rounded bg-current/10 shrink-0">
                    {policy.code}
                  </span>
                </div>

                {/* Card Data: Strictly Single-Line Answer */}
                <p className="font-mono-data text-xs sm:text-[13px] leading-normal opacity-90 my-2 truncate sm:whitespace-normal">
                  {policy.line}
                </p>

                {/* Enforcement Indicator */}
                <div className="pt-1.5 border-t border-current/10 flex items-center gap-1.5 font-mono-data text-[10px] text-[#23E000] font-bold">
                  

                </div>
              </ScrollStackItem>
            );
          })}
        </ScrollStack>
      </div>

    </section>
  );
}
