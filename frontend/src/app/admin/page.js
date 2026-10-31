"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import AdminQueueModal from "../components/AdminQueueModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen w-screen bg-[#F7F7F2] text-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <AdminQueueModal
        isOpen={isOpen}
        onClose={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }}
        apiBaseUrl={API_BASE_URL}
      />

      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-[12px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-6 h-6 text-[#23E000]" />
        </div>
        <h1 className="text-base font-black uppercase tracking-wide">
          ScamRadar National Grievance Officer Portal
        </h1>
        <p className="text-xs opacity-70 max-w-sm mx-auto">
          Secure route restricted to authorized cyber cell personnel.
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase underline opacity-75 hover:opacity-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Radar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

