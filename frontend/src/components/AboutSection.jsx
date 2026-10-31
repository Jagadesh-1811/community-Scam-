'use client';

export default function AboutSection({ theme = 'dark' }) {
  return (
    <section id="about" className="w-full max-w-4xl mx-auto px-4 py-12 sm:py-16 text-left select-none">
      
      {/* Section Header */}
      <div className="mb-6">
        <h2
          className="font-futuristic font-black text-2xl sm:text-3xl tracking-wide uppercase leading-tight"
          style={{ fontFamily: "var(--font-orbitron), 'Orbitron', system-ui, sans-serif" }}
        >
          ABOUT CYBERFORGE
        </h2>
      </div>

      {/* About Tool Data: Elegantly Aligned Continuous 3-Line Presentation */}
      <div className="border-l-2 border-[#23E000] pl-4 sm:pl-5 py-1.5 max-w-3xl">
        <p className="font-mono-data text-xs sm:text-sm md:text-base leading-relaxed opacity-90 text-left">
          Cyberforge is India&apos;s autonomous scam threat radar engineered to detect and intercept digital extortion vectors in real time. Built on neural AI heuristics, the tool cross-references telecom SIM-box nodes and fraudulent payment handles with sub-second accuracy. Operating under a zero-knowledge architecture, it coordinates directly with the 1930 I4C framework to freeze mule accounts nationwide.
        </p>
      </div>

    </section>
  );
}
