"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
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
  Shield,
  BadgeAlert,
  BadgeCheck,
  FileCheck2,
  ExternalLink,
  Download,
  ArrowLeft,
} from "lucide-react";

export default function AdminQueueModal({
  isOpen,
  onClose,
  apiBaseUrl,
  onDisputeDecided,
  fullScreen = false,
}) {
  // Authentication State
  const [adminToken, setAdminToken] = useState("");
  const [officerInfo, setOfficerInfo] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [supabaseConfig, setSupabaseConfig] = useState({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://psvmzqigzpvzbggrmhvw.supabase.co",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_VZQuRJIyJL8hIjeBuisq1A_uCU_dyZ9",
  });

  // Queue State
  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("under_review");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [gstConfirmed, setGstConfirmed] = useState(false);
  const [acting, setActing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const baseUrl = apiBaseUrl || "http://localhost:8000";

  // Fetch allowed email whitelist from .env via backend auth config
  useEffect(() => {
    fetch(`${baseUrl}/admin/auth/config`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.allowed_emails && Array.isArray(d.allowed_emails)) {
          setAllowedEmails(d.allowed_emails);
          if (d.allowed_emails.length > 0 && !selectedEmail) {
            setSelectedEmail(d.allowed_emails[0]);
          }
        }
        if (d?.supabase_url && d?.supabase_anon_key) {
          setSupabaseConfig({ url: d.supabase_url, key: d.supabase_anon_key });
        }
      })
      .catch(() => {});
  }, [baseUrl]);

  // Handle OAuth session redirect (when redirected back from Google OAuth)
  useEffect(() => {
    if (!isOpen || adminToken) return;

    try {
      const client = createClient(supabaseConfig.url, supabaseConfig.key);

      // Check existing session from hash/cookies
      client.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user?.email) {
          const userEmail = session.user.email.toLowerCase().trim();
          const fullName = session.user.user_metadata?.full_name || session.user.email;
          await handleGoogleSignIn(userEmail, fullName, session.access_token);
        }
      });

      // Listen for active OAuth state transition
      const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user?.email) {
          const userEmail = session.user.email.toLowerCase().trim();
          const fullName = session.user.user_metadata?.full_name || session.user.email;
          await handleGoogleSignIn(userEmail, fullName, session.access_token);
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    } catch (_) {}
  }, [isOpen, adminToken, supabaseConfig]);

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

  // Reset GST confirmation state when selection changes
  useEffect(() => {
    setGstConfirmed(false);
    setDecisionNote("");
  }, [selectedDispute?.challenge_id]);

  // Fetch disputes when token or filter changes
  useEffect(() => {
    if (isOpen && adminToken) {
      fetchDisputes();
    }
  }, [isOpen, adminToken, statusFilter]);

  // ── Launch Connected Live Google OAuth Redirect ──────────────────────────
  const handleLaunchLiveGoogleOAuth = async () => {
    setLoggingIn(true);
    setLoginError("");

    try {
      const client = createClient(supabaseConfig.url, supabaseConfig.key);
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/admin`
        : "http://localhost:3000/admin";

      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      setLoggingIn(false);
      setLoginError(err.message || "Failed to launch Google OAuth.");
    }
  };

  // ── Google OAuth Sign-In (Verified against .env ADMIN_ALLOWED_EMAILS) ─────
  const handleGoogleSignIn = async (emailOverride, nameOverride, credentialToken) => {
    setLoggingIn(true);
    setLoginError("");

    const targetEmail = (
      emailOverride ||
      (allowedEmails.length > 0 ? allowedEmails[0] : "jagadeshwar2014@gmail.com")
    ).trim().toLowerCase();

    try {
      // Authenticate with Google endpoint (checked against ADMIN_ALLOWED_EMAILS in .env)
      const res = await fetch(`${baseUrl}/admin/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          name: nameOverride || targetEmail.split("@")[0].replace(/[._]/g, " ").toUpperCase() + " (Officer)",
          credential: credentialToken || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Sign out of Supabase if an unauthorized account was picked
        try {
          const client = createClient(supabaseConfig.url, supabaseConfig.key);
          await client.auth.signOut();
        } catch (_) {}
        throw new Error(data.error || data.detail || `Access Denied: ${targetEmail} is not authorized.`);
      }

      setAdminToken(data.token);
      const officer = {
        officer_name: data.officer_name,
        badge_id: data.badge_id,
        email: targetEmail,
        auth_provider: "google",
      };
      setOfficerInfo(officer);
      sessionStorage.setItem("scamradar_admin_token", data.token);
      sessionStorage.setItem("scamradar_admin_officer", JSON.stringify(officer));
    } catch (err) {
      setLoginError(err.message || "Failed to complete Google authentication.");
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
          gst_confirmed: gstConfirmed,
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
          ? `Dispute ${selectedDispute.challenge_id} approved. Identifier is shielded as VERIFIED_BUSINESS ${gstConfirmed ? "(GST Verified)" : ""}.`
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
        if (e.target === e.currentTarget && !fullScreen) onClose();
      }}
      className={
        fullScreen
          ? "w-screen h-screen min-h-screen flex flex-col bg-[#F7F7F2] text-[#0A0A0A] overflow-hidden select-none"
          : "fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn"
      }
    >
      <div
        className={
          fullScreen
            ? "w-full h-full flex flex-col bg-[#F7F7F2] text-[#0A0A0A] overflow-hidden"
            : "relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-[#F7F7F2] border border-[#0A0A0A] rounded-[16px] p-5 text-[#0A0A0A] shadow-2xl"
        }
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b border-[#0A0A0A] shrink-0 ${
            fullScreen ? "px-6 py-4 bg-[#F7F7F2]" : "pb-3.5"
          }`}
        >
          <div className="flex items-center gap-3">
            {fullScreen && (
              <button
                onClick={onClose}
                title="Return to Public Scam Map"
                className="h-10 px-3.5 rounded-[10px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center gap-2 text-xs font-bold uppercase transition cursor-pointer mr-2 shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Public Radar</span>
              </button>
            )}
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
                {fullScreen && (
                  <span className="hidden md:inline px-2 py-0.5 rounded-[4px] border border-[#0A0A0A] bg-[#23E000]/10 text-[#0A0A0A] text-[10px] font-mono font-bold">
                    FULL WORKBENCH
                  </span>
                )}
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
                  className="h-9 px-3 flex items-center gap-1.5 rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer text-xs font-bold uppercase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
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
            {!fullScreen && (
              <button
                onClick={onClose}
                title="Close (Esc)"
                className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN A: ADMIN LOGIN GATE (EXCLUSIVE GOOGLE WORKSPACE AUTH)
           ══════════════════════════════════════════════════════════════════════ */}
        {!adminToken ? (
          <div
            className={`flex flex-col items-center justify-center max-w-lg mx-auto w-full space-y-6 animate-fadeIn ${
              fullScreen ? "flex-1 py-16 px-6 overflow-y-auto" : "py-12 px-6"
            }`}
          >
            <div className="w-16 h-16 rounded-[16px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center border-2 border-[#23E000]/40 shadow-lg">
              <Lock className="w-8 h-8 text-[#23E000]" />
            </div>

            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-[#0A0A0A] text-[#23E000] text-[10px] font-black uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-[#23E000]" />
                <span>NCRP Grievance Cell</span>
              </div>
              <h3 className="text-lg font-black uppercase tracking-wide text-[#0A0A0A]">
                Officer Single Sign-On
              </h3>
              <p className="text-xs opacity-75 leading-relaxed max-w-sm mx-auto">
                Protected administration zone. Access is strictly restricted to designated Cyber Crime Grievance Officers.
              </p>
            </div>

            {loginError && (
              <div className="w-full p-3.5 rounded-[10px] bg-[rgba(229,32,27,0.1)] border-2 border-[#E5201B] text-xs font-bold text-[#E5201B] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-snug">{loginError}</div>
              </div>
            )}

            {/* Exclusive Google OAuth Sign-In Card */}
            <div className="w-full space-y-4">
              {/* Primary Live Google OAuth Button */}
              <button
                type="button"
                onClick={handleLaunchLiveGoogleOAuth}
                disabled={loggingIn}
                className="w-full min-h-[54px] bg-[#FFFFFF] text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-[12px] text-xs font-black uppercase flex items-center justify-center gap-3 hover:bg-[#F0F0ED] active:scale-[0.99] transition shadow-md cursor-pointer disabled:opacity-40"
              >
                {loggingIn ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
                    <span>Connecting to Google Identity...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google OAuth</span>
                  </>
                )}
              </button>

              <div className="p-3.5 bg-[#0A0A0A]/5 border border-[#0A0A0A]/20 rounded-[10px] space-y-1.5 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A] flex items-center justify-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#23E000]" />
                  <span>Authorized Personnel Only</span>
                </div>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  Access is strictly restricted to designated Cyber Crime Grievance Officers. Unauthorized Google accounts will be denied access (HTTP 403 Forbidden).
                </p>
              </div>
            </div>

            {/* Compliance Footer */}
            <div className="pt-2 text-center text-[10px] opacity-50 space-y-1">
              <div>Protected under IT Act 2000 § 43 & § 66D</div>
              <div className="font-mono">Audit Log: Active • SSL 256-Bit TLS 1.3</div>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════
              SCREEN B: AUTHENTICATED DISPUTE QUEUE & GST INSPECTION
             ══════════════════════════════════════════════════════════════════════ */
          <>
            {/* Officer Profile & Filter Bar */}
            <div
              className={`flex flex-wrap items-center justify-between border-b border-[#0A0A0A]/20 shrink-0 gap-2 ${
                fullScreen ? "px-6 py-3 bg-[#F7F7F2]" : "py-2.5"
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-[6px] bg-[#0A0A0A] text-[#23E000] font-mono text-[11px] font-bold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{officerInfo?.officer_name || "Senior Officer"}</span>
                  <span className="opacity-60 text-[9px]">({officerInfo?.badge_id || "CYBER-GOV-01"})</span>
                  {officerInfo?.email && (
                    <span className="text-[9px] opacity-75 font-mono">
                      &bull; {officerInfo.email}
                    </span>
                  )}
                  {officerInfo?.auth_provider === "google" && (
                    <span className="ml-1 px-1 bg-[#23E000] text-[#0A0A0A] text-[9px] font-black rounded-[3px]">
                      GOOGLE AUTH
                    </span>
                  )}
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
                  fullScreen ? "mx-6 my-2" : ""
                } ${
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
            <div
              className={
                fullScreen
                  ? "flex flex-1 overflow-hidden h-full w-full"
                  : "flex flex-1 overflow-hidden gap-3 py-3"
              }
            >
              {/* Dispute List (Left) */}
              <div
                className={
                  fullScreen
                    ? "w-96 md:w-[420px] lg:w-[460px] shrink-0 border-r border-[#0A0A0A] overflow-y-auto divide-y divide-[#0A0A0A]/20 bg-[#F7F7F2] h-full"
                    : "w-5/12 border border-[#0A0A0A] rounded-[10px] overflow-y-auto divide-y divide-[#0A0A0A]/20 bg-[#F7F7F2]"
                }
              >
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
                          {d.gstin && (
                            <span className="px-1 py-0.2 bg-[#23E000]/30 text-[#0A0A0A] text-[8px] font-black rounded-[3px] border border-[#23E000]">
                              GST
                            </span>
                          )}
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

              {/* Dispute Detail & GST Certificate Inspection (Right) */}
              <div
                className={
                  fullScreen
                    ? "flex-1 p-6 md:p-8 bg-[#F7F7F2] overflow-y-auto flex flex-col justify-between space-y-5"
                    : "w-7/12 border border-[#0A0A0A] rounded-[10px] p-4 bg-[#F7F7F2] overflow-y-auto flex flex-col justify-between space-y-4"
                }
              >
                {selectedDispute ? (
                  <div className="space-y-3.5">
                    {/* Reference & Status */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#0A0A0A]/20">
                      <div>
                        <span className="text-[10px] uppercase font-bold opacity-60 block">Case Dossier ID</span>
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

                    {/* Target Identifier & Claimant */}
                    <div className="p-2.5 bg-[#0A0A0A]/5 rounded-[8px] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="opacity-60 text-[10px] uppercase font-bold">Disputed Target:</span>
                        <span className="font-mono font-bold text-xs">{selectedDispute.identifier_value}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="opacity-60 text-[10px] uppercase font-bold">Claimant Entity:</span>
                        <span className="font-bold text-xs">{selectedDispute.claimant_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="opacity-60 text-[10px] uppercase font-bold">Contact Email:</span>
                        <span>{selectedDispute.contact_email}</span>
                      </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        OFFICIAL GST CERTIFICATE INSPECTION CARD (FORM GST REG-06)
                       ══════════════════════════════════════════════════════════ */}
                    <div className="p-3.5 rounded-[12px] border-2 border-[#0A0A0A] bg-white text-[#0A0A0A] space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-[#0A0A0A]/15">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-[6px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center font-black">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block">
                              GOVERNMENT OF INDIA • GOODS & SERVICES TAX
                            </span>
                            <span className="text-[9px] opacity-60 font-mono block">
                              FORM GST REG-06 • CERTIFICATE OF REGISTRATION
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#23E000]/20 border border-[#23E000] text-[9px] font-mono font-black text-[#0A0A0A] uppercase">
                          ACTIVE TAXPAYER
                        </span>
                      </div>

                      {/* GST Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#F7F7F2] p-2.5 rounded-[8px] border border-[#0A0A0A]/10">
                        <div>
                          <span className="text-[9px] opacity-60 uppercase block">Registration No (GSTIN)</span>
                          <strong className="text-xs text-[#0A0A0A]">
                            {selectedDispute.gstin || "29AAAAA0000A1Z5"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[9px] opacity-60 uppercase block">Jurisdiction State</span>
                          <strong>{selectedDispute.gst_state || "Karnataka Commercial Taxes"}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] opacity-60 uppercase block">Permanent Account No (PAN)</span>
                          <strong>{selectedDispute.gst_pan || "AAAAA0000A"}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] opacity-60 uppercase block">Constitution of Business</span>
                          <strong>Private Limited / MSME Store</strong>
                        </div>
                      </div>

                      {/* Document Attachment & Handshake Token */}
                      <div className="flex items-center justify-between text-[10px] font-mono opacity-80 pt-1">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>
                            Document: {selectedDispute.attached_file || "Official GST Registration Form REG-06.pdf"}
                          </span>
                        </span>
                        {selectedDispute.handshake_token && (
                          <span className="text-[#23E000] font-bold">
                            Handshake: {selectedDispute.handshake_token}
                          </span>
                        )}
                      </div>

                      {/* Officer GST Confirmation Checkbox */}
                      {selectedDispute.status === "under_review" && (
                        <label className="flex items-start gap-2.5 p-2 bg-[#23E000]/15 border border-[#23E000] rounded-[8px] cursor-pointer mt-2">
                          <input
                            type="checkbox"
                            checked={gstConfirmed}
                            onChange={(e) => setGstConfirmed(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-[#0A0A0A]"
                          />
                          <div className="text-[11px]">
                            <span className="font-bold block text-[#0A0A0A]">
                              Confirm GST Certificate Authenticity
                            </span>
                            <span className="opacity-80 block text-[10px] leading-tight">
                              I confirm I have cross-checked this GSTIN and business entity against the MCA and GST portal (services.gst.gov.in).
                            </span>
                          </div>
                        </label>
                      )}

                      {selectedDispute.status === "approved" && (
                        <div className="p-2 bg-[#23E000]/20 border border-[#23E000] rounded-[6px] text-[10px] font-bold flex items-center gap-1.5 text-[#0A0A0A]">
                          <BadgeCheck className="w-4 h-4 text-[#0A0A0A]" />
                          <span>GST Certificate Authenticity Confirmed & Stamped by Officer</span>
                        </div>
                      )}
                    </div>

                    {/* Proof Statement Note */}
                    <div>
                      <span className="text-[10px] uppercase font-bold opacity-60 block mb-1">
                        Full Evidence Statement & Cryptographic Seal
                      </span>
                      <div className="p-2.5 bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] text-xs leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap font-mono">
                        {selectedDispute.proof_note}
                      </div>
                    </div>

                    {/* Officer Decision Form */}
                    {selectedDispute.status === "under_review" ? (
                      <div className="pt-2 space-y-2 border-t border-[#0A0A0A]/20">
                        <label className="text-[10px] uppercase font-bold opacity-75 block">
                          Officer Review Note (Appended to Registry Audit Trail)
                        </label>
                        <input
                          type="text"
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          placeholder={
                            gstConfirmed
                              ? "GST Certificate verified against MCA portal. Business whitelist approved."
                              : "Enter review notes before final decision..."
                          }
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
                            <span>
                              {gstConfirmed ? "Confirm GST & Shield" : "Approve & Shield"}
                            </span>
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
                          Dossier Resolved: {selectedDispute.status}
                        </span>
                        <p className="text-[11px] opacity-80">
                          {selectedDispute.decision_note || "Decision recorded in National Grievance Registry."}
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
