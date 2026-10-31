"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  X,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Mail,
  FileText,
  AlertTriangle,
  Lock,
  ChevronRight,
  Filter,
  UserCheck,
  LogOut,
  KeyRound,
  Shield,
  BadgeAlert,
} from "lucide-react";

export default function AdminQueueModal({ isOpen, onClose, apiBaseUrl, onDisputeDecided }) {
  // Authentication State
  const [adminToken, setAdminToken] = useState("");
  const [officerInfo, setOfficerInfo] = useState(null);
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Queue State
  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("under_review");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [acting, setActing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const baseUrl = apiBaseUrl || "http://localhost:8000";

  // Check persisted session when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedToken = sessionStorage.getItem("scamradar_admin_token");
      const savedOfficer = sessionStorage.getItem("scamradar_admin_officer");
      if (savedToken) {
        setAdminToken(savedToken);
        if (savedOfficer) {
          try {
            setOfficerInfo(JSON.parse(savedOfficer));
          } catch (e) {
            setOfficerInfo({ officer_name: "Grievance Officer", badge_id: "CYBER-GOV-01" });
          }
        }
      }
    }
  }, [isOpen]);

  // Fetch disputes when token or filter changes
  useEffect(() => {
    if (isOpen && adminToken) {
      fetchDisputes();
    }
  }, [isOpen, adminToken, statusFilter]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed. Check credentials.");
      }

      setAdminToken(data.token);
      const officer = {
        officer_name: data.officer_name,
        badge_id: data.badge_id,
      };
      setOfficerInfo(officer);
      sessionStorage.setItem("scamradar_admin_token", data.token);
      sessionStorage.setItem("scamradar_admin_officer", JSON.stringify(officer));
      setLoginPassword("");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAdminToken("");
    setOfficerInfo(null);
    setDisputes([]);
    setSelectedDispute(null);
    sessionStorage.removeItem("scamradar_admin_token");
    sessionStorage.removeItem("scamradar_admin_officer");
  };

  const fetchDisputes = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const url = statusFilter
        ? `${baseUrl}/admin/disputes?status=${statusFilter}`
        : `${baseUrl}/admin/disputes`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (res.status === 401) {
        handleLogout();
        throw new Error("Session expired or unauthorized. Please log in again.");
      }

      if (!res.ok) throw new Error("Failed to load disputes from admin API.");
      const data = await res.json();
      setDisputes(data.items || []);
      setTotal(data.total || 0);

      // Keep selection or pick first
      if (data.items?.length > 0) {
        if (!selectedDispute || !data.items.find((d) => d.challenge_id === selectedDispute.challenge_id)) {
          setSelectedDispute(data.items[0]);
        }
      } else {
        setSelectedDispute(null);
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to reach backend." });
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision) => {
    if (!selectedDispute) return;
    setActing(true);
    setFeedback(null);
    try {
      const res = await fetch(`${baseUrl}/admin/disputes/${selectedDispute.challenge_id}/decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          decision,
          decision_note: decisionNote.trim() || `Reviewed and ${decision} by Grievance Cell Officer.`,
        }),
      });

      if (res.status === 401) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Decision failed.");

      setFeedback({
        type: "success",
        message: decision === "approved"
          ? `Dispute ${selectedDispute.challenge_id} approved. Identifier is shielded as VERIFIED_BUSINESS.`
          : `Dispute ${selectedDispute.challenge_id} rejected. Scoring restored.`,
      });
      setDecisionNote("");
      if (onDisputeDecided) onDisputeDecided();
      fetchDisputes();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#F7F7F2] border border-[#0A0A0A] rounded-[16px] p-5 text-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#23E000]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wider">
                  Admin Grievance & Dispute Queue
                </h2>
                <span className="px-2 py-0.5 rounded-[4px] bg-[#0A0A0A] text-[#23E000] text-[10px] font-mono font-bold">
                  {adminToken ? "OFFICER AUTHENTICATED" : "PROTECTED ROUTE"}
                </span>
              </div>
              <p className="text-[11px] opacity-70">
                Official dispute resolution portal for certified grievance cell officers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminToken && (
              <>
                <button
                  onClick={fetchDisputes}
                  title="Refresh queue"
                  className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={handleLogout}
                  title="Logout officer"
                  className="h-9 px-3 flex items-center gap-1.5 rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#E5201B] hover:text-[#F7F7F2] hover:border-[#E5201B] transition cursor-pointer text-xs font-bold uppercase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN A: ADMIN LOGIN GATE (WHEN NOT AUTHENTICATED)
           ══════════════════════════════════════════════════════════════════════ */}
        {!adminToken ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-5 animate-fadeIn">
            <div className="w-14 h-14 rounded-[14px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center border-2 border-[#23E000]/40 shadow-lg">
              <Lock className="w-7 h-7 text-[#23E000]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black uppercase tracking-wide">
                Grievance Officer Authentication
              </h3>
              <p className="text-xs opacity-75 leading-relaxed">
                Protected administration zone. Access requires an official Cyber Crime Grievance Officer session.
              </p>
            </div>

            {loginError && (
              <div className="w-full p-3 rounded-[8px] bg-[rgba(229,32,27,0.1)] border border-[#E5201B] text-xs font-bold text-[#E5201B] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="w-full space-y-3">
              <div>
                <label className="text-[11px] uppercase font-bold opacity-75 block mb-1">
                  Officer Username / ID
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full min-h-[44px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-3.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold opacity-75 block mb-1">
                  Security Passphrase / Admin Key
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter officer password"
                  required
                  className="w-full min-h-[44px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-3.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              {/* Demo Credentials Quick-Fill Pill for Evaluators */}
              <div
                onClick={() => {
                  setLoginUsername("admin");
                  setLoginPassword("scamradar-admin-2026");
                }}
                className="p-2.5 bg-[#0A0A0A]/5 border border-dashed border-[#0A0A0A]/40 rounded-[8px] text-[11px] cursor-pointer hover:bg-[#0A0A0A]/10 transition flex items-center justify-between"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#0A0A0A]" />
                  <span>Click to auto-fill evaluator credentials:</span>
                </span>
                <span className="font-mono text-[10px] bg-[#0A0A0A] text-[#F7F7F2] px-2 py-0.5 rounded-[4px] font-bold">
                  admin / scamradar-admin-2026
                </span>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full min-h-[46px] bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs font-black uppercase hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loggingIn ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#F7F7F2]/30 border-t-[#F7F7F2] rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-[#23E000]" />
                    <span>Authenticate & Access Queue</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════
              SCREEN B: AUTHENTICATED DISPUTE QUEUE
             ══════════════════════════════════════════════════════════════════════ */
          <>
            {/* Officer Profile & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between py-2.5 border-b border-[#0A0A0A]/20 shrink-0 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-[6px] bg-[#0A0A0A] text-[#23E000] font-mono text-[11px] font-bold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{officerInfo?.officer_name || "Senior Officer"}</span>
                  <span className="opacity-60 text-[9px]">({officerInfo?.badge_id || "CYBER-GOV-01"})</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 opacity-60" />
                <span className="text-[11px] font-bold uppercase opacity-70">Status:</span>
                {[
                  { id: "under_review", label: "Under Review" },
                  { id: "approved", label: "Approved" },
                  { id: "rejected", label: "Rejected" },
                  { id: "", label: "All Cases" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase transition cursor-pointer border border-[#0A0A0A] ${
                      statusFilter === f.id
                        ? "bg-[#0A0A0A] text-[#F7F7F2]"
                        : "bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[rgba(10,10,10,0.06)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`my-2 p-2.5 rounded-[8px] text-xs font-bold flex items-center gap-2 border ${
                  feedback.type === "success"
                    ? "bg-[#23E000]/15 border-[#23E000] text-[#0A0A0A]"
                    : "bg-[#E5201B]/10 border-[#E5201B] text-[#E5201B]"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle className="w-4 h-4 text-[#0A0A0A] shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Content Split: List on Left, Detail & Actions on Right */}
            <div className="flex flex-1 overflow-hidden gap-3 py-3">
              {/* Dispute List (Left) */}
              <div className="w-1/2 border border-[#0A0A0A] rounded-[10px] overflow-y-auto divide-y divide-[#0A0A0A]/20 bg-[#F7F7F2]">
                {loading ? (
                  <div className="p-8 text-center text-xs font-bold opacity-60">
                    Loading dispute challenges...
                  </div>
                ) : disputes.length === 0 ? (
                  <div className="p-8 text-center space-y-1">
                    <p className="text-xs font-bold uppercase">No disputes found</p>
                    <p className="text-[11px] opacity-60">
                      {statusFilter ? `No cases currently marked ${statusFilter}.` : "Queue is empty."}
                    </p>
                  </div>
                ) : (
                  disputes.map((d) => (
                    <button
                      key={d.challenge_id}
                      onClick={() => setSelectedDispute(d)}
                      className={`w-full text-left p-3 transition cursor-pointer flex items-center justify-between ${
                        selectedDispute?.challenge_id === d.challenge_id
                          ? "bg-[#0A0A0A] text-[#F7F7F2]"
                          : "hover:bg-[rgba(10,10,10,0.05)] text-[#0A0A0A]"
                      }`}
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold truncate">
                            {d.identifier_value}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold uppercase ${
                              d.status === "approved"
                                ? "bg-[#23E000] text-[#0A0A0A]"
                                : d.status === "rejected"
                                ? "bg-[#E5201B] text-[#F7F7F2]"
                                : "bg-[#0A0A0A]/20 text-current"
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-75 truncate">{d.claimant_name}</p>
                        <p className="text-[10px] opacity-50 font-mono">
                          Ref: {d.challenge_id}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                    </button>
                  ))
                )}
              </div>

              {/* Dispute Detail & Decision Controls (Right) */}
              <div className="w-1/2 border border-[#0A0A0A] rounded-[10px] p-4 bg-[#F7F7F2] overflow-y-auto flex flex-col justify-between">
                {selectedDispute ? (
                  <div className="space-y-3.5">
                    {/* Reference & Status */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#0A0A0A]/20">
                      <div>
                        <span className="text-[10px] uppercase font-bold opacity-60 block">Challenge ID</span>
                        <span className="font-mono text-xs font-black">{selectedDispute.challenge_id}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase border border-[#0A0A0A] ${
                          selectedDispute.status === "approved"
                            ? "bg-[#23E000] text-[#0A0A0A]"
                            : selectedDispute.status === "rejected"
                            ? "bg-[#E5201B] text-[#F7F7F2]"
                            : "bg-[#0A0A0A] text-[#F7F7F2]"
                        }`}
                      >
                        {selectedDispute.status}
                      </span>
                    </div>

                    {/* Identifier & Type */}
                    <div className="p-2.5 bg-[#0A0A0A]/5 rounded-[8px] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="opacity-60 text-[10px] uppercase font-bold">Type:</span>
                        <span className="font-bold uppercase text-[11px]">{selectedDispute.identifier_type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="opacity-60 text-[10px] uppercase font-bold">Disputed Identifier:</span>
                        <span className="font-mono font-bold text-xs">{selectedDispute.identifier_value}</span>
                      </div>
                    </div>

                    {/* Claimant Details */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 opacity-75">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="font-bold">{selectedDispute.claimant_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-75">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedDispute.contact_email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-50 text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>Submitted: {new Date(selectedDispute.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Proof Justification */}
                    <div>
                      <span className="text-[10px] uppercase font-bold opacity-60 block mb-1">
                        Submitted Evidence & Justification
                      </span>
                      <div className="p-3 bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] text-xs leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap font-mono">
                        {selectedDispute.proof_note}
                      </div>
                    </div>

                    {/* Human Decision Form */}
                    {selectedDispute.status === "under_review" ? (
                      <div className="pt-2 space-y-2 border-t border-[#0A0A0A]/20">
                        <label className="text-[10px] uppercase font-bold opacity-75 block">
                          Officer Decision Note (Recorded in National Registry)
                        </label>
                        <input
                          type="text"
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          placeholder="e.g. GST certificate verified against MCA registry. Whitelist approved."
                          className="w-full min-h-[38px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[6px] px-3 text-xs placeholder:text-[#0A0A0A]/40 focus:outline-none"
                        />

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => handleDecision("approved")}
                            className="min-h-[42px] bg-[#23E000] text-[#0A0A0A] border border-[#0A0A0A] rounded-[8px] text-xs font-black uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve & Shield</span>
                          </button>

                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => handleDecision("rejected")}
                            className="min-h-[42px] bg-[#E5201B] text-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] text-xs font-black uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject Dispute</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs space-y-1">
                        <span className="font-bold uppercase text-[11px] text-[#23E000]">
                          Case Finalized: {selectedDispute.status}
                        </span>
                        <p className="text-[11px] opacity-80">
                          {selectedDispute.decision_note || "Decision recorded by national grievance officer."}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs opacity-50 font-bold uppercase">
                    Select a dispute from the queue
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
