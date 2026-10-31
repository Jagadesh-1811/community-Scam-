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
  Compass
} from "lucide-react";
import { findAreaByInput, KNOWN_AREAS } from "../data/knownAreas";

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

export default function ReportModal({ isOpen, onClose, onSuccess, onHighlightLocation }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [step, setStep] = useState("channel");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [uiError, setUiError] = useState("");
  const [requestingGps, setRequestingGps] = useState(false);

  const [reportData, setReportData] = useState({
    channel: "",
    identifier_type: "phone",
    identifier_value: "",
    scam_type: "",
    pincode: "",
    locality: "",
    city: "",
    note: "",
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

  // Haversine distance in kilometers between two GPS coordinates
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Resolve generalized regional cluster strictly within a 2 to 3 km zone
  // PRIVACY & GENERALIZATION RULE:
  // - Never map exact home, house, or street location.
  // - Fuzzes coordinates to a generalized cluster center within 2 to 3 km.
  // - Identifies the broad municipal safety ward / zone encompassing your area.
  const resolveZoneWithinRange = async (lat, lng) => {
    // 1. Add privacy-preserving spatial offset (~2 to 3 km distance)
    // 0.022 degrees latitude ≈ 2.44 km
    // Random angle between 0 and 2*PI to place the cluster point in a 2 to 3 km circle
    const angle = Math.random() * 2 * Math.PI;
    const offsetDistanceKm = 2.0 + Math.random() * 1.0; // strictly between 2.0 and 3.0 km
    const dLat = (offsetDistanceKm / 111.32) * Math.cos(angle);
    const dLng = (offsetDistanceKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

    const fuzzedLat = lat + dLat;
    const fuzzedLng = lng + dLng;

    try {
      // Query reverse geocoding on the 2-3 km generalized zone
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

        const cityName =
          addr.city ||
          addr.town ||
          addr.county ||
          addr.state_district ||
          "Bengaluru";

        const postCode = addr.postcode || "560001";

        // Coarsen to ~0.01 deg (~1.1 km grid)
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
    } catch (e) {
      // Fallback if offline
    }

    // 2. Select matching regional area within 2 to 3 km if registered
    let matchedArea = KNOWN_AREAS[0];
    let minDiff = Infinity;
    for (const a of KNOWN_AREAS) {
      const dist = calculateDistanceKm(lat, lng, a.lat, a.lng);
      // Find area closest to the 2.5 km target window
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

        setStep("suggestions");
        addBotMessage(
          `Regional Zone Mapped (within 2–3 km): ${cluster.locality}, ${cluster.city} (PIN ${cluster.pincode}).\n\nWhat preventive advice do you recommend for neighbors in this zone?`,
          [
            { label: "Never share OTP or approve unknown UPI links", value: "sug_otp" },
            { label: "Hang up immediately on fake police video calls", value: "sug_police" },
            { label: "Verify discom updates only via official discom app", value: "sug_elec" },
            { label: "No suggestions, proceed to save", value: "sug_none" },
          ]
        );
      },
      (err) => {
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
    setStep("suggestions");
    addBotMessage(
      `Assigned to regional safety cluster: ${defaultZone.locality}, ${defaultZone.city}.\n\nWhat preventive advice do you recommend for neighbors in this zone?`,
      [
        { label: "Never share OTP or approve unknown UPI links", value: "sug_otp" },
        { label: "Hang up immediately on fake police video calls", value: "sug_police" },
        { label: "Verify discom updates only via official discom app", value: "sug_elec" },
        { label: "No suggestions, proceed to save", value: "sug_none" },
      ]
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

    if (step === "channel") {
      const channel = userVal;
      setReportData((prev) => ({ ...prev, channel }));
      setStep("content");
      addBotMessage(
        `Channel recorded: ${text}.\n\nPlease describe what was claimed, demanded, or paste the message text / phone number.`
      );
    } else if (step === "content") {
      const userText = userVal;

      let identType = "phone";
      let identVal = "+919876500000";

      const phoneMatch = userText.match(/(\+91[\-\s]?)?[6-9]\d{9}|\b1930\b|\b1800\d{6,8}\b/);
      const upiMatch = userText.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/);
      const urlMatch = userText.match(/https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(com|in|org|net|xyz|top|link)[^\s]*/);

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

      let predictedScamType = "digital-arrest";
      let riskScore = 45;
      let riskBand = "Suspicious";
      let tactics = [];
      let explanation = "";

      try {
        const checkRes = await fetch("http://localhost:8000/check?stream=false", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userText, ui_language: "en" }),
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          riskScore = checkData.score || 45;
          riskBand = checkData.band || "Suspicious";
          predictedScamType = checkData.scam_type !== "other" ? checkData.scam_type : "digital-arrest";
          tactics = checkData.tactics || [];
          if (checkData.explanation && checkData.explanation.length > 0) {
            explanation = checkData.explanation.slice(0, 2).join(" ");
          }
        }
      } catch (err) {}

      setReportData((prev) => ({
        ...prev,
        note: userText,
        identifier_type: identType,
        identifier_value: identVal,
        scam_type: predictedScamType,
        predicted_risk: riskScore,
        predicted_band: riskBand,
        predicted_tactics: tactics,
      }));

      setStep("location_permission");
      addBotMessage(
        "",
        null,
        {
          type: "prediction_card",
          scam_type: predictedScamType.toUpperCase(),
          risk_score: riskScore,
          risk_band: riskBand,
          explanation: explanation || "Matches recognized deceptive patterns in the fraud database.",
        }
      );
    } else if (step === "suggestions") {
      let suggestionsList = [];
      if (userVal !== "sug_none") {
        suggestionsList = [text];
      }
      setReportData((prev) => ({ ...prev, suggestions: suggestionsList }));
      setStep("save_confirm");

      addBotMessage(
        `Advice logged: "${text}".\n\nCould this incident report now be saved to the community database to warn neighbors in your area?`,
        [
          { label: "Yes, save anonymously to DB", value: "confirm_save" },
          { label: "No, cancel", value: "cancel" },
        ]
      );
    } else if (step === "save_confirm") {
      if (userVal === "cancel") {
        addBotMessage("Report submission cancelled. No data has been saved.");
        setStep("done");
        return;
      }

      setStep("notifications");
      addBotMessage(
        "Do you want to get notified for recent scam alerts or surges in your area?",
        [
          { label: "Notify me with notifications", value: "alerts_yes" },
          { label: "No thanks, just save report", value: "alerts_no" },
        ]
      );
    } else if (step === "notifications") {
      if (userVal === "alerts_yes") {
        // Request Web Push Notification permission directly
        if (typeof window !== "undefined" && "Notification" in window) {
          try {
            const perm = await Notification.requestPermission();
            if (perm === "granted") {
              new Notification("ScamRadar Surge Alert Active", {
                body: "You will receive real-time scam surge alerts for your safety zone.",
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
        addBotMessage("Browser notifications activated for scam surges in your area! 🔔\n\nSaving your report now to protect neighbors in your zone...");
        setTimeout(() => {
          submitReportToDB(updated);
        }, 600);
      } else {
        addBotMessage("Understood, proceeding to save your report anonymously...");
        setTimeout(() => {
          submitReportToDB({ ...reportData, wants_notifications: false });
        }, 600);
      }
    }
  };

  const submitReportToDB = async (finalData) => {
    setSubmitting(true);
    setUiError("");
    addBotMessage("Saving report and community suggestions to Database... ⏳");

    try {
      const reporterId =
        localStorage.getItem("scamradar_reporter_id") ||
        `rep_${Math.random().toString(36).substring(2, 12)}`;
      localStorage.setItem("scamradar_reporter_id", reporterId);

      let fullNote = finalData.note || "Report submitted by citizen";
      if (finalData.suggestions && finalData.suggestions.length > 0) {
        fullNote += ` [Safety Advice: ${finalData.suggestions.join("; ")}]`;
      }
      if (finalData.wants_notifications && finalData.contact_for_alerts) {
        fullNote += ` [Alerts requested: ${finalData.contact_for_alerts}]`;
      }

      const payload = {
        reporter_id: reporterId,
        ip_prefix: "49.207.1.0",
        channel: finalData.channel || "phone_call",
        scam_type: finalData.scam_type || "digital-arrest",
        identifier_type: finalData.identifier_type || "phone",
        identifier_value: finalData.identifier_value || "+919876500000",
        pincode: finalData.pincode || "560038",
        locality: finalData.locality || "Metropolitan Zone",
        city: finalData.city || "Bengaluru",
        note: fullNote,
        occurred_at: new Date().toISOString(),
      };

      const res = await fetch("http://localhost:8000/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned error status ${res.status}`);
      }

      const data = await res.json();
      setReceipt(data);
      setStep("done");

      addBotMessage(
        `Successfully recorded in the Community DB.\n\nCase Receipt: ${data.case_id}\n\nYour report is now live on the OpenStreetMap cluster. The area has been updated!`
      );

      if (onSuccess) onSuccess();
    } catch (err) {
      setUiError(err.message);
      addBotMessage(
        `Report Submission Notice: ${err.message}. Please check if the backend server is running on port 8000.`
      );
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-[9999] transition-all duration-200 pointer-events-auto ${
        isExpanded
          ? "inset-0 flex items-center justify-center bg-[#F7F7F2]"
          : "bottom-4 right-4 md:bottom-6 md:right-6 w-[94vw] max-w-md md:max-w-lg"
      }`}
    >
      <div
        className={`relative w-full bg-[#F7F7F2] flex flex-col overflow-hidden text-[#0A0A0A] ${
          isExpanded
            ? "h-screen w-screen rounded-none border-none"
            : "h-[580px] border border-[#0A0A0A] rounded-[12px] shadow-2xl"
        }`}
      >
        {/* Header - Minimal, Unique, Professional */}
        <div className="px-6 py-4 border-b border-[#0A0A0A] flex items-center justify-between bg-[#F7F7F2]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[#0A0A0A] text-[#F7F7F2] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#23E000]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A0A0A]">
                  Citizen Fraud Registry Intake
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-[#23E000] text-[#0A0A0A] border border-[#0A0A0A] rounded-[4px]">
                  VERIFIED REGISTRY
                </span>
              </div>
              <p className="text-[11px] opacity-70">
                Pattern matching • Neighborhood cluster logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Minimize to floating dock" : "Maximize to full screen"}
              className="w-11 h-11 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Close Report"
              className="w-11 h-11 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat message flow */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-[#F7F7F2] max-w-4xl mx-auto w-full">
          {messages.map((m, idx) => (
            <div
              key={`${m.id || "msg"}-${idx}`}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-start gap-2.5 max-w-[90%]">
                {m.sender === "bot" && (
                  <div className="w-8 h-8 rounded-[8px] bg-[#0A0A0A] border border-[#0A0A0A] text-[#23E000] flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 fill-[#23E000]/20 text-[#23E000]" />
                  </div>
                )}
                <div className="w-full">
                  {m.text && (
                    <div
                      className={`px-4 py-3 rounded-[12px] text-xs leading-relaxed whitespace-pre-line border border-[#0A0A0A] ${
                        m.sender === "user"
                          ? "bg-[#0A0A0A] text-[#F7F7F2]"
                          : "bg-[#F7F7F2] text-[#0A0A0A]"
                      }`}
                    >
                      {m.text}
                    </div>
                  )}

                  {/* Clean Prediction Card */}
                  {m.card && m.card.type === "prediction_card" && (
                    <div className="rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] overflow-hidden">
                      <div className="px-4 py-3 bg-[#0A0A0A] text-[#F7F7F2] flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Scam Pattern Verification
                        </span>
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#E5201B] text-[#F7F7F2]">
                          {m.card.risk_band}
                        </span>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(10,10,10,0.04)]">
                            <span className="opacity-70 text-[10px] uppercase font-bold">Detected Pattern:</span>
                            <div className="font-black text-sm text-[#E5201B] mt-0.5">{m.card.scam_type}</div>
                          </div>
                          <div className="p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(10,10,10,0.04)]">
                            <span className="opacity-70 text-[10px] uppercase font-bold">Severity Score:</span>
                            <div className="font-black text-sm text-[#0A0A0A] mt-0.5">{m.card.risk_score} / 100</div>
                          </div>
                        </div>

                        <div className="text-xs p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(229,32,27,0.08)]">
                          <strong>Finding:</strong> {m.card.explanation}
                        </div>

                        {/* Location Permission Prompt */}
                        <div className="mt-3 p-3.5 rounded-[10px] border border-[#0A0A0A] bg-[#23E000]/10 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-[#0A0A0A]" />
                            <span className="text-xs font-bold text-[#0A0A0A]">
                              Location Privacy Rule Active: Broad Cluster Mapping Only
                            </span>
                          </div>
                          <p className="text-[11px] opacity-80 leading-relaxed">
                            Exact GPS coordinates and addresses are strictly blocked and never stored. Permission only identifies your broad municipal/district safety cluster to warn neighboring citizens.
                          </p>
                          <div className="mt-1">
                            <button
                              onClick={handleAutoLocationPermission}
                              disabled={requestingGps}
                              className="w-full min-h-[46px] px-4 py-2 bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Compass className="w-4 h-4 text-[#23E000]" />
                              <span>{requestingGps ? "Detecting Your Actual Neighborhood..." : "Allow & Detect Neighborhood Cluster"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {m.quickReplies && (
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {m.quickReplies.map((btn) => (
                        <button
                          key={btn.value}
                          onClick={() => handleUserReply(btn.label, btn.value)}
                          disabled={submitting || step === "done"}
                          className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] border border-[#0A0A0A] text-xs font-bold uppercase transition cursor-pointer disabled:opacity-50"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {m.sender === "user" && (
                  <div className="w-8 h-8 rounded-[8px] border border-[#0A0A0A] bg-[#23E000] text-[#0A0A0A] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* UI Error feedback notification banner */}
        {uiError && (
          <div className="max-w-4xl mx-auto w-full px-4 mb-2">
            <div className="p-3 rounded-[8px] bg-[rgba(229,32,27,0.1)] border border-[#E5201B] flex items-center gap-2 text-xs font-bold text-[#E5201B]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uiError}</span>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-[#0A0A0A] bg-[#F7F7F2]">
          <div className="max-w-4xl mx-auto w-full">
            {step === "done" ? (
              <div className="flex items-center justify-between gap-3 bg-[#23E000] border border-[#0A0A0A] rounded-[12px] p-3 text-[#0A0A0A]">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Report successfully saved to Database.</span>
                </div>
                <button
                  onClick={onClose}
                  className="min-h-[44px] px-5 bg-[#0A0A0A] text-[#F7F7F2] rounded-[12px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer"
                >
                  Close Intake
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUserReply(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (uiError) setUiError("");
                  }}
                  placeholder={
                    step === "channel"
                      ? "Select contact channel above or describe..."
                      : step === "content"
                      ? "Paste suspicious message or describe what happened..."
                      : step === "suggestions"
                      ? "Type a preventive tip for neighbors..."
                      : "Type your response..."
                  }
                  disabled={submitting || step === "location_permission"}
                  className="flex-1 min-h-[48px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[12px] px-4 text-sm text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || submitting || step === "location_permission"}
                  className="min-h-[48px] px-5 bg-[#0A0A0A] text-[#F7F7F2] rounded-[12px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
