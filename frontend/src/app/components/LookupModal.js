"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Building2,
  X,
  Phone,
  QrCode,
  Globe,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

export default function LookupModal({ isOpen, onClose, apiBaseUrl }) {
  const [type, setType] = useState("phone");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setValue("");
      setResult(null);
      setError("");
      setLoading(false);
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Auto-detect identifier type if user pastes something distinct
  const handleInputChange = (val) => {
    setValue(val);
    if (error) setError("");

    const trimmed = val.trim();
    if (trimmed.includes("@") && !trimmed.startsWith("http")) {
      setType("upi");
    } else if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.includes(".com") ||
      trimmed.includes(".in")
    ) {
      setType("url");
    } else if (/^[A-Za-z]{2}-[A-Za-z0-9]+$/.test(trimmed) || /^[A-Z]{6}$/.test(trimmed)) {
      setType("sms_header");
    }
  };

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const cleanVal = value.trim();
    if (!cleanVal) {
      setError("Please enter a phone number, UPI ID, link, or sender header.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      // Map UI type to backend API expectations
      const backendType = type === "sms_header" ? "sender_id" : type;
      const baseUrl = apiBaseUrl || "http://localhost:8000";

      const res = await fetch(
        `${baseUrl}/lookup?type=${encodeURIComponent(backendType)}&value=${encodeURIComponent(cleanVal)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Lookup format rejected. Please check the identifier.");
      } else {
        setResult(data);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setError("Lookup timed out. Please try again.");
      } else {
        setError("Unable to reach verification engine. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getVerdictDetails = (verdict) => {
    switch (verdict) {
      case "KNOWN_SCAM":
        return {
          icon: <ShieldAlert className="w-5 h-5 text-[#E5201B]" />,
          bg: "bg-[rgba(229,32,27,0.08)] border-[#E5201B]",
          badgeBg: "bg-[#E5201B] text-[#F7F7F2]",
          title: "CONFIRMED FRAUD THREAT",
          desc: "Matched against verified scam patterns by the community trust engine.",
          isScam: true,
        };
      case "SUSPICIOUS":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-[#0A0A0A]" />,
          bg: "bg-[rgba(229,32,27,0.04)] border-[#0A0A0A]",
          badgeBg: "bg-[#0A0A0A] text-[#F7F7F2]",
          title: "SUSPICIOUS ACTIVITY",
          desc: "Under review with preliminary reports from independent citizens.",
          isSuspicious: true,
        };
      case "VERIFIED_BUSINESS":
        return {
          icon: <ShieldCheck className="w-5 h-5 text-[#0A0A0A]" />,
          bg: "bg-[#23E000]/15 border-[#0A0A0A]",
          badgeBg: "bg-[#23E000] text-[#0A0A0A] border border-[#0A0A0A]",
          title: "VERIFIED OFFICIAL ENTITY",
          desc: "Officially registered national helpline, bank desk, or government utility.",
          isSafe: true,
        };
      default:
        return {
          icon: <CheckCircle className="w-5 h-5 text-[#0A0A0A]" />,
          bg: "bg-[rgba(10,10,10,0.03)] border-[#0A0A0A]",
          badgeBg: "bg-[#F7F7F2] text-[#0A0A0A] border border-[#0A0A0A]",
          title: "NO REPORTS RECORDED",
          desc: "Zero fraud reports found in the community database for this identifier.",
        };
    }
  };

  const badge = result ? getVerdictDetails(result.verdict) : null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150 animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-[#F7F7F2] border border-[#0A0A0A] rounded-[12px] p-6 text-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#0A0A0A]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">
                Instant Scam Radar Lookup
              </h2>
              <p className="text-[11px] opacity-70">
                Check phone, UPI ID, or URL against national registry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="w-10 h-10 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { id: "phone", label: "Phone", icon: <Phone className="w-3.5 h-3.5" /> },
            { id: "upi", label: "UPI", icon: <QrCode className="w-3.5 h-3.5" /> },
            { id: "url", label: "Link", icon: <Globe className="w-3.5 h-3.5" /> },
            { id: "sms_header", label: "Header", icon: <MessageSquare className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setType(t.id);
                setError("");
              }}
              className={`min-h-[44px] px-2 py-2 text-xs font-bold uppercase rounded-[8px] border border-[#0A0A0A] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                type === t.id
                  ? "bg-[#0A0A0A] text-[#F7F7F2]"
                  : "bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[rgba(10,10,10,0.06)]"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleLookup} className="mt-3 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={
                type === "phone"
                  ? "+91 98765 43210 or 1930"
                  : type === "upi"
                  ? "scammer@okaxis or name@sbi"
                  : type === "url"
                  ? "https://sbi-kyc-update.xyz"
                  : "AX-HDFCBK or VM-SBIINB"
              }
              className="flex-1 min-h-[48px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-4 text-sm text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            />
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="min-h-[48px] px-6 bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#F7F7F2]/30 border-t-[#F7F7F2] rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <span>Lookup</span>
              )}
            </button>
          </div>
        </form>

        {/* Error notification */}
        {error && (
          <div className="mt-3 p-3 bg-[rgba(229,32,27,0.1)] border border-[#E5201B] rounded-[8px] text-xs font-bold text-[#E5201B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Presentation */}
        {result && badge && (
          <div className={`mt-4 p-4 rounded-[10px] border ${badge.bg} space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {badge.icon}
                <span className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                  {badge.title}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase ${badge.badgeBg}`}>
                {result.verdict}
              </span>
            </div>

            <p className="text-xs opacity-85 leading-relaxed">{badge.desc}</p>

            {/* Evidence & Metrics Grid */}
            <div className="pt-2 border-t border-[#0A0A0A]/20 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2]">
                <span className="opacity-65 text-[10px] uppercase font-bold block">Masked Entity</span>
                <span className="font-mono font-bold text-xs">{result.display_value || value}</span>
              </div>
              <div className="p-2 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2]">
                <span className="opacity-65 text-[10px] uppercase font-bold block">Pattern Category</span>
                <span className="font-bold text-xs capitalize text-[#E5201B]">{result.scam_type || "No pattern"}</span>
              </div>
              <div className="p-2 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2]">
                <span className="opacity-65 text-[10px] uppercase font-bold block">Community Reports</span>
                <span className="font-bold text-xs">{result.report_count ?? 0}</span>
              </div>
              <div className="p-2 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2]">
                <span className="opacity-65 text-[10px] uppercase font-bold block">Distinct Reporters</span>
                <span className="font-bold text-xs">{result.distinct_reporters ?? 0}</span>
              </div>
            </div>

            {/* Verified Owner Badge if Official Entity */}
            {result.verified_name && (
              <div className="p-2.5 bg-[#23E000] text-[#0A0A0A] rounded-[6px] border border-[#0A0A0A] flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>{result.verified_name}</span>
                </div>
                <span className="text-[10px] uppercase px-1.5 py-0.5 bg-[#0A0A0A] text-[#F7F7F2] rounded-[4px]">
                  {result.category}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}