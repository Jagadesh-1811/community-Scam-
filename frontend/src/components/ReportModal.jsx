'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { apiClient } from '@/lib/api-client';
import { X, CheckCircle, ShieldAlert, AlertOctagon } from 'lucide-react';

export default function ReportModal({ isOpen, onClose, initialIdentifier = '', onReportSuccess }) {
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [category, setCategory] = useState('UPI Fraud / QR Code Scam');
  const [summary, setSummary] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [broadcastId, setBroadcastId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !summary.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiClient.submitReport({
        identifier: identifier.trim(),
        category,
        summary: summary.trim(),
        evidence: evidence.trim()
      });
      setBroadcastId(res.reportId);
      setConfirmed(true);
      if (onReportSuccess) onReportSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setConfirmed(false);
    setIdentifier('');
    setSummary('');
    setEvidence('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0A]/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-[#F7F7F2] border border-[#0A0A0A] rounded-flat p-6 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 p-2 text-[#0A0A0A] hover:bg-[#0A0A0A]/10 rounded-full tap-target flex items-center justify-center"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!confirmed ? (
          /* Report Form */
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5201B]"></span>
              <span className="font-futuristic font-bold text-xs tracking-widest text-[#E5201B]">
                CRITICAL THREAT SUBMISSION
              </span>
            </div>

            <h3 className="font-futuristic font-black text-xl sm:text-2xl text-[#0A0A0A] mb-1">
              {t('reportModalTitle')}
            </h3>

            <p className="font-serif-filler italic text-xs text-[#0A0A0A]/70 mb-5">
              {t('latinFiller')}
            </p>

            {/* Target Identifier Input */}
            <div className="mb-4">
              <label className="block font-mono-data text-xs font-bold text-[#0A0A0A] mb-1">
                {t('entityLabel')} *
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+91 99999 99999, refund@upi, or https://..."
                className="w-full bg-[#F7F7F2] border border-[#0A0A0A] rounded-flat px-3 py-2.5 font-mono-data text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] tap-target"
              />
            </div>

            {/* Threat Category Selector */}
            <div className="mb-4">
              <label className="block font-mono-data text-xs font-bold text-[#0A0A0A] mb-1">
                {t('categoryLabel')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#F7F7F2] border border-[#0A0A0A] rounded-flat px-3 py-2.5 font-mono-data text-sm text-[#0A0A0A] focus:outline-none cursor-pointer tap-target"
              >
                <option value="UPI Fraud / QR Code Scam">UPI Fraud / QR Code Scam</option>
                <option value="CBI / FedEx / Customs Impersonation">CBI / FedEx / Customs Impersonation</option>
                <option value="Banking Phishing Site / APK">Banking Phishing Site / APK</option>
                <option value="Job / Part-time YouTube Like Scam">Job / Part-time YouTube Like Scam</option>
                <option value="Crypto Investment Scheme">Crypto Investment Scheme</option>
                <option value="Electricity Bill Threat SMS">Electricity Bill Threat SMS</option>
              </select>
            </div>

            {/* Incident Summary */}
            <div className="mb-4">
              <label className="block font-mono-data text-xs font-bold text-[#0A0A0A] mb-1">
                {t('descriptionLabel')} *
              </label>
              <textarea
                required
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe how the scammer operated, what they asked for, and payment demands..."
                className="w-full bg-[#F7F7F2] border border-[#0A0A0A] rounded-flat p-3 font-mono-data text-xs text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            {/* Evidence / Loss Amount */}
            <div className="mb-6">
              <label className="block font-mono-data text-xs font-bold text-[#0A0A0A] mb-1">
                {t('evidenceLabel')}
              </label>
              <input
                type="text"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="₹ Amount lost, Transaction UTR, Police Complaint number (optional)"
                className="w-full bg-[#F7F7F2] border border-[#0A0A0A] rounded-flat px-3 py-2.5 font-mono-data text-xs text-[#0A0A0A] focus:outline-none tap-target"
              />
            </div>

            {/* Form Actions: Post Confirmation in Green (#23E000 with black text for WCAG AA) */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0A0A0A]/20">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="bg-[#F7F7F2] text-[#0A0A0A] border border-[#0A0A0A] px-4 py-2.5 rounded-flat font-futuristic text-xs font-bold tracking-wider hover:bg-[#0A0A0A]/5 tap-target"
              >
                {t('cancel')}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#23E000] text-[#0A0A0A] font-black border border-[#0A0A0A] px-6 py-2.5 rounded-flat font-futuristic text-xs tracking-wider tap-target hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "BROADCASTING..." : t('postConfirm')}
              </button>
            </div>
          </form>
        ) : (
          /* SUCCESS STATE: Confirmed & Posted */
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#23E000] text-[#0A0A0A] border border-[#0A0A0A] flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>

            <span className="badge-safe px-3 py-1 rounded-flat font-futuristic text-xs tracking-widest uppercase inline-block mb-2">
              POST BROADCAST CONFIRMED
            </span>

            <h3 className="font-futuristic font-black text-xl text-[#0A0A0A] mb-2">
              {t('reportSuccess')}
            </h3>

            <div className="bg-[#23E000]/10 border border-[#0A0A0A] rounded-flat p-4 my-4 font-mono-data text-xs text-left">
              <div>REPORT ID: <strong className="text-[#0A0A0A]">{broadcastId}</strong></div>
              <div>TARGET: <strong className="text-[#0A0A0A]">{identifier}</strong></div>
              <div>STATUS: <strong className="text-[#E5201B]">FLAGGED IN RADAR SENSORS</strong></div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="bg-[#0A0A0A] text-[#F7F7F2] px-6 py-2.5 rounded-flat font-futuristic text-xs font-bold tracking-wider border border-[#0A0A0A] tap-target hover:opacity-90 mt-2"
            >
              RETURN TO RADAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
