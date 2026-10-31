"use client";

import { useState, useEffect, useRef } from "react";
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
  ArrowLeft,
  Clock,
  Mail,
  User,
  MapPin,
  ClipboardCheck,
  FileText,
  BadgeCheck,
  Clipboard,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────
const IDENTIFIER_TYPES = [
  { id: "phone",      label: "Phone",      icon: Phone },
  { id: "upi",        label: "UPI",        icon: QrCode },
  { id: "url",        label: "URL",        icon: Globe },
  { id: "sms_header", label: "SMS Header", icon: MessageSquare },
];

const PLACEHOLDERS = {
  phone:      "+91 98765 43210",
  upi:        "business@okaxis",
  url:        "https://mybusiness.in",
  sms_header: "AX-MYSHOP",
};

const DISPUTE_REASONS = [
  {
    value: "MISREPORTED",
    label: "I was wrongly reported",
    desc: "My number was wrongly reported by someone. I'm not a scammer.",
  },
  {
    value: "BUSINESS_LEGIT",
    label: "Official business number / handle",
    desc: "This is our official business number/handle.",
  },
  {
    value: "HACKED_RECLAIMED",
    label: "Compromised & reclaimed",
    desc: "My number was compromised. I've reclaimed it.",
  },
];

const DOC_TYPES = [
  "GST Certificate",
  "Shop Act Licence",
  "MCA Certificate",
  "Court Order",
  "Government ID",
  "Other",
];

const PROGRESS = { 1: 25, 2: 50, 3: 75, 4: 100 };

// ─── component ──────────────────────────────────────────────────────────────
export default function DisputeModal({ isOpen, onClose, initialData, apiBaseUrl }) {
  // ── multi-step state ──────────────────────────────────────────────────────
  const [step, setStep]                   = useState(1);
  const [identifierType, setIdentifierType] = useState("phone");
  const [identifierValue, setIdentifierValue] = useState("");
  const [disputeReason, setDisputeReason]   = useState("");
  const [claimantName, setClaimantName]     = useState("");
  const [contactEmail, setContactEmail]     = useState("");
  const [callbackPhone, setCallbackPhone]   = useState("");
  const [city, setCity]                     = useState("");
  const [stateName, setStateName]           = useState("");
  const [proofNote, setProofNote]           = useState("");
  const [docType, setDocType]               = useState("GST Certificate");
  const [attachedFile, setAttachedFile]     = useState(null);
  const [declared, setDeclared]             = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState("");
  const [receipt, setReceipt]               = useState(null);
  const [copied, setCopied]                 = useState(false);
  const [dragOver, setDragOver]             = useState(false);

  const fileInputRef = useRef(null);
  const bodyRef      = useRef(null);

  // ── reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setIdentifierType("phone");
      setIdentifierValue("");
      setDisputeReason("");
      setClaimantName("");
      setContactEmail("");
      setCallbackPhone("");
      setCity("");
      setStateName("");
      setProofNote("");
      setDocType("GST Certificate");
      setAttachedFile(null);
      setDeclared(false);
      setSubmitting(false);
      setError("");
      setReceipt(null);
      setCopied(false);
      setDragOver(false);
    } else {
      if (initialData?.identifier_type)  setIdentifierType(initialData.identifier_type);
      if (initialData?.identifier_value) setIdentifierValue(initialData.identifier_value);
    }
  }, [isOpen]);

  // ── scroll body to top on step change ────────────────────────────────────
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    setError("");
  }, [step]);

  // ── escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && isOpen) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // ── step validation ───────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!identifierValue.trim()) return "Please enter the identifier value.";
    if (!disputeReason)          return "Please select a reason for your dispute.";
    return "";
  };

  const validateStep2 = () => {
    if (!claimantName.trim())                         return "Legal / Business name is required.";
    if (!contactEmail.trim() || !contactEmail.includes("@")) return "A valid official email address is required.";
    return "";
  };

  const validateStep3 = () => {
    if (proofNote.trim().length < 30) return "Please describe your proof in at least 30 characters.";
    if (!declared)                    return "You must accept the declaration before submitting.";
    return "";
  };

  // ── navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    let err = "";
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setError("");
    setStep((s) => s - 1);
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validateStep3();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);
    try {
      const baseUrl = apiBaseUrl || "http://localhost:8000";
      const composedNote = [
        `[REASON: ${disputeReason}]`,
        `[DOC: ${docType}]`,
        city  ? `[CITY: ${city}]`   : null,
        stateName ? `[STATE: ${stateName}]` : null,
        proofNote.trim(),
        attachedFile ? `[Attachment: ${attachedFile.name}]` : null,
      ]
        .filter(Boolean)
        .join(" ");

      const payload = {
        identifier_type:  identifierType === "sms_header" ? "sender_id" : identifierType,
        identifier_value: identifierValue.trim(),
        claimant_name:    claimantName.trim(),
        contact_email:    contactEmail.trim(),
        proof_note:       composedNote,
      };

      const res  = await fetch(`${baseUrl}/challenges`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to register dispute.");
      setReceipt(data);
      setStep(4);
    } catch (e) {
      setError(e.message || "Failed to submit dispute. Check network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── file helpers ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setAttachedFile(file);
  };

  // ── copy reference ────────────────────────────────────────────────────────
  const copyRef = () => {
    const ref = receipt?.challenge_id ? `CHAL-${receipt.challenge_id}` : "CHAL-??????";
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  // ── shared input class ────────────────────────────────────────────────────
  const inputCls =
    "w-full min-h-[44px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-3.5 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none focus:ring-2 focus:ring-[#23E000]";

  const labelCls = "text-[11px] uppercase font-bold opacity-70 block mb-1";

  // ── progress bar ──────────────────────────────────────────────────────────
  const ProgressBar = ({ pct }) => (
    <div className="w-full h-1.5 bg-[#0A0A0A]/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-[#23E000] rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-xl flex flex-col bg-[#F7F7F2] border border-[#0A0A0A] rounded-2xl text-[#0A0A0A] shadow-2xl overflow-hidden">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider leading-tight">
                Dispute Resolution &amp; Whitelist Shield
              </h2>
              {step < 4 && (
                <p className="text-[11px] opacity-60 mt-0.5">
                  Step {step} of 3 &mdash;{" "}
                  {step === 1 ? "Identify" : step === 2 ? "Verify" : "Evidence"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── PROGRESS ────────────────────────────────────────────────────── */}
        {step < 4 && (
          <div className="px-5 pt-3 pb-0 shrink-0">
            <ProgressBar pct={PROGRESS[step]} />
            <div className="flex justify-between text-[10px] font-bold uppercase opacity-50 mt-1">
              <span>Identify</span>
              <span>Verify</span>
              <span>Evidence</span>
            </div>
          </div>
        )}

        {/* ── BODY ────────────────────────────────────────────────────────── */}
        <div
          ref={bodyRef}
          className="overflow-y-auto flex-1 max-h-[72vh] px-5 py-4 space-y-4"
        >

          {/* ════════════════════════════════════════════════════════════════
              STEP 1 — IDENTIFY
          ════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Step 1 of 4 — Identify Your Identifier
                </h3>
                <p className="text-[11px] opacity-60 mt-0.5">
                  Tell us what identifier you want to dispute and why.
                </p>
              </div>

              {/* Identifier type pills */}
              <div>
                <label className={labelCls}>Identifier Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {IDENTIFIER_TYPES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setIdentifierType(id)}
                      className={`min-h-[44px] px-2 py-1.5 text-[11px] font-bold uppercase rounded-[8px] border transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        identifierType === id
                          ? "bg-[#0A0A0A] text-[#23E000] border-[#0A0A0A]"
                          : "bg-[#F7F7F2] text-[#0A0A0A] border-[#0A0A0A] hover:bg-[#0A0A0A]/6"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Identifier value */}
              <div>
                <label className={labelCls}>
                  {identifierType === "phone"
                    ? "Phone Number"
                    : identifierType === "upi"
                    ? "UPI Handle"
                    : identifierType === "url"
                    ? "Website URL"
                    : "SMS Header"}
                </label>
                <input
                  type="text"
                  value={identifierValue}
                  onChange={(e) => setIdentifierValue(e.target.value)}
                  placeholder={PLACEHOLDERS[identifierType]}
                  className={`${inputCls} font-mono`}
                />
              </div>

              {/* Dispute reason radio cards */}
              <div>
                <label className={labelCls}>Reason for Dispute</label>
                <div className="space-y-2">
                  {DISPUTE_REASONS.map(({ value, label, desc }) => {
                    const selected = disputeReason === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDisputeReason(value)}
                        className={`w-full text-left p-3 rounded-[10px] border-2 transition cursor-pointer ${
                          selected
                            ? "border-[#23E000] bg-[#23E000]/10"
                            : "border-[#0A0A0A]/20 bg-[#F7F7F2] hover:border-[#0A0A0A]/50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition ${
                              selected
                                ? "border-[#23E000] bg-[#23E000]"
                                : "border-[#0A0A0A]/40"
                            }`}
                          >
                            {selected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide">
                              {value}
                            </p>
                            <p className="text-[11px] opacity-65 mt-0.5 leading-relaxed">
                              {desc}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <ErrorBanner msg={error} />}

              <button
                type="button"
                onClick={goNext}
                className="w-full min-h-[48px] bg-[#0A0A0A] text-[#F7F7F2] rounded-[10px] text-xs font-black uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 text-[#23E000]" />
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 2 — VERIFY
          ════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Step 2 of 4 — Business &amp; Identity Verification
                </h3>
                <p className="text-[11px] opacity-60 mt-0.5">
                  Provide contact details so our team can reach you.
                </p>
              </div>

              {/* Legal / Business Name */}
              <div>
                <label className={labelCls}>
                  <User className="inline w-3 h-3 mr-1 opacity-60" />
                  Legal Name / Business Name
                </label>
                <input
                  type="text"
                  value={claimantName}
                  onChange={(e) => setClaimantName(e.target.value)}
                  placeholder="e.g. Fresh Bakes Pvt Ltd / Ravi Kumar"
                  className={inputCls}
                />
              </div>

              {/* Official Email */}
              <div>
                <label className={labelCls}>
                  <Mail className="inline w-3 h-3 mr-1 opacity-60" />
                  Official Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className={inputCls}
                />
              </div>

              {/* Callback Phone (optional) */}
              <div>
                <label className={labelCls}>
                  <Phone className="inline w-3 h-3 mr-1 opacity-60" />
                  Phone for Callback{" "}
                  <span className="normal-case font-normal opacity-50">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={callbackPhone}
                  onChange={(e) => setCallbackPhone(e.target.value)}
                  placeholder="+91 99887 76655"
                  className={`${inputCls} font-mono`}
                />
              </div>

              {/* State / City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    <MapPin className="inline w-3 h-3 mr-1 opacity-60" />
                    State
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="Karnataka"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                    className={inputCls}
                  />
                </div>
              </div>

              {error && <ErrorBanner msg={error} />}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 min-h-[48px] bg-[#F7F7F2] text-[#0A0A0A] border border-[#0A0A0A] rounded-[10px] text-xs font-black uppercase hover:bg-[#0A0A0A]/6 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-[2] min-h-[48px] bg-[#0A0A0A] text-[#F7F7F2] rounded-[10px] text-xs font-black uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 text-[#23E000]" />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 3 — EVIDENCE
          ════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Step 3 of 4 — Proof &amp; Supporting Evidence
                </h3>
                <p className="text-[11px] opacity-60 mt-0.5">
                  Attach documents and describe your proof in detail.
                </p>
              </div>

              {/* Proof description */}
              <div>
                <label className={labelCls}>
                  <FileText className="inline w-3 h-3 mr-1 opacity-60" />
                  Describe Your Proof
                </label>
                <textarea
                  rows={4}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="e.g. We are a registered bakery in Bengaluru. GSTIN: 29AAAAA0000A1Z5, FSSAI: 11223344556677. This number is our official customer service line and was maliciously targeted by a competitor. Court order case no. X/2024 attached."
                  className="w-full bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] p-3 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none focus:ring-2 focus:ring-[#23E000] leading-relaxed resize-none"
                />
                <p className={`text-right text-[10px] mt-0.5 ${proofNote.trim().length < 30 ? "text-[#E5201B]" : "opacity-40"}`}>
                  {proofNote.trim().length}/30 min chars
                </p>
              </div>

              {/* Document type select */}
              <div>
                <label className={labelCls}>Document Type</label>
                <div className="relative">
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full min-h-[44px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-3.5 text-xs text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#23E000] appearance-none pr-8 cursor-pointer"
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Drag-drop file upload */}
              <div>
                <label className={labelCls}>
                  <Upload className="inline w-3 h-3 mr-1 opacity-60" />
                  Upload Document{" "}
                  <span className="normal-case font-normal opacity-50">
                    (PDF, JPG, PNG — optional)
                  </span>
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-full min-h-[80px] rounded-[10px] border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center gap-2 px-4 py-3 ${
                    dragOver
                      ? "border-[#23E000] bg-[#23E000]/8"
                      : attachedFile
                      ? "border-[#23E000] bg-[#23E000]/5"
                      : "border-[#0A0A0A]/30 bg-[#0A0A0A]/3 hover:border-[#0A0A0A]/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {attachedFile ? (
                    <>
                      <FileCheck className="w-5 h-5 text-[#23E000]" />
                      <p className="text-xs font-bold text-[#0A0A0A] text-center truncate max-w-full px-2">
                        {attachedFile.name}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAttachedFile(null); }}
                        className="text-[10px] font-bold text-[#E5201B] hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 opacity-30" />
                      <p className="text-[11px] opacity-50 text-center">
                        Drag &amp; drop or <span className="underline">browse</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Declaration checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-[5px] border-2 shrink-0 flex items-center justify-center transition ${
                    declared
                      ? "bg-[#23E000] border-[#23E000]"
                      : "border-[#0A0A0A]/40 group-hover:border-[#0A0A0A]"
                  }`}
                  onClick={() => setDeclared((d) => !d)}
                >
                  {declared && (
                    <svg className="w-3 h-3 text-[#0A0A0A]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={declared}
                  onChange={(e) => setDeclared(e.target.checked)}
                  className="sr-only"
                />
                <p className="text-[11px] leading-relaxed opacity-70">
                  I hereby declare under{" "}
                  <strong className="text-[#0A0A0A]">Indian IT Act Section 66D</strong>{" "}
                  that the above information is true and correct. Filing a false dispute is a
                  criminal offence.
                </p>
              </label>

              {error && <ErrorBanner msg={error} />}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 min-h-[48px] bg-[#F7F7F2] text-[#0A0A0A] border border-[#0A0A0A] rounded-[10px] text-xs font-black uppercase hover:bg-[#0A0A0A]/6 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-[2] min-h-[48px] bg-[#0A0A0A] text-[#F7F7F2] rounded-[10px] text-xs font-black uppercase hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#F7F7F2]/30 border-t-[#F7F7F2] rounded-full animate-spin" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4 text-[#23E000]" />
                      <span>Review &amp; Submit →</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 4 — CONFIRMATION (success state)
          ════════════════════════════════════════════════════════════════ */}
          {step === 4 && receipt && (
            <div className="space-y-4">
              {/* Green success header */}
              <div className="rounded-[14px] bg-[#23E000]/12 border border-[#23E000] p-5 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[#23E000]/20 border-2 border-[#23E000] flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-[#23E000]" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wide text-[#0A0A0A]">
                    Dispute Registered!
                  </h3>
                  <p className="text-[11px] opacity-60 mt-0.5">
                    Step 4 of 4 — Your submission is now under review
                  </p>
                </div>

                {/* Challenge ID */}
                <div className="w-full bg-[#F7F7F2] border border-[#0A0A0A]/20 rounded-[10px] px-4 py-3">
                  <p className="text-[10px] uppercase font-bold opacity-50 mb-1">Challenge ID</p>
                  <p className="font-mono text-sm font-black tracking-wider text-[#0A0A0A]">
                    CHAL-{receipt.challenge_id}
                  </p>
                </div>

                {/* Status badge */}
                <span className="px-3 py-1 rounded-full bg-[#0A0A0A] text-[#23E000] text-[10px] font-mono font-black uppercase tracking-widest">
                  {receipt.status || "UNDER_REVIEW"}
                </span>
              </div>

              {/* Timeline widget */}
              <div className="rounded-[12px] border border-[#0A0A0A]/15 bg-[#F7F7F2] divide-y divide-[#0A0A0A]/10 overflow-hidden">
                {[
                  {
                    icon: "✅",
                    title: "Dispute Received",
                    sub: "Just now",
                    done: true,
                  },
                  {
                    icon: "⏳",
                    title: "Admin Verification",
                    sub: "1–3 business days",
                    done: false,
                  },
                  {
                    icon: "📧",
                    title: "Decision Emailed to You",
                    sub: "Within 5 days",
                    done: false,
                  },
                ].map(({ icon, title, sub, done }) => (
                  <div key={title} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-base">{icon}</span>
                    <div className="flex-1">
                      <p className={`text-xs font-bold ${done ? "text-[#0A0A0A]" : "opacity-60"}`}>
                        {title}
                      </p>
                      <p className="text-[10px] opacity-45">{sub}</p>
                    </div>
                    {done && (
                      <BadgeCheck className="w-4 h-4 text-[#23E000] shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Shield notice */}
              <div className="p-3.5 rounded-[10px] bg-[#0A0A0A] text-[#F7F7F2] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#23E000] font-black text-[11px] uppercase">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Identifier Shielded</span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Your identifier is now shielded. It will{" "}
                  <strong className="text-[#23E000]">never</strong> return{" "}
                  <span className="font-mono">KNOWN_SCAM</span> while your dispute is under
                  review.
                </p>
              </div>

              {/* Admin notification note */}
              <div className="p-3 rounded-[10px] border border-[#0A0A0A]/15 bg-[#F7F7F2] text-[11px] opacity-70 leading-relaxed">
                <ShieldAlert className="inline w-3.5 h-3.5 mr-1 opacity-60" />
                Our admin team has been notified and will review your submission within 1–3
                working days. You will receive a decision at{" "}
                <strong className="opacity-100 text-[#0A0A0A]">{contactEmail}</strong>.
              </div>

              {/* Copy reference button */}
              <button
                type="button"
                onClick={copyRef}
                className="w-full min-h-[44px] border-2 border-dashed border-[#0A0A0A]/30 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 hover:border-[#0A0A0A] transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#23E000]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4 opacity-50" />
                    <span className="font-mono">
                      Save reference: CHAL-{receipt.challenge_id}
                    </span>
                  </>
                )}
              </button>

              {/* Return button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[48px] bg-[#0A0A0A] text-[#F7F7F2] rounded-[10px] text-xs font-black uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Return to Threat Map</span>
                <ArrowRight className="w-4 h-4 text-[#23E000]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── small helper component ────────────────────────────────────────────────────
function ErrorBanner({ msg }) {
  return (
    <div className="p-2.5 rounded-[8px] bg-[#E5201B]/10 border border-[#E5201B] text-xs font-bold text-[#E5201B] flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}
