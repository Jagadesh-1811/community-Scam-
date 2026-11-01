"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Shield,
  User,
  ShieldAlert,
  CheckCircle2,
  X,
  Maximize2,
  Minimize2,
  AlertTriangle,
  MapPin,
  Compass,
  IndianRupee,
  Lock,
  PhoneCall,
  BellRing
} from "lucide-react";
import { findAreaByInput, KNOWN_AREAS } from "../data/knownAreas";

// Exact chevron paper plane arrowhead icon matching Image 2
function SendArrowIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 2.5L22 12L4 21.5L7.8 14.5L14.5 12L7.8 9.5L4 2.5Z" />
    </svg>
  );
}

// Exact 7-bar vertical soundwave icon matching Image 3 with pulsating animation when listening
function VoiceWaveIcon({ className = "w-5 h-5", isListening = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y={isListening ? "5" : "7.5"} width="1.8" height={isListening ? "14" : "9"} rx="0.9" />
      <rect x="5.2" y={isListening ? "2" : "3.5"} width="1.8" height={isListening ? "20" : "17"} rx="0.9" />
      <rect x="8.4" y={isListening ? "4" : "5.5"} width="1.8" height={isListening ? "16" : "13"} rx="0.9" />
      <rect x="11.6" y="1" width="1.8" height="22" rx="0.9" />
      <rect x="14.8" y={isListening ? "4" : "5.5"} width="1.8" height={isListening ? "16" : "13"} rx="0.9" />
      <rect x="18" y={isListening ? "2" : "3.5"} width="1.8" height={isListening ? "20" : "17"} rx="0.9" />
      <rect x="21.2" y={isListening ? "5" : "7.5"} width="1.8" height={isListening ? "14" : "9"} rx="0.9" />
    </svg>
  );
}

// Intelligent multi-lingual language detection and scoring engine (Telugu, Tamil, Kannada, Hindi, English)
const detectLanguageFromText = (text) => {
  if (!text || !text.trim()) return { code: "en-IN", lang: "en", label: "English", native: "English" };

  // 1. Direct Native Unicode Script Check
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return { code: "te-IN", lang: "te", label: "Telugu", native: "తెలుగు", isNative: true };
  }
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return { code: "ta-IN", lang: "ta", label: "Tamil", native: "தமிழ்", isNative: true };
  }
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return { code: "kn-IN", lang: "kn", label: "Kannada", native: "ಕನ್ನಡ", isNative: true };
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return { code: "hi-IN", lang: "hi", label: "Hindi", native: "हिन्दी", isNative: true };
  }

  // 2. Phonetic & Lexical Keyword Scoring
  const tePat = /\b(cheppu|cheppandi|edo|okati|naku|vachindi|vachadu|adugutunnaru|dabbu|dabbulu|mosam|chesaru|unnaru|katha|khata|pampandi|pampincharu|kallu|entha|emi|enti|undi|ledu|avunu|kadu|meeru|nenu|manishi|billu|kattandi)\b/gi;
  const taPat = /\b(solunga|solranga|panam|kaasu|enaku|vanthathu|vanthar|ketanga|pesunga|pesinar|mosadi|iruku|illa|ama|neenga|naan|evvalavu|enna|ethu|anupunga|anupinar|kavalthurai|kattunga)\b/gi;
  const knPat = /\b(heli|helidaru|hana|duddu|nanage|banthu|bandaru|kelidaru|keluttiddare|vanchane|ide|illa|howdu|neevu|naanu|eshtu|enu|yaru|kalsi|kalsidaru|kathege|katti)\b/gi;
  const hiPat = /\b(bolo|bol|boliye|paise|rupaye|mujhe|aaya|aaye|maang|maanga|dhokha|hai|hain|tha|thi|the|nahi|haan|aap|tum|main|kitna|kya|kaun|bhejo|bheja|bijli)\b/gi;
  const enPat = /\b(the|is|are|was|were|have|has|had|this|that|from|with|for|about|they|said|told|called|asking|demanded|threat|arrest|digital|fraud|scam|officer|number|please|received|payment|link|otp|message|help|warning|someone|money|bank|account|police)\b/gi;

  const teMatches = (text.match(tePat) || []).length;
  const taMatches = (text.match(taPat) || []).length;
  const knMatches = (text.match(knPat) || []).length;
  const hiMatches = (text.match(hiPat) || []).length;
  const enMatches = (text.match(enPat) || []).length;

  const scores = [
    { code: "te-IN", lang: "te", label: "Telugu", native: "తెలుగు", score: teMatches },
    { code: "ta-IN", lang: "ta", label: "Tamil", native: "தமிழ்", score: taMatches },
    { code: "kn-IN", lang: "kn", label: "Kannada", native: "ಕನ್ನಡ", score: knMatches },
    { code: "hi-IN", lang: "hi", label: "Hindi", native: "हिन्दी", score: hiMatches },
  ];

  scores.sort((a, b) => b.score - a.score);
  const bestIndian = scores[0];

  // If Indian vocabulary is detected and strong enough relative to English
  if (bestIndian.score > 0 && bestIndian.score >= enMatches) {
    return { ...bestIndian, isNative: false };
  }

  // Default to English
  return { code: "en-IN", lang: "en", label: "English", native: "English", isNative: true };
};

const INITIAL_MESSAGES = [
  {
    id: "m-1",
    sender: "bot",
    text: "Welcome to Citizen Fraud Registry.\n\nPaste the suspicious SMS, call demand, or link you received. We will run instant community cross-verification against known scam patterns.",
    quickReplies: [
      { label: "Phone Call Threat", value: "phone_call" },
      { label: "SMS / WhatsApp Message", value: "sms" },
      { label: "Fake UPI / QR Request", value: "upi" },
      { label: "Phishing Link / Website", value: "link" },
    ],
  },
];

// Contextual dynamic investigation questions tailored to each scam category
const SCAM_INVESTIGATION_QUESTIONS = {
  "digital-arrest": {
    question: "This matches an impersonation attempt by a fake law enforcement or customs officer. To help police track their apparatus:",
    prompt: "Did they demand a video call or claim an illegal parcel was found in your name?",
    replies: [
      { label: "📹 Video Call Demanded (Skype/WhatsApp with fake uniform)", value: "tactic_video_call" },
      { label: "📦 Illegal FedEx/DHL Parcel with drugs claimed in my name", value: "tactic_parcel_drugs" },
      { label: "🔒 Ordered me to stay isolated in a room and not call family", value: "tactic_room_isolation" },
      { label: "🏦 Demanded transfer to a 'Safe Government RBI Account'", value: "tactic_rbi_bail" },
    ],
  },
  "electricity-disconnection": {
    question: "This matches an Electricity Disconnection extortion scheme targeting household power consumers.",
    prompt: "What specific method did they use to threaten power cutoff?",
    replies: [
      { label: "⏰ Threatened power cutoff tonight (e.g. 9:30 PM)", value: "tactic_night_cutoff" },
      { label: "📲 Sent an APK file (e.g. Suvidha.apk / Urja.apk) to install", value: "tactic_apk_install" },
      { label: "📞 Instructed to call a personal 10-digit mobile number", value: "tactic_personal_phone" },
      { label: "💳 Demanded ₹10 to ₹50 token payment via unknown link", value: "tactic_token_payment" },
    ],
  },
  "job-offer": {
    question: "This matches a Part-Time Task & Investment Trap (Telegram/WhatsApp task fraud).",
    prompt: "What stage of the recruitment trap did you encounter?",
    replies: [
      { label: "📢 Telegram group for liking YouTube videos or hotel ratings", value: "tactic_telegram_tasks" },
      { label: "💵 Paid small initial return (₹150–₹500) to gain trust", value: "tactic_small_payout" },
      { label: "🚫 Froze funds & demanded deposit (₹10,000+) to withdraw", value: "tactic_deposit_demand" },
      { label: "💬 Unsolicited WhatsApp message from fake HR recruiter", value: "tactic_unsolicited_hr" },
    ],
  },
  "fake-kyc-link": {
    question: "This matches a Banking & KYC Phishing Attack impersonating financial institutions.",
    prompt: "What sensitive information or access did they try to extract?",
    replies: [
      { label: "🔗 Phishing link asking for NetBanking ID, Password or CVV", value: "tactic_credential_phish" },
      { label: "📥 Instructed to download screen-sharing app (AnyDesk/RustDesk)", value: "tactic_screen_share" },
      { label: "⛔ Claimed bank account or PAN will be permanently blocked", value: "tactic_account_blocked" },
      { label: "🔢 Caller insisted on reading out the OTP code received on SMS", value: "tactic_otp_demand" },
    ],
  },
  "upi-refund-qr": {
    question: "This matches a QR Code & UPI Inversion Fraud (money extraction trick).",
    prompt: "How did they attempt to trick you into authorizing payment?",
    replies: [
      { label: "📷 Sent QR code claiming 'Scan QR code to receive money'", value: "tactic_scan_to_receive" },
      { label: "📥 Sent UPI Collect Request pretending it was an incoming refund", value: "tactic_collect_request" },
      { label: "🎖️ Posed as an Army/Defence officer transferring on duty", value: "tactic_army_officer" },
      { label: "📦 Demanded advance courier or delivery fee before purchase", value: "tactic_advance_courier" },
    ],
  },
  "loan-app-harassment": {
    question: "This matches an Unregulated Predatory Loan Harassment Scheme.",
    prompt: "What harassment or coercion tactics did they use?",
    replies: [
      { label: "📱 App demanded access to complete contact list & gallery", value: "tactic_permission_abuse" },
      { label: "⚠️ Threatened to send morphed photos to family/contacts", value: "tactic_morphed_threat" },
      { label: "💸 Deducted 40-50% processing fees before loan disbursal", value: "tactic_high_deduction" },
      { label: "📞 Abusive recovery calls from multiple overseas numbers", value: "tactic_abusive_calls" },
    ],
  },
  "courier-customs": {
    question: "This matches a Fake Parcel / Customs Confiscation Scam.",
    prompt: "What did they claim was found in your parcel?",
    replies: [
      { label: "📦 Narcotics, fake passports, or contraband seized in your name", value: "tactic_contraband" },
      { label: "👮 Transferring call to 'Mumbai/Delhi Cyber Crime Police'", value: "tactic_police_transfer" },
      { label: "💰 Demanded customs clearance fee or penalty to release parcel", value: "tactic_customs_fine" },
      { label: "✈️ International parcel detained at airport terminal", value: "tactic_airport_hold" },
    ],
  },
  "sextortion": {
    question: "This matches a Video Blackmail & Cyber Extortion Scheme.",
    prompt: "What extortion threats were made against you?",
    replies: [
      { label: "📹 Brief WhatsApp video call recorded and morphed", value: "tactic_morphed_video" },
      { label: "⚠️ Threatened to send video to Facebook/Instagram relatives", value: "tactic_social_leak" },
      { label: "👮 Person posing as cyber police officer demanding fee to delete", value: "tactic_fake_cop_delete" },
      { label: "⏳ Given 30-minute deadline to pay before filing fake FIR", value: "tactic_fir_deadline" },
    ],
  },
  "lottery-prize": {
    question: "This matches a Lottery / Sweepstakes Advance-Fee Scam.",
    prompt: "What prize lure was used in the communication?",
    replies: [
      { label: "🎁 Claimed I won KBC ₹25 Lakhs or a Tata Safari car", value: "tactic_kbc_lottery" },
      { label: "💳 Demanded GST / clearance fee before releasing prize money", value: "tactic_prize_gst" },
      { label: "📜 Sent fake certificate with government stamps on WhatsApp", value: "tactic_fake_cert" },
      { label: "📞 Audio recording claiming to be bank head manager", value: "tactic_manager_audio" },
    ],
  },
  "general-fraud": {
    question: "To document this suspicious activity accurately in the registry:",
    prompt: "Which primary deception technique did the fraudster use?",
    replies: [
      { label: "🚨 Urgent legal, tax, or police threat demanding payment", value: "tactic_legal_threat" },
      { label: "🎁 Unrealistic high returns, cashback, or lottery lure", value: "tactic_high_return" },
      { label: "🔑 Demanding OTP, ATM PIN, or remote app installation", value: "tactic_cred_demand" },
      { label: "⚠️ Unsolicited payment request or suspicious link", value: "tactic_link_demand" },
    ],
  },
};

// Dynamic community safety advice tailored to the specific scam type
const DYNAMIC_SAFETY_ADVICE = {
  "digital-arrest": [
    { label: "Police & CBI never arrest on video calls; hang up and dial 1930", value: "sug_police_video" },
    { label: "Never transfer money to any secret 'Safe RBI verification account'", value: "sug_rbi_account" },
    { label: "Warn family & elderly neighbors about digital arrest impersonations", value: "sug_warn_family" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "electricity-disconnection": [
    { label: "Discoms never send disconnection threats from 10-digit mobile numbers", value: "sug_discom_mobile" },
    { label: "Never download APK files sent via WhatsApp or SMS", value: "sug_discom_apk" },
    { label: "Check bill status solely on the official state electricity portal", value: "sug_discom_portal" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "job-offer": [
    { label: "Never pay money to unlock salary tasks or earn daily profits", value: "sug_task_deposit" },
    { label: "Leave Telegram task groups immediately and report the channel", value: "sug_task_telegram" },
    { label: "Legitimate companies never hire without formal interview & contract", value: "sug_task_formal" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "fake-kyc-link": [
    { label: "Never enter UPI PIN or click SMS links to update KYC", value: "sug_kyc_pin" },
    { label: "Banks never ask for debit card CVV or OTP to prevent account block", value: "sug_kyc_cvv" },
    { label: "Visit your local bank branch directly if in doubt about your account", value: "sug_kyc_branch" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "upi-refund-qr": [
    { label: "Never scan a QR code to receive money - QR is strictly for paying", value: "sug_qr_pay" },
    { label: "Never enter your UPI PIN unless you intend to transfer funds", value: "sug_qr_pin" },
    { label: "Decline incoming UPI collect requests from unknown buyers on OLX", value: "sug_qr_olx" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "loan-app-harassment": [
    { label: "Never grant gallery or contact permissions to unverified loan apps", value: "sug_loan_perms" },
    { label: "Report harassment and blackmail numbers directly to cybercrime.gov.in", value: "sug_loan_report" },
    { label: "Check RBI registered NBFC list before applying for online loans", value: "sug_loan_rbi" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "general-fraud": [
    { label: "Never share OTP, PIN, or passwords with anyone", value: "sug_gen_otp" },
    { label: "Verify caller identity before authorizing any financial transaction", value: "sug_gen_verify" },
    { label: "Report suspicious numbers immediately to national helpline 1930", value: "sug_gen_1930" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
};

export default function ReportModal({ isOpen, onClose, onSuccess, onHighlightLocation, apiBaseUrl }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [step, setStep] = useState("channel");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [uiError, setUiError] = useState("");
  const [requestingGps, setRequestingGps] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [detectedLangInfo, setDetectedLangInfo] = useState(null);
  const [voiceNotice, setVoiceNotice] = useState("");
  const isRecordingRef = useRef(false);
  const recognitionRef = useRef(null);
  const fullTranscriptRef = useRef("");
  const restartTimerRef = useRef(null);
  const transliterateDebounceRef = useRef(null);

  // Stop listening when modal closes
  useEffect(() => {
    if (!isOpen && isRecordingRef.current) {
      stopVoiceRecording();
    }
  }, [isOpen]);

  const stopVoiceRecording = () => {
    isRecordingRef.current = false;
    setIsListening(false);
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (transliterateDebounceRef.current) {
      clearTimeout(transliterateDebounceRef.current);
      transliterateDebounceRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setVoiceNotice("");
  };

  // Convert Indian phonetic speech into its authentic native script via API
  const applyTransliteration = async (rawText, langCode) => {
    if (!rawText || !langCode || langCode === "en") return rawText;
    try {
      const res = await fetch("/api/transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText, lang: langCode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim()) {
          return data.text.trim();
        }
      }
    } catch (e) {
      console.warn("Transliteration fetch error:", e);
    }
    return rawText;
  };

  const startRecognitionSession = () => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setVoiceNotice("Speech Recognition not supported in this browser. Please use Chrome or Edge.");
      setIsListening(false);
      isRecordingRef.current = false;
      setTimeout(() => setVoiceNotice(""), 4500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      // en-IN accurately recognizes English words as English AND captures Indian speech phonetically without forcing Telugu
      recognition.lang = "en-IN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        if (isRecordingRef.current) {
          setIsListening(true);
        }
      };

      recognition.onresult = (event) => {
        let interimText = "";
        let newFinalText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || "";
          if (res.isFinal) {
            newFinalText += (newFinalText ? " " : "") + transcript.trim();
          } else {
            interimText += (interimText ? " " : "") + transcript.trim();
          }
        }

        if (newFinalText) {
          fullTranscriptRef.current = fullTranscriptRef.current
            ? fullTranscriptRef.current + " " + newFinalText
            : newFinalText;
        }

        const rawCombined = (fullTranscriptRef.current + " " + interimText).trim();
        if (!rawCombined) return;

        // Auto-detect whether user is speaking English, Telugu, Hindi, Tamil, or Kannada
        const langInfo = detectLanguageFromText(rawCombined);
        setDetectedLangInfo(langInfo);

        // If English or already in native script: display directly
        if (langInfo.lang === "en" || langInfo.isNative) {
          setInput(rawCombined);
        } else {
          // Temporarily show phonetics while speaking
          setInput(rawCombined);

          // Debounced transliteration into authentic native script
          if (transliterateDebounceRef.current) clearTimeout(transliterateDebounceRef.current);
          transliterateDebounceRef.current = setTimeout(async () => {
            const converted = await applyTransliteration(rawCombined, langInfo.lang);
            setInput(converted);
          }, 400);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "no-speech") {
          return;
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setVoiceNotice("Microphone permission denied. Allow mic in browser settings.");
          stopVoiceRecording();
          setTimeout(() => setVoiceNotice(""), 4000);
          return;
        }
        console.warn("Speech recognition notice:", event.error);
      };

      recognition.onend = () => {
        // Continuously wait and actively listen UNTIL user clicks the voice icon to stop
        if (isRecordingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {
                startRecognitionSession();
              }
            }
          }, 80);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech start error:", err);
      if (isRecordingRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingRef.current) startRecognitionSession();
        }, 200);
      }
    }
  };

  const toggleVoiceRecording = () => {
    if (isListening || isRecordingRef.current) {
      stopVoiceRecording();
    } else {
      fullTranscriptRef.current = input.trim();
      isRecordingRef.current = true;
      setIsListening(true);
      setVoiceNotice("");
      startRecognitionSession();
    }
  };

  const [reportData, setReportData] = useState({
    channel: "",
    identifier_type: "phone",
    identifier_value: "",
    scam_type: "",
    pincode: "",
    locality: "",
    city: "",
    note: "",
    amount_lost_inr: 0,
    investigation_tactic: "",
    predicted_risk: null,
    predicted_band: "",
    predicted_tactics: [],
    suggestions: [],
    wants_notifications: false,
    contact_for_alerts: "",
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setMessages(INITIAL_MESSAGES);
      setStep("channel");
      setReceipt(null);
      setUiError("");
      setRequestingGps(false);
      setReportData({
        channel: "",
        identifier_type: "phone",
        identifier_value: "",
        scam_type: "",
        pincode: "",
        locality: "",
        city: "",
        note: "",
        amount_lost_inr: 0,
        investigation_tactic: "",
        predicted_risk: null,
        predicted_band: "",
        predicted_tactics: [],
        suggestions: [],
        wants_notifications: false,
        contact_for_alerts: "",
      });
    }
  }, [isOpen]);

  let botMsgCounter = 0;
  const addBotMessage = (text, quickReplies = null, card = null) => {
    const uniqueId = `bot-${Date.now()}-${++botMsgCounter}-${Math.random().toString(36).slice(2, 7)}`;
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: uniqueId,
          sender: "bot",
          text,
          quickReplies,
          card,
        },
      ]);
    }, 200);
  };

  const scrubPII = (text) => {
    if (!text) return "";
    let scrubbed = text;
    scrubbed = scrubbed.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[EMAIL REDACTED]");
    scrubbed = scrubbed.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[ID REDACTED]");
    scrubbed = scrubbed.replace(/(\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b/g, "[PHONE REDACTED]");
    return scrubbed.trim();
  };

  // Client-Side Deterministic Heuristic Analyzer & Dynamic Severity Calculator
  const analyzeIncident = (userText, channel) => {
    const textLower = (userText || "").toLowerCase();

    // 1. Extract identifier
    let identType = "phone";
    let identVal = "+919876500000";

    const phoneMatch = userText.match(/(\+91[\-\s]?)?[6-9]\d{9}|\b1930\b|\b1800\d{6,8}\b/);
    const upiMatch = userText.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/);
    const urlMatch = userText.match(/https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(com|in|org|net|xyz|top|link|app)[^\s]*/);

    if (upiMatch) {
      identType = "upi";
      identVal = upiMatch[0];
    } else if (urlMatch) {
      identType = "url";
      identVal = urlMatch[0];
    } else if (phoneMatch) {
      identType = "phone";
      identVal = phoneMatch[0];
    }

    // 2. Classify Scam Pattern with High Accuracy Keyword Weights
    let detectedType = "general-fraud";
    let baseScore = 30;
    const detectedTactics = [];

    if (
      textLower.includes("digital arrest") ||
      textLower.includes("cbi") ||
      textLower.includes("narcotics") ||
      textLower.includes("illegal parcel") ||
      textLower.includes("skype") ||
      textLower.includes("cyber cell") ||
      textLower.includes("arrest warrant") ||
      textLower.includes("mumbai police")
    ) {
      detectedType = "digital-arrest";
      baseScore = 55;
      detectedTactics.push("Law Enforcement Impersonation", "Coercive Legal Threat");
    } else if (
      textLower.includes("electricity") ||
      textLower.includes("power disconnect") ||
      textLower.includes("power cutoff") ||
      textLower.includes("light cut") ||
      textLower.includes("update meter") ||
      textLower.includes("bescom") ||
      textLower.includes("tneb") ||
      textLower.includes("msedcl") ||
      textLower.includes("bill unpaid")
    ) {
      detectedType = "electricity-disconnection";
      baseScore = 50;
      detectedTactics.push("Utility Disconnection Threat", "Artificial Night Deadline");
    } else if (
      textLower.includes("part time") ||
      textLower.includes("part-time") ||
      textLower.includes("job offer") ||
      textLower.includes("telegram") ||
      textLower.includes("daily salary") ||
      textLower.includes("earn 3000") ||
      textLower.includes("earn 5000") ||
      textLower.includes("like youtube") ||
      textLower.includes("hotel review") ||
      textLower.includes("prepaid task") ||
      textLower.includes("vip task")
    ) {
      detectedType = "job-offer";
      baseScore = 48;
      detectedTactics.push("Unrealistic Daily Earning", "Deposit Task Trap");
    } else if (
      textLower.includes("kyc") ||
      textLower.includes("pan card") ||
      textLower.includes("account blocked") ||
      textLower.includes("sbi") ||
      textLower.includes("hdfc") ||
      textLower.includes("icici") ||
      textLower.includes("yono") ||
      textLower.includes("update pan") ||
      textLower.includes("netbanking")
    ) {
      detectedType = "fake-kyc-link";
      baseScore = 52;
      detectedTactics.push("Banking Credential Harvesting", "Account Suspension Fear");
    } else if (
      textLower.includes("scan qr") ||
      textLower.includes("qr code") ||
      textLower.includes("upi collect") ||
      textLower.includes("olx") ||
      textLower.includes("scan to receive") ||
      textLower.includes("enter pin to receive")
    ) {
      detectedType = "upi-refund-qr";
      baseScore = 48;
      detectedTactics.push("UPI Inversion Trick", "False Payment Authority");
    } else if (
      textLower.includes("fedex") ||
      textLower.includes("customs") ||
      textLower.includes("dhl") ||
      textLower.includes("parcel detained") ||
      textLower.includes("taiwan")
    ) {
      detectedType = "courier-customs";
      baseScore = 50;
      detectedTactics.push("Detained Cargo Lure", "Fake Customs Penalty");
    } else if (
      textLower.includes("instant loan") ||
      textLower.includes("loan app") ||
      textLower.includes("morphed photo") ||
      textLower.includes("contacts leaked") ||
      textLower.includes("recovery agent")
    ) {
      detectedType = "loan-app-harassment";
      baseScore = 58;
      detectedTactics.push("Intimidation & Contact Doxxing", "Predatory Interest Scheme");
    } else if (
      textLower.includes("sextortion") ||
      textLower.includes("video leak") ||
      textLower.includes("facebook relatives") ||
      textLower.includes("nude video") ||
      textLower.includes("blackmail")
    ) {
      detectedType = "sextortion";
      baseScore = 65;
      detectedTactics.push("Reputational Blackmail", "Extortion Deadline");
    } else if (
      textLower.includes("lottery") ||
      textLower.includes("kbc") ||
      textLower.includes("won 25 lakh") ||
      textLower.includes("lucky draw")
    ) {
      detectedType = "lottery-prize";
      baseScore = 38;
      detectedTactics.push("Advance Fee Fraud", "Fictitious Prize Lure");
    }

    // 3. Dynamic Score Modulation via Behavioral Heuristics
    let dynamicScore = baseScore;

    // A. Extreme Urgency Indicator (+12 pts)
    if (
      textLower.includes("tonight") ||
      textLower.includes("9:30") ||
      textLower.includes("immediately") ||
      textLower.includes("within 2 hours") ||
      textLower.includes("today itself") ||
      textLower.includes("24 hours") ||
      textLower.includes("urgent") ||
      textLower.includes("last chance")
    ) {
      dynamicScore += 12;
      detectedTactics.push("High Pressure Urgency");
    }

    // B. Severe Coercion / Threat Indicator (+16 pts)
    if (
      textLower.includes("arrest") ||
      textLower.includes("jail") ||
      textLower.includes("fir") ||
      textLower.includes("court") ||
      textLower.includes("police") ||
      textLower.includes("disconnect") ||
      textLower.includes("block") ||
      textLower.includes("raid")
    ) {
      dynamicScore += 16;
      detectedTactics.push("Punitive Threat & Coercion");
    }

    // C. Credential / Remote Access Harvesting (+18 pts)
    if (
      textLower.includes("otp") ||
      textLower.includes("pin") ||
      textLower.includes("password") ||
      textLower.includes("cvv") ||
      textLower.includes("anydesk") ||
      textLower.includes("rustdesk") ||
      textLower.includes("teamviewer") ||
      textLower.includes("apk") ||
      textLower.includes(".apk")
    ) {
      dynamicScore += 18;
      detectedTactics.push("Credential / APK Harvesting");
    }

    // D. Unverified Link or Channel Escalation (+10 pts)
    if (urlMatch || channel === "link" || channel === "upi") {
      dynamicScore += 10;
      detectedTactics.push("Unverified Link / Channel Vector");
    }

    // Clamp score within 15 to 98
    dynamicScore = Math.min(98, Math.max(18, dynamicScore));

    // Dynamic Risk Band Evaluation
    let riskBand = "Low";
    if (dynamicScore >= 85) {
      riskBand = "Critical";
    } else if (dynamicScore >= 66) {
      riskBand = "High";
    } else if (dynamicScore >= 35) {
      riskBand = "Suspicious";
    }

    let explanation = `Identified tactics: ${detectedTactics.slice(0, 3).join(", ")}.`;
    if (detectedType !== "general-fraud") {
      explanation = `Matches verified Indian ${detectedType.replace("-", " ")} signatures. ${explanation}`;
    }

    return {
      identType,
      identVal,
      detectedType,
      dynamicScore,
      riskBand,
      detectedTactics,
      explanation,
    };
  };

  // Haversine distance in kilometers
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // 2 to 3 km privacy-preserving spatial generalization
  const resolveZoneWithinRange = async (lat, lng) => {
    const angle = Math.random() * 2 * Math.PI;
    const offsetDistanceKm = 2.0 + Math.random() * 1.0;
    const dLat = (offsetDistanceKm / 111.32) * Math.cos(angle);
    const dLng = (offsetDistanceKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

    const fuzzedLat = lat + dLat;
    const fuzzedLng = lng + dLng;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${fuzzedLat}&lon=${fuzzedLng}&zoom=14&addressdetails=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "ScamRadar-India/1.0" } }
      );

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const regionalWard =
          addr.suburb ||
          addr.city_district ||
          addr.quarter ||
          addr.neighbourhood ||
          addr.town ||
          addr.village ||
          "Regional Safety Sector";
        const cityName = addr.city || addr.town || addr.county || "Bengaluru";
        const postCode = addr.postcode || "560001";
        const clusterLat = Math.round(fuzzedLat * 100) / 100;
        const clusterLng = Math.round(fuzzedLng * 100) / 100;

        return {
          pincode: postCode,
          locality: regionalWard,
          city: cityName,
          lat: clusterLat,
          lng: clusterLng,
          rangeLabel: `${offsetDistanceKm.toFixed(1)} km`,
        };
      }
    } catch (e) {}

    let matchedArea = KNOWN_AREAS[0];
    let minDiff = Infinity;
    for (const a of KNOWN_AREAS) {
      const dist = calculateDistanceKm(lat, lng, a.lat, a.lng);
      const diff = Math.abs(dist - 2.5);
      if (diff < minDiff) {
        minDiff = diff;
        matchedArea = a;
      }
    }

    return {
      ...matchedArea,
      rangeLabel: "2.5 km",
    };
  };

  const handleAutoLocationPermission = () => {
    setRequestingGps(true);
    if (!navigator.geolocation) {
      fallbackNearestArea("Metropolitan Zone");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const cluster = await resolveZoneWithinRange(latitude, longitude);
        setRequestingGps(false);

        setReportData((prev) => ({
          ...prev,
          pincode: cluster.pincode,
          locality: cluster.locality,
          city: cluster.city,
        }));

        if (onHighlightLocation) {
          onHighlightLocation({
            pincode: cluster.pincode,
            locality: cluster.locality,
            city: cluster.city,
            lat: cluster.lat,
            lng: cluster.lng,
          });
        }

        // Move to dynamic safety advice tailored to the detected scam
        promptDynamicSafetyAdvice(cluster);
      },
      () => {
        setRequestingGps(false);
        fallbackNearestArea("Regional Safety Zone");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const fallbackNearestArea = (label) => {
    const defaultZone = KNOWN_AREAS[1];
    setReportData((prev) => ({
      ...prev,
      pincode: defaultZone.pincode,
      locality: defaultZone.locality,
      city: defaultZone.city,
    }));
    if (onHighlightLocation) {
      onHighlightLocation(defaultZone);
    }
    promptDynamicSafetyAdvice(defaultZone);
  };

  const promptDynamicSafetyAdvice = (cluster) => {
    setStep("suggestions");
    const scamCategory = reportData.scam_type || "general-fraud";
    const adviceList = DYNAMIC_SAFETY_ADVICE[scamCategory] || DYNAMIC_SAFETY_ADVICE["general-fraud"];

    addBotMessage(
      `📍 Regional Cluster Mapped (~2–3 km): ${cluster.locality}, ${cluster.city} (PIN ${cluster.pincode}).\n\nWhat prevention guidance should we broadcast to protect fellow citizens in this cluster?`,
      adviceList
    );
  };

  const handleUserReply = async (text, payloadVal = null) => {
    setUiError("");
    const userVal = payloadVal || text.trim();
    if (!userVal) {
      setUiError("Please enter or select a response.");
      return;
    }

    const uniqueUserMsgId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [
      ...prev,
      {
        id: uniqueUserMsgId,
        sender: "user",
        text: text,
      },
    ]);
    setInput("");

    // Step 1: Channel selection
    if (step === "channel") {
      const channel = userVal;
      setReportData((prev) => ({ ...prev, channel }));
      setStep("content");
      addBotMessage(
        `Channel recorded: ${text}.\n\nPlease describe what was claimed, demanded, or paste the message text / sender phone number.`
      );
    }
    // Step 2: Content Analysis & Dynamic Verification
    else if (step === "content") {
      const userText = userVal;

      // Run our robust local NLP heuristic analysis first
      const localAnalysis = analyzeIncident(userText, reportData.channel);

      let finalScamType = localAnalysis.detectedType;
      let finalRiskScore = localAnalysis.dynamicScore;
      let finalRiskBand = localAnalysis.riskBand;
      let finalTactics = localAnalysis.detectedTactics;
      let finalExplanation = localAnalysis.explanation;
      let finalIdentType = localAnalysis.identType;
      let finalIdentVal = localAnalysis.identVal;

      // Attempt to query the backend deterministic checker to augment results
      try {
        const baseUrl = apiBaseUrl || "http://localhost:8000";
        const checkRes = await fetch(`${baseUrl}/check?stream=false`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userText, ui_language: "en" }),
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.scam_type && checkData.scam_type !== "other") {
            finalScamType = checkData.scam_type;
          }
          if (checkData.score && checkData.score > 0) {
            finalRiskScore = checkData.score;
            finalRiskBand = checkData.band || finalRiskBand;
          }
          if (checkData.tactics && checkData.tactics.length > 0) {
            finalTactics = Array.from(new Set([...finalTactics, ...checkData.tactics]));
          }
          if (checkData.explanation && checkData.explanation.length > 0) {
            finalExplanation = checkData.explanation.slice(0, 2).join(" ");
          }
        }
      } catch (err) {
        // Local deterministic engine guarantees dynamic operation even if backend fluctuates
      }

      setReportData((prev) => ({
        ...prev,
        note: userText,
        identifier_type: finalIdentType,
        identifier_value: finalIdentVal,
        scam_type: finalScamType,
        predicted_risk: finalRiskScore,
        predicted_band: finalRiskBand,
        predicted_tactics: finalTactics,
      }));

      // Render the Scam Pattern Verification Card
      addBotMessage(
        "",
        null,
        {
          type: "prediction_card",
          scam_type: finalScamType.toUpperCase(),
          risk_score: finalRiskScore,
          risk_band: finalRiskBand,
          explanation: finalExplanation,
          masked_message: scrubPII(userText),
        }
      );

      // Transition to DYNAMIC investigative question tailored to detected scam
      setStep("investigation_question");
      const config = SCAM_INVESTIGATION_QUESTIONS[finalScamType] || SCAM_INVESTIGATION_QUESTIONS["general-fraud"];
      addBotMessage(
        `${config.question}\n\n${config.prompt}`,
        config.replies
      );
    }
    // Step 3: Investigative Tactic Follow-Up
    else if (step === "investigation_question") {
      setReportData((prev) => ({
        ...prev,
        investigation_tactic: text,
      }));

      // Transition to Dynamic Financial Loss Assessment
      setStep("financial_loss");
      addBotMessage(
        `Noted: "${text}".\n\nDid you suffer any financial loss in this incident, or did you detect the deception in time?`,
        [
          { label: "🛡️ No Money Lost (₹0 - Caught in Time)", value: "loss_0" },
          { label: "💸 Small Loss (Under ₹10,000 lost)", value: "loss_10k" },
          { label: "⚠️ Moderate Loss (₹10,000 to ₹50,000 lost)", value: "loss_50k" },
          { label: "🚨 Severe Loss (Over ₹50,000 lost)", value: "loss_high" },
        ]
      );
    }
    // Step 4: Financial Loss Assessment
    else if (step === "financial_loss") {
      let lossInr = 0;
      let isHighLoss = false;

      if (userVal === "loss_10k") {
        lossInr = 5000;
        isHighLoss = true;
      } else if (userVal === "loss_50k") {
        lossInr = 25000;
        isHighLoss = true;
      } else if (userVal === "loss_high") {
        lossInr = 75000;
        isHighLoss = true;
      } else if (!userVal.startsWith("loss_0")) {
        const parsed = parseFloat(userVal.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed) && parsed > 0) {
          lossInr = parsed;
          isHighLoss = true;
        }
      }

      setReportData((prev) => ({
        ...prev,
        amount_lost_inr: lossInr,
        // Dynamically elevate score if financial loss occurred
        predicted_risk: isHighLoss ? Math.min(99, (prev.predicted_risk || 50) + 15) : prev.predicted_risk,
        predicted_band: isHighLoss ? "Critical" : prev.predicted_band,
      }));

      if (isHighLoss) {
        addBotMessage(
          `🚨 URGENT RECOVERY PROTOCOL:\nSince money was transferred, call national cybercrime helpline 1930 immediately!\n\nUnder the I4C CFCFRMS protocol, reporting within the golden hour triggers an instant freeze on the scammer's mule bank account before cash withdrawal.`
        );
      }

      // Transition to Location Cluster Detection
      setStep("location_permission");
      addBotMessage(
        "To warn residents in your locality without compromising your privacy, please authorize broad neighborhood cluster detection (~2 to 3 km zone).",
        null,
        { type: "location_prompt_card" }
      );
    }
    // Step 5: Suggestions
    else if (step === "suggestions") {
      let suggestionsList = [];
      if (userVal !== "sug_none") {
        suggestionsList = [text];
      }
      setReportData((prev) => ({ ...prev, suggestions: suggestionsList }));
      setStep("save_confirm");

      addBotMessage(
        `Guidance registered: "${text}".\n\nWould you like to publish this report anonymously to the national threat map to protect other citizens?`,
        [
          { label: "Yes, publish anonymously to map", value: "confirm_save" },
          { label: "No, cancel report", value: "cancel" },
        ]
      );
    }
    // Step 6: Save Confirmation
    else if (step === "save_confirm") {
      if (userVal === "cancel") {
        addBotMessage("Report submission cancelled. No data has been saved.");
        setStep("done");
        return;
      }

      setStep("notifications");
      addBotMessage(
        "Do you want to receive real-time alerts if a scam surge or new pattern emerges in your cluster?",
        [
          { label: "🔔 Notify me with surge alerts", value: "alerts_yes" },
          { label: "No thanks, just save report", value: "alerts_no" },
        ]
      );
    }
    // Step 7: Push Notifications Opt-In & Submission
    else if (step === "notifications") {
      if (userVal === "alerts_yes") {
        if (typeof window !== "undefined" && "Notification" in window) {
          try {
            const perm = await Notification.requestPermission();
            if (perm === "granted") {
              new Notification("ScamRadar Surge Alert Active", {
                body: "Real-time scam surge alerts enabled for your safety cluster.",
                icon: "/favicon.ico",
              });
            }
          } catch (e) {}
        }

        const updated = {
          ...reportData,
          wants_notifications: true,
          contact_for_alerts: "browser_push",
        };
        setReportData(updated);
        addBotMessage("Browser notifications activated for your safety zone! 🔔\n\nSubmitting report to community threat registry...");
        setTimeout(() => {
          submitReportToDB(updated);
        }, 500);
      } else {
        addBotMessage("Understood. Publishing your report anonymously...");
        setTimeout(() => {
          submitReportToDB({ ...reportData, wants_notifications: false });
        }, 500);
      }
    }
  };

  const submitReportToDB = async (finalData) => {
    setSubmitting(true);
    setUiError("");

    try {
      const reporterId =
        localStorage.getItem("scamradar_reporter_id") ||
        `rep_${Math.random().toString(36).substring(2, 12)}`;
      localStorage.setItem("scamradar_reporter_id", reporterId);

      let fullNote = finalData.note || "Report submitted by citizen";
      if (finalData.investigation_tactic) {
        fullNote += ` [Tactic: ${finalData.investigation_tactic}]`;
      }
      if (finalData.suggestions && finalData.suggestions.length > 0) {
        fullNote += ` [Safety Advice: ${finalData.suggestions.join("; ")}]`;
      }

      const payload = {
        case_id: `CASE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        reporter_id: reporterId,
        ip_prefix: "49.207.12.0",
        occurred_at: new Date().toISOString(),
        channel: finalData.channel === "phone_call" ? "Phone call" : finalData.channel === "upi" ? "UPI request" : "SMS",
        scam_type: finalData.scam_type || "digital-arrest",
        identifier_type: finalData.identifier_type || "phone",
        identifier_value: finalData.identifier_value || "+919876500000",
        pincode: finalData.pincode || "560001",
        locality: finalData.locality || "Central Zone",
        city: finalData.city || "Bengaluru",
        amount_lost_inr: finalData.amount_lost_inr || null,
        note: fullNote,
      };

      const baseUrl = apiBaseUrl || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || errData.error || "Failed to save report.");
      }

      const resData = await res.json();
      setReceipt(resData);
      setStep("done");

      addBotMessage(
        `✅ Report successfully logged!\n\nCase ID: ${resData.case_id}\nCluster: ${finalData.locality || "Bengaluru"} (${finalData.pincode || "560001"})\nStatus: Broadcast to Live Threat Map\n\nThank you for shielding your community! 🛡️`
      );

      if (onSuccess) {
        onSuccess(resData);
      }
    } catch (err) {
      setUiError(err.message || "Network error while saving report.");
      addBotMessage(`⚠️ Unable to complete database sync: ${err.message}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const getBandBadge = (band, score) => {
    const b = (band || "").toLowerCase();
    if (b === "critical" || score >= 85) {
      return {
        bg: "bg-[#E5201B] text-[#F7F7F2] font-black animate-pulse",
        border: "border-[#E5201B]",
        label: "Critical Threat",
      };
    }
    if (b === "high" || score >= 66) {
      return {
        bg: "bg-[#E5201B] text-[#F7F7F2] font-bold",
        border: "border-[#E5201B]",
        label: "High Threat",
      };
    }
    if (b === "suspicious" || score >= 35) {
      return {
        bg: "bg-[#0A0A0A] text-[#F7F7F2] font-bold",
        border: "border-[#0A0A0A]",
        label: "Suspicious",
      };
    }
    return {
      bg: "bg-[#23E000] text-[#0A0A0A] font-bold border border-[#0A0A0A]",
      border: "border-[#23E000]",
      label: "Low Risk",
    };
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150 animate-fadeIn"
    >
      <div
        className={`relative w-full ${
          isExpanded ? "max-w-2xl" : "max-w-md"
        } max-h-[92vh] flex flex-col bg-[#F7F7F2] border border-[#0A0A0A] rounded-[14px] p-5 sm:p-6 text-[#0A0A0A] shadow-2xl transition-all duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">
                Citizen Fraud Intake & Telemetry
              </h2>
              <p className="text-[11px] opacity-70">
                AI Pattern Verification & Zero-Knowledge Community Map
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Minimize" : "Expand"}
              className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-3.5 py-4">
          {messages.map((m, idx) => (
            <div
              key={`${m.id}-${idx}`}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`flex gap-2 max-w-[90%] sm:max-w-[85%] ${
                  m.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-[#0A0A0A] ${
                    m.sender === "user"
                      ? "bg-[#0A0A0A] text-[#F7F7F2]"
                      : "bg-[#23E000] text-[#0A0A0A]"
                  }`}
                >
                  {m.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-2">
                  {m.text && (
                    <div
                      className={`p-3 rounded-[10px] border border-[#0A0A0A] text-xs whitespace-pre-line leading-relaxed ${
                        m.sender === "user"
                          ? "bg-[#0A0A0A] text-[#F7F7F2]"
                          : "bg-[#F7F7F2] text-[#0A0A0A]"
                      }`}
                    >
                      {m.text}
                    </div>
                  )}

                  {/* Dynamic Scam Pattern Verification Card */}
                  {m.card && m.card.type === "prediction_card" && (() => {
                    const badge = getBandBadge(m.card.risk_band, m.card.risk_score);
                    return (
                      <div className="rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] overflow-hidden shadow-sm">
                        <div className="px-4 py-2.5 bg-[#0A0A0A] text-[#F7F7F2] flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Scam Pattern Verification
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-[4px] text-[10px] ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(10,10,10,0.04)]">
                              <span className="opacity-70 text-[10px] uppercase font-bold block">
                                Detected Pattern:
                              </span>
                              <div className="font-black text-sm text-[#E5201B] mt-0.5 tracking-tight">
                                {m.card.scam_type}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(10,10,10,0.04)]">
                              <span className="opacity-70 text-[10px] uppercase font-bold block">
                                Severity Score:
                              </span>
                              <div className="font-black text-sm text-[#0A0A0A] mt-0.5">
                                {m.card.risk_score} / 100
                              </div>
                            </div>
                          </div>

                          <div className="text-xs p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(229,32,27,0.06)] leading-relaxed">
                            <strong>Finding:</strong> {m.card.explanation}
                          </div>

                          {/* Exact Reported Incident Message with Personal Info Masked */}
                          {m.card.masked_message && (
                            <div className="p-2.5 bg-white rounded-[8px] border border-[#0A0A0A]/30 text-xs space-y-1 font-mono">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#0A0A0A] uppercase flex items-center gap-1 font-sans">
                                  <Lock className="w-3 h-3 text-[#23E000]" />
                                  Reported Incident Message (Personal Info Masked)
                                </span>
                                <span className="text-[9px] bg-[#23E000]/25 text-[#0A0A0A] font-bold px-1.5 py-0.2 rounded font-sans">
                                  PII MASKED
                                </span>
                              </div>
                              <p className="text-[11px] text-[#0A0A0A] leading-relaxed whitespace-pre-wrap italic bg-[#F7F7F2] p-2 rounded border border-[#0A0A0A]/15">
                                "{m.card.masked_message}"
                              </p>
                              <span className="text-[9px] opacity-60 block font-sans">
                                ✓ Phone numbers, emails, and personal IDs automatically scrubbed to preserve privacy.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Location Cluster Prompt Card */}
                  {m.card && m.card.type === "location_prompt_card" && (
                    <div className="p-3.5 rounded-[10px] border border-[#0A0A0A] bg-[#23E000]/10 flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#0A0A0A]" />
                        <span className="font-bold text-[#0A0A0A]">
                          Location Privacy Rule: Broad Cluster Mapping (~2 to 3 km)
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 leading-relaxed">
                        Exact street and home GPS locations are strictly blocked and never stored. Permission only identifies your broad municipal/district safety cluster to warn neighboring citizens.
                      </p>
                      <button
                        onClick={handleAutoLocationPermission}
                        disabled={requestingGps}
                        className="mt-1 w-full min-h-[46px] px-4 py-2 bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Compass className="w-4 h-4 text-[#23E000]" />
                        <span>
                          {requestingGps ? "Detecting Regional Safety Cluster..." : "Allow & Detect Neighborhood Cluster"}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Dynamic Quick Reply Options */}
                  {m.quickReplies && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {m.quickReplies.map((btn) => (
                        <button
                          key={btn.value}
                          onClick={() => handleUserReply(btn.label, btn.value)}
                          disabled={submitting || step === "done"}
                          className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] border border-[#0A0A0A] text-xs font-bold uppercase transition cursor-pointer disabled:opacity-50 text-left"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* UI Error Banner */}
        {uiError && (
          <div className="mb-2 p-2.5 rounded-[8px] bg-[rgba(229,32,27,0.1)] border border-[#E5201B] text-xs font-bold text-[#E5201B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uiError}</span>
          </div>
        )}

        {/* Chat Input Bar */}
        {step !== "done" && (
          <div className="pt-2 border-t border-[#0A0A0A] shrink-0 space-y-2">
            {/* Active Continuous Voice Listening Banner with Auto-Detected Language */}
            {isListening && (
              <div className="px-3 py-1.5 rounded-[8px] bg-[#0A0A0A] text-[#F7F7F2] text-[11px] flex items-center justify-between border border-[#23E000] animate-in fade-in select-none">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#23E000] animate-ping shrink-0" />
                  <span className="font-mono font-bold text-[#23E000]">
                    VOICE ACTIVE // CONTINUOUS LISTENING
                  </span>
                  {detectedLangInfo && (
                    <span className="text-[10px] bg-[#23E000] text-[#0A0A0A] px-2 py-0.2 rounded font-bold font-mono">
                      AUTO-DETECTED: {detectedLangInfo.label} ({detectedLangInfo.native})
                    </span>
                  )}
                  <span className="text-[10px] opacity-70 hidden md:inline">
                    (Speaking in Telugu, Tamil, Kannada, or Hindi — Click voice icon to finish)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className="text-[10px] bg-[#E5201B] text-white hover:opacity-90 px-2.5 py-0.5 rounded font-bold cursor-pointer"
                >
                  STOP
                </button>
              </div>
            )}

            {/* Error Notification if mic is blocked */}
            {voiceNotice && !isListening && (
              <div className="px-3 py-1.5 rounded-[8px] bg-[rgba(229,32,27,0.1)] text-[#E5201B] text-[11px] border border-[#E5201B] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{voiceNotice}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isListening) {
                  stopVoiceRecording();
                }
                handleUserReply(input);
              }}
              className="flex gap-2 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={submitting}
                placeholder={
                  isListening
                    ? "Actively listening... speak in Telugu, Tamil, Kannada, or Hindi..."
                    : step === "content"
                    ? "Paste message text, claimed threat, or scammer number..."
                    : step === "financial_loss"
                    ? "Or type exact amount lost (e.g. ₹25,000 or ₹0)..."
                    : "Type reply or click voice icon to speak in your language..."
                }
                className="flex-1 min-h-[46px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-4 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />

              {/* 3rd uploaded image icon: Multilingual Voice Input AI Agent Button (Pure Waveform Icon - No Dropdowns) */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                disabled={submitting}
                title={
                  isListening
                    ? "Recording active... Click to stop"
                    : "Voice AI Agent: Auto-detects Telugu, Tamil, Kannada, Hindi. Click to speak"
                }
                className={`min-h-[46px] min-w-[46px] px-3.5 rounded-[8px] border transition flex items-center justify-center cursor-pointer ${
                  isListening
                    ? "bg-[#23E000] text-[#0A0A0A] shadow-[0_0_15px_rgba(35,224,0,0.6)] border-[#23E000] animate-pulse"
                    : "bg-[#F7F7F2] text-[#0A0A0A] border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2]"
                }`}
              >
                <VoiceWaveIcon className="w-5 h-5" isListening={isListening} />
              </button>

              {/* 2nd uploaded image icon: Send Arrow Button */}
              <button
                type="submit"
                disabled={submitting || !input.trim()}
                title="Send reply"
                className="min-h-[46px] min-w-[46px] px-3.5 bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] hover:bg-[#23E000] hover:text-[#0A0A0A] transition cursor-pointer disabled:opacity-40 flex items-center justify-center shrink-0 border border-[#0A0A0A]"
              >
                <SendArrowIcon className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
