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
  Lock,
  Calendar,
  MapPin,
  IndianRupee,
  Paperclip,
  Shield,
  Info,
  UserCheck,
} from "lucide-react";

export default function LookupModal({ isOpen, onClose, apiBaseUrl, onOpenDispute }) {
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
          bg: "bg-[rgba(229,32,27,0.06)] border-[#E5201B]",
          badgeBg: "bg-[#E5201B] text-[#F7F7F2]",
          title: "CONFIRMED FRAUD THREAT",
          desc: "Matched against verified scam patterns confirmed by multiple independent citizens.",
          isScam: true,
        };
      case "SUSPICIOUS":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-[#0A0A0A]" />,
          bg: "bg-[rgba(229,32,27,0.04)] border-[#0A0A0A]",
          badgeBg: "bg-[#0A0A0A] text-[#F7F7F2]",
          title: "SUSPICIOUS ACTIVITY",
          desc: "Under review with preliminary citizen reports. Proceed with extreme caution.",
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

  const formatScamType = (t) => {
    if (!t) return "Unspecified Threat";
    return t
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Recently reported";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getSafetyAdvice = (scamType) => {
    const st = (scamType || "").toLowerCase();
    if (st.includes("arrest") || st.includes("police") || st.includes("cbi")) {
      return "Official police, CBI, and customs never conduct digital arrests, video hearings, or demand bail via WhatsApp/Skype. Disconnect immediately and dial 1930.";
    }
    if (st.includes("electri") || st.includes("bill") || st.includes("power")) {
      return "Electricity boards never send personal disconnection threats via WhatsApp or personal mobile numbers. Always pay solely through official state utility portals.";
    }
    if (st.includes("job") || st.includes("task") || st.includes("part-time")) {
      return "Never pay deposit money to 'unlock tasks' or earn daily returns. Genuine companies will never charge candidates for employment or training.";
    }
    if (st.includes("kyc") || st.includes("bank") || st.includes("sbi") || st.includes("hdfc")) {
      return "Banks never require customers to update KYC via third-party SMS links or APK file downloads. Visit your bank branch or use the official mobile banking app.";
    }
    if (st.includes("loan") || st.includes("instant")) {
      return "Avoid unauthorized loan apps requesting camera, contact, and gallery permissions. Check RBI's registered NBFC list before applying.";
    }
    if (st.includes("sextortion") || st.includes("video")) {
      return "Do not transfer money or negotiate with blackmailers. Block the caller, preserve screenshots as evidence, and report directly on cybercrime.gov.in.";
    }
    return "Never share OTPs, PINs, or passwords. Do not click unverified links or authorize incoming UPI collect requests.";
  };

  const badge = result ? getVerdictDetails(result.verdict) : null;
  const isMasked = result && result.distinct_reporters < 3 && result.verdict !== "VERIFIED_BUSINESS";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150 animate-fadeIn"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-[#F7F7F2] border border-[#0A0A0A] rounded-[12px] p-5 sm:p-6 text-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">
                Instant Scam Radar Lookup
              </h2>
              <p className="text-[11px] opacity-70">
                Verify phone number, UPI ID, or URL against national threat registry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="w-10 h-10 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 pt-3">
          {/* Tab Selection */}
          <div className="grid grid-cols-4 gap-2">
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
          <form onSubmit={handleLookup} className="space-y-3">
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
            <div className="p-3 bg-[rgba(229,32,27,0.1)] border border-[#E5201B] rounded-[8px] text-xs font-bold text-[#E5201B] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Presentation */}
          {result && badge && (
            <div className={`p-4 rounded-[10px] border ${badge.bg} space-y-4`}>
              {/* Verdict Header */}
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
                <div className="p-2.5 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2]">
                  <div className="flex items-center justify-between">
                    <span className="opacity-65 text-[10px] uppercase font-bold block">Queried Entity</span>
                    {isMasked ? (
                      <span className="text-[10px] bg-[#0A0A0A]/10 px-1 py-0.2 rounded flex items-center gap-1 font-mono">
                        <Lock className="w-2.5 h-2.5 text-[#0A0A0A]" /> Masked
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#23E000]/25 text-[#0A0A0A] font-bold px-1 py-0.2 rounded flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" /> Unmasked
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-xs mt-1 block">
                    {result.display_value || value}
                  </span>
                  {isMasked && (
                    <span className="text-[10px] opacity-60 mt-0.5 block leading-tight">
                      Masked until ≥ 3 independent reports to prevent retaliatory harassment.
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2]">
                  <span className="opacity-65 text-[10px] uppercase font-bold block">Top Pattern Category</span>
                  <span className="font-bold text-xs capitalize text-[#E5201B] mt-1 block">
                    {formatScamType(result.scam_type)}
                  </span>
                  <span className="text-[10px] opacity-60 mt-0.5 block leading-tight">
                    {result.scam_type ? "Verified threat taxonomy classification" : "No threat pattern detected"}
                  </span>
                </div>

                <div className="p-2.5 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2]">
                  <span className="opacity-65 text-[10px] uppercase font-bold block">Total Citizen Reports</span>
                  <span className="font-bold text-sm mt-1 block">{result.report_count ?? 0}</span>
                  <span className="text-[10px] opacity-60 mt-0.5 block leading-tight">
                    Filtered across trust rules & deduplication
                  </span>
                </div>

                <div className="p-2.5 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2]">
                  <span className="opacity-65 text-[10px] uppercase font-bold block">Distinct Independent Citizens</span>
                  <span className="font-bold text-sm mt-1 block">{result.distinct_reporters ?? 0}</span>
                  <span className="text-[10px] opacity-60 mt-0.5 block leading-tight">
                    Different networks & device fingerprints
                  </span>
                </div>
              </div>

              {/* Zero-Knowledge Privacy Architecture Notice */}
              <div className="p-3 bg-[#F7F7F2] rounded-[8px] border border-[#0A0A0A]/30 text-[11px] leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#0A0A0A]">
                  <Shield className="w-3.5 h-3.5 text-[#0A0A0A]" />
                  <span>Zero-Knowledge Privacy Shield Active</span>
                </div>
                <p className="mt-1 opacity-75 text-[11px]">
                  All citizen reporter personal names, private phone numbers, home addresses, IP hashes, and private notes are strictly redacted under Section 43A of the IT Act. Below is the authentic incident evidence submitted by the community.
                </p>
              </div>

              {/* Verified Owner Badge if Official Entity */}
              {result.verified_name && (
                <div className="p-3 bg-[#23E000] text-[#0A0A0A] rounded-[8px] border border-[#0A0A0A] flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <div>
                      <span className="block font-bold">{result.verified_name}</span>
                      <span className="text-[10px] opacity-80 block">Verified National Registry Entity</span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase px-2 py-1 bg-[#0A0A0A] text-[#F7F7F2] rounded-[4px] font-mono">
                    {result.category}
                  </span>
                </div>
              )}

              {/* Exact User-Given Community Incident Evidence */}
              {result.evidence && result.evidence.length > 0 && result.verdict !== "NO_REPORTS" && (
                <div className="pt-2 border-t border-[#0A0A0A]/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A] flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#0A0A0A]" />
                      Community Incident Evidence ({result.evidence.length})
                    </span>
                    <span className="text-[10px] bg-[#0A0A0A] text-[#F7F7F2] px-2 py-0.5 rounded font-mono font-bold">
                      Authenticated Reports
                    </span>
                  </div>

                  <div className="space-y-2">
                    {result.evidence.map((ev, idx) => {
                      // If ev is a string (e.g. from legacy or verified response)
                      if (typeof ev === "string") {
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-[6px] border border-[#0A0A0A]/30 bg-[#F7F7F2] text-xs"
                          >
                            <p className="font-medium text-[#0A0A0A]">{ev}</p>
                          </div>
                        );
                      }

                      // If ev is structured object from user reports
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-[8px] border border-[#0A0A0A]/30 bg-[#F7F7F2] space-y-2 text-xs"
                        >
                          {/* Incident Header */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-[#0A0A0A]/15">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-[4px] bg-[#0A0A0A] text-[#F7F7F2] text-[10px] font-bold uppercase">
                                {ev.channel || "Incident"}
                              </span>
                              <span className="px-2 py-0.5 rounded-[4px] bg-[rgba(229,32,27,0.12)] border border-[#E5201B]/40 text-[#E5201B] text-[10px] font-bold">
                                {formatScamType(ev.scam_type)}
                              </span>
                            </div>

                            <span className="text-[10px] opacity-65 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              {formatDate(ev.occurred_at)}
                            </span>
                          </div>

                          {/* Locality & Financial Loss Metadata */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 opacity-85">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0A0A0A]" />
                              <span>
                                {ev.locality
                                  ? `${ev.locality}${ev.city ? `, ${ev.city}` : ""} (${ev.pincode})`
                                  : ev.pincode
                                  ? `Pincode: ${ev.pincode}`
                                  : "Location generalized for privacy"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <IndianRupee className="w-3.5 h-3.5 shrink-0 text-[#E5201B]" />
                              {ev.amount_lost_inr && Number(ev.amount_lost_inr) > 0 ? (
                                <span className="font-bold text-[#E5201B]">
                                  Reported Loss: ₹{Number(ev.amount_lost_inr).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="opacity-75">Attempted Fraud (₹0 Lost)</span>
                              )}
                            </div>
                          </div>

                          {/* Screenshot Evidence Flag */}
                          {ev.has_screenshot && (
                            <div className="flex items-center gap-1.5 text-[10px] text-[#0A0A0A] font-semibold bg-[#0A0A0A]/5 px-2 py-1 rounded">
                              <Paperclip className="w-3 h-3" />
                              <span>Verified screenshot proof attached by citizen</span>
                            </div>
                          )}

                          {/* Exact Reported Incident Message with PII Masked */}
                          {ev.safe_note && (
                            <div className="p-2.5 bg-white rounded-[6px] border border-[#0A0A0A]/20 text-[11px] font-mono leading-relaxed space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#0A0A0A] flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-[#23E000]" />
                                  Reported Message (Personal Info Masked)
                                </span>
                                <span className="text-[9px] bg-[#23E000]/20 text-[#0A0A0A] font-bold px-1.5 py-0.2 rounded font-sans">
                                  PII MASKED
                                </span>
                              </div>
                              <p className="italic text-[#0A0A0A]/90 whitespace-pre-wrap">
                                "{ev.safe_note}"
                              </p>
                            </div>
                          )}

                          {/* Community Safety Advice */}
                          <div className="p-2 bg-[rgba(10,10,10,0.03)] border-l-2 border-[#0A0A0A] rounded-[4px] text-[10px] opacity-90 leading-tight">
                            <span className="font-bold block text-[#0A0A0A]">Safety Guidance:</span>
                            <span>{getSafetyAdvice(ev.scam_type)}</span>
                          </div>

                          {/* Redacted Reporter Assurance */}
                          <div className="text-[9px] opacity-50 uppercase tracking-wider font-mono flex items-center justify-between pt-1">
                            <span>Reporter: Anonymous Citizen #{idx + 1}</span>
                            <span>PII Scrubbed & Sanitized</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Reports Helpful Tips */}
              {result.verdict === "NO_REPORTS" && (
                <div className="p-3 bg-[#F7F7F2] rounded-[8px] border border-[#0A0A0A]/30 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[11px]">
                    <Info className="w-3.5 h-3.5 text-[#0A0A0A]" />
                    <span>Always Practice Safe Banking</span>
                  </div>
                  <p className="text-[11px] opacity-75 leading-relaxed">
                    While no reports have been recorded yet for this identifier, cyber criminals frequently switch numbers. Never approve unknown UPI collect requests, never enter your UPI PIN to receive money, and never install remote access software like AnyDesk or TeamViewer.
                  </p>
                </div>
              )}

              {/* Dispute / Challenge Link if Business Owner */}
              {result.verdict !== "NO_REPORTS" && result.verdict !== "VERIFIED_BUSINESS" && (
                <div className="pt-2 text-center">
                  <p className="text-[10px] opacity-70">
                    Are you the legitimate owner or business of this number?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenDispute) {
                          onOpenDispute({
                            identifier_type: type === "sms_header" ? "sender_id" : type,
                            identifier_value: value || result.display_value,
                          });
                        }
                      }}
                      className="underline font-bold text-[#0A0A0A] hover:text-[#E5201B] cursor-pointer"
                    >
                      File a Dispute Challenge
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
