"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  X,
  FileCheck,
  Upload,
  AlertTriangle,
  Building2,
  CheckCircle,
  Phone,
  QrCode,
  Globe,
  MessageSquare,
  Lock,
  ArrowRight,
} from "lucide-react";

export default function DisputeModal({ isOpen, onClose, initialData, apiBaseUrl }) {
  const [identifierType, setIdentifierType] = useState("phone");
  const [identifierValue, setIdentifierValue] = useState("");
  const [claimantName, setClaimantName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError("");
      setReceipt(null);
      setSubmitting(false);

      if (initialData) {
        if (initialData.identifier_type) {
          setIdentifierType(initialData.identifier_type);
        }
        if (initialData.identifier_value) {
          setIdentifierValue(initialData.identifier_value);
        }
      }
    }
  }, [isOpen, initialData]);

  // Handle escape key
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanVal = identifierValue.trim();
    const cleanName = claimantName.trim();
    const cleanEmail = contactEmail.trim();
    const cleanNote = proofNote.trim();

    if (!cleanVal) {
      setError("Please specify the identifier value (e.g. phone number or UPI handle).");
      return;
    }
    if (!cleanName) {
      setError("Please provide the legal claimant or registered business name.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid official contact email address.");
      return;
    }
    if (!cleanNote) {
      setError("Please provide your justification and reference details (e.g. GSTIN, FSSAI, or shop licence).");
      return;
    }

    setSubmitting(true);

    try {
      const baseUrl = apiBaseUrl || "http://localhost:8000";
      const payload = {
        identifier_type: identifierType === "sms_header" ? "sender_id" : identifierType,
        identifier_value: cleanVal,
        claimant_name: cleanName,
        contact_email: cleanEmail,
        proof_note: attachedFile ? `${cleanNote} [Attachment: ${attachedFile.name}]` : cleanNote,
      };

      const res = await fetch(`${baseUrl}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to register dispute.");
      }

      setReceipt(data);
    } catch (err) {
      setError(err.message || "Failed to submit dispute. Check network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity duration-150 animate-fadeIn"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#F7F7F2] border border-[#0A0A0A] rounded-[14px] p-5 sm:p-6 text-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">
                Dispute Resolution & Whitelist Shield
              </h2>
              <p className="text-[11px] opacity-70">
                Challenge false community reports via official business verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 pr-1 py-3.5 space-y-4">
          {/* Dispute Success Screen */}
          {receipt ? (
            <div className="p-5 rounded-[12px] border border-[#0A0A0A] bg-[#23E000]/15 space-y-3.5">
              <div className="flex items-center gap-2.5 text-[#0A0A0A]">
                <CheckCircle className="w-6 h-6 text-[#0A0A0A]" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Dispute Challenge Registered
                  </h3>
                  <span className="text-[11px] opacity-80 block font-mono">
                    Challenge Reference: {receipt.challenge_id}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#F7F7F2] rounded-[8px] border border-[#0A0A0A]/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="opacity-70 text-[10px] uppercase font-bold">Investigation Status:</span>
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#0A0A0A] text-[#F7F7F2] text-[10px] font-mono font-bold uppercase">
                    {receipt.status || "under_review"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-70 text-[10px] uppercase font-bold">Protected Identifier:</span>
                  <span className="font-mono font-bold text-xs">{identifierValue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-70 text-[10px] uppercase font-bold">Claimant Legal Entity:</span>
                  <span className="font-bold text-xs">{claimantName}</span>
                </div>
              </div>

              {/* Protective Shield Explainer */}
              <div className="p-3 bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#23E000] uppercase text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-[#23E000]" />
                  <span>Immediate Anti-False-Positive Shield Activated</span>
                </div>
                <p className="text-[11px] opacity-85">
                  Under the CyberForge National Dispute Protocol, this identifier is now immediately shielded: it will <strong>never</strong> return a "KNOWN_SCAM" verdict while under review, and public alerts are frozen until the grievance cell reviews your proof.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[46px] bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Return to Threat Map</span>
                <ArrowRight className="w-4 h-4 text-[#23E000]" />
              </button>
            </div>
          ) : (
            /* Dispute Registration Form */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Notice Banner */}
              <div className="p-3 bg-[#F7F7F2] rounded-[8px] border border-[#0A0A0A] text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-[#0A0A0A]">
                  <Building2 className="w-3.5 h-3.5 text-[#0A0A0A]" />
                  <span>Business Verification Grievance Cell</span>
                </div>
                <p className="text-[11px] opacity-75">
                  If your phone number, official UPI handle, or business SMS header has been mistakenly reported, submit your GST certificate, shop licence, or official identity credentials below.
                </p>
              </div>

              {/* Identifier Type Selector */}
              <div>
                <label className="text-[11px] uppercase font-bold opacity-75 block mb-1.5">
                  Identifier Type
                </label>
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
                      onClick={() => setIdentifierType(t.id)}
                      className={`min-h-[42px] px-2 py-1 text-xs font-bold uppercase rounded-[8px] border border-[#0A0A0A] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        identifierType === t.id
                          ? "bg-[#0A0A0A] text-[#F7F7F2]"
                          : "bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[rgba(10,10,10,0.06)]"
                      }`}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Identifier Value */}
              <div>
                <label className="text-[11px] uppercase font-bold opacity-75 block mb-1">
                  Disputed Number / Handle / Header
                </label>
                <input
                  type="text"
                  value={identifierValue}
                  onChange={(e) => setIdentifierValue(e.target.value)}
                  placeholder={
                    identifierType === "phone"
                      ? "+91 80 4100 2233"
                      : identifierType === "upi"
                      ? "business@okaxis"
                      : identifierType === "url"
                      ? "https://mybusiness.in"
                      : "AX-MYSHOP"
                  }
                  required
                  className="w-full min-h-[44px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-3.5 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 font-mono focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              {/* Claimant Legal Name & Contact Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] uppercase font-bold opacity-75 block mb-1">
                    Business / Claimant Legal Name
                  </label>
                  <input
                    type="text"
                    value={claimantName}
                    onChange={(e) => setClaimantName(e.target.value)}
                    placeholder="e.g. Fresh Bakes / Indiranagar"
                    required
                    className="w-full min-h-[44px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-3.5 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase font-bold opacity-75 block mb-1">
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="owner@example.com"
                    required
                    className="w-full min-h-[44px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-3.5 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  />
                </div>
              </div>

              {/* Justification & Proof Details */}
              <div>
                <label className="text-[11px] uppercase font-bold opacity-75 block mb-1">
                  Justification & Proof Note (GSTIN / Shop Licence / Identity)
                </label>
                <textarea
                  rows={3}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="e.g. We are a registered bakery in Bengaluru. GSTIN: 29AAAAA0000A1Z5, FSSAI: 11223344556677. This number is our official customer service line and was maliciously targeted."
                  required
                  className="w-full bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] p-3 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] leading-relaxed"
                />
              </div>

              {/* Proof Document Attachment */}
              <div>
                <label className="text-[11px] uppercase font-bold opacity-75 block mb-1">
                  Attach Official Document (GST Certificate / Shop Act / Govt ID)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 min-h-[42px] px-3 py-2 border border-dashed border-[#0A0A0A] rounded-[8px] bg-[#0A0A0A]/5 hover:bg-[#0A0A0A]/10 transition flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#0A0A0A]" />
                    <span className="truncate">
                      {attachedFile ? attachedFile.name : "Upload GST / Licence Document (PDF, JPG, PNG)"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {attachedFile && (
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="px-2.5 min-h-[42px] rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] text-xs font-bold hover:bg-[#0A0A0A] hover:text-[#F7F7F2]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Error Callout */}
              {error && (
                <div className="p-2.5 rounded-[8px] bg-[rgba(229,32,27,0.1)] border border-[#E5201B] text-xs font-bold text-[#E5201B] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#F7F7F2]/30 border-t-[#F7F7F2] rounded-full animate-spin" />
                      <span>Verifying & Shielding Identifier...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#23E000]" />
                      <span>Submit Dispute & Activate Shield</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

