"use client";

import AdminQueueModal from "../components/AdminQueueModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminPage() {
  return (
    <main className="h-screen w-screen bg-[#F7F7F2] text-[#0A0A0A] overflow-hidden">
      <AdminQueueModal
        isOpen={true}
        fullScreen={true}
        onClose={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }}
        apiBaseUrl={API_BASE_URL}
      />
    </main>
  );
}

