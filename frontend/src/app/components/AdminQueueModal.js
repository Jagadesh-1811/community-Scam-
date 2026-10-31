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
} from "lucide-react";

export default function AdminQueueModal({ isOpen, onClose, apiBaseUrl, onDisputeDecided }) {
  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("under_review");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [acting, setActing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const baseUrl = apiBaseUrl || "http://localhost:8000";
  const ADMIN_KEY = "scamradar-admin-2026";

  const fetchDisputes = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const url = statusFilter
        ? `${baseUrl}/admin/disputes?status=${statusFilter}`
        : `${baseUrl}/admin/disputes`;
      const res = await fetch(url);
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

  useEffect(() => {
    if (isOpen) {
      fetchDisputes();
    }
  }, [isOpen, statusFilter]);

  if (!isOpen) return null;

  const handleDecision = async (decision) => {
    if (!selectedDispute) return;
    setActing(true);
    setFeedback(null);
    try {
      const res = await fetch(`${baseUrl}/admin/disputes/${selectedDispute.challenge_id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          decision_note: decisionNote.trim() || `Reviewed and ${decision} by Grievance Cell Officer.`,
          admin_key: ADMIN_KEY,
        }),
      });
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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#F7F7F2] border border-[#0A0A0A] rounded-[14px] p-5 text-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wider">
                  Admin Grievance & Dispute Queue
                </h2>
                <span className="px-2 py-0.5 rounded-[4px] bg-[#0A0A0A] text-[#F7F7F2] text-[10px] font-mono font-bold">
                  HUMAN VERIFICATION
                </span>
              </div>
              <p className="text-[11px] opacity-70">
                Review submitted business certificates and approve or reject whitelist protection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDisputes}
              title="Refresh queue"
              className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
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

        {/* Filter Bar */}
        <div className="flex items-center justify-between py-2.5 border-b border-[#0A0A0A]/20 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[11px] font-bold uppercase opacity-70">Status Filter:</span>
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
          <span className="text-[11px] font-mono font-bold opacity-70">
            Total in queue: {total}
          </span>
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
                  <div className="p-3 bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] text-xs leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {selectedDispute.proof_note}
                  </div>
                </div>

                {/* Human Decision Form */}
                {selectedDispute.status === "under_review" ? (
                  <div className="pt-2 space-y-2 border-t border-[#0A0A0A]/20">
                    <label className="text-[10px] uppercase font-bold opacity-75 block">
                      Admin Decision Note (Sent to Claimant)
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
                        <span>Approve & Whitelist</span>
                      </button>

                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => handleDecision("rejected")}
                        className="min-h-[42px] bg-[#E5201B] text-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] text-xs font-black uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject Challenge</span>
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
      </div>
    </div>
  );
}

