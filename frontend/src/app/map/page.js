"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ShieldAlert,
  Search,
  PlusCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

import LookupModal from "@/components/LookupModal";
import RadarReportModal from "@/components/RadarReportModal";
import DisputeModal from "@/components/DisputeModal";

const ScamMap = dynamic(() => import("@/components/ScamMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[12px] flex items-center justify-center text-[#0A0A0A]">
      <div className="flex flex-col items-center gap-2">
        <span className="w-6 h-6 border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A] rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading OpenStreetMap...</span>
      </div>
    </div>
  ),
});

const DEFAULT_METRO_CLUSTERS = [
  { pincode: "560038", locality: "Indiranagar", city: "Bengaluru", lat: 12.9784, lng: 77.6408, report_count: 16, severity: "CRIT", top_scam_type: "digital-arrest" },
  { pincode: "110001", locality: "Connaught Place", city: "New Delhi", lat: 28.6315, lng: 77.2167, report_count: 14, severity: "CRIT", top_scam_type: "cbi-impersonation" },
  { pincode: "400050", locality: "Bandra West", city: "Mumbai", lat: 19.0596, lng: 72.8295, report_count: 10, severity: "HIGH", top_scam_type: "upi-gateway-phish" },
  { pincode: "500081", locality: "Madhapur", city: "Hyderabad", lat: 17.4483, lng: 78.3915, report_count: 8, severity: "HIGH", top_scam_type: "electricity-disconnect" },
  { pincode: "700091", locality: "Salt Lake Sector V", city: "Kolkata", lat: 22.5804, lng: 88.4378, report_count: 5, severity: "MED", top_scam_type: "fake-kyc-sms" }
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RadarMapInternalPage() {
  const [clusters, setClusters] = useState(DEFAULT_METRO_CLUSTERS);
  const [selectedArea, setSelectedArea] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeInitialData, setDisputeInitialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");

  // Minimal and Maximal view states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMapMaximized, setIsMapMaximized] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const mapRes = await fetch(`${API_BASE_URL}/map?days=7`, { cache: "no-store" });
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        if (mapData.clusters && mapData.clusters.length > 0) {
          setClusters(mapData.clusters);
        } else {
          setClusters(DEFAULT_METRO_CLUSTERS);
        }
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch (err) {
      setBackendOnline(false);
      setClusters(DEFAULT_METRO_CLUSTERS);
    } finally {
      setLastRefreshed(new Date().toLocaleTimeString());
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalReports = clusters.reduce((acc, c) => acc + (c.report_count || 0), 0);
  const critCount = clusters.filter((c) => c.severity === "CRIT").length;
  const highCount = clusters.filter((c) => c.severity === "HIGH").length;
  const medCount = clusters.filter((c) => c.severity === "MED").length;

  const categories = [
    { id: "all", label: "All Active Clusters", count: clusters.length },
    { id: "CRIT", label: "Critical Threat (≥12)", count: critCount },
    { id: "HIGH", label: "High Alert (6-11)", count: highCount },
    { id: "MED", label: "Medium Warning (<6)", count: medCount },
  ];

  const filteredClusters =
    activeCategory === "all"
      ? clusters
      : clusters.filter((c) => c.severity === activeCategory);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F7F7F2] text-[#0A0A0A] overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-[#0A0A0A] bg-[#F7F7F2] px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          {/* Return to Landing Page Button */}
          <Link
            href="/"
            className="min-h-[44px] px-3.5 rounded-[12px] border border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F2] hover:opacity-90 flex items-center gap-2 text-xs font-bold uppercase transition cursor-pointer"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Landing Page</span>
          </Link>

          {/* Sidebar Toggle Minimize/Maximize button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Minimize Sidebar" : "Maximize Sidebar"}
            className="w-11 h-11 flex items-center justify-center rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>

          <div className="w-10 h-10 rounded-[12px] bg-[#0A0A0A] text-[#F7F7F2] flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-[#E5201B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-[#0A0A0A]">
                ScamRadar
              </h1>
              <span className="px-1.5 py-0.2 bg-[#0A0A0A] text-[#F7F7F2] text-[10px] font-bold rounded-[6px]">
                NATIONAL REGISTRY
              </span>
            </div>
            <p className="text-[11px] opacity-70">
              Community Incident Radar &amp; Defense Hub
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Map Maximize / Restore Toggle */}
          <button
            onClick={() => {
              setIsMapMaximized(!isMapMaximized);
              if (!isMapMaximized) setIsSidebarOpen(false);
              else setIsSidebarOpen(true);
            }}
            title={isMapMaximized ? "Restore Layout" : "Maximize Map View"}
            className="min-h-[44px] px-3.5 rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center gap-2 text-xs font-bold uppercase transition cursor-pointer"
          >
            {isMapMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMapMaximized ? "Restore" : "Maximize Map"}</span>
          </button>

          <button
            onClick={() => setIsLookupOpen(true)}
            className="min-h-[44px] px-4 rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center gap-2 text-xs font-bold uppercase transition cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Instant Lookup</span>
          </button>

          <button
            onClick={() => {
              setDisputeInitialData(null);
              setIsDisputeOpen(true);
            }}
            className="min-h-[44px] px-3.5 rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center gap-1.5 text-xs font-bold uppercase transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#23E000]" />
            <span>Dispute Report</span>
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            className="min-h-[44px] px-4 rounded-[12px] border border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F2] hover:opacity-90 flex items-center gap-2 text-xs font-bold uppercase transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#23E000]" />
            <span>Report Scam</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Control Sidebar with Minimal & Maximal transition */}
        <aside
          className={`border-r border-[#0A0A0A] bg-[#F7F7F2] flex flex-col shrink-0 overflow-hidden z-10 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-80 md:w-96" : "w-0 border-r-0"
          }`}
        >
          {/* Quick Metrics */}
          <div className="p-4 grid grid-cols-2 gap-3 border-b border-[#0A0A0A]">
            <div className="p-3 rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2]">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                Total 7D
              </div>
              <div className="text-2xl font-black text-[#E5201B] mt-1">
                {totalReports}
              </div>
              <div className="text-[10px] opacity-60 mt-0.5">Verified incidents</div>
            </div>

            <div className="p-3 rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2]">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                Hotspots
              </div>
              <div className="text-2xl font-black text-[#0A0A0A] mt-1">
                {clusters.length}
              </div>
              <div className="text-[10px] opacity-60 mt-0.5">Active areas</div>
            </div>
          </div>

          {/* Severity Categories */}
          <div className="p-4 border-b border-[#0A0A0A]">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2">
              Incident Severity Levels
            </div>
            <div className="space-y-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-[12px] text-xs font-bold uppercase transition cursor-pointer border border-[#0A0A0A] ${
                    activeCategory === cat.id
                      ? "bg-[#0A0A0A] text-[#F7F7F2]"
                      : "bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[rgba(10,10,10,0.06)]"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-[6px] text-[10px] font-mono border border-current ${
                      activeCategory === cat.id
                        ? "bg-[#F7F7F2] text-[#0A0A0A]"
                        : "bg-[#0A0A0A] text-[#F7F7F2]"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Regional Incidents List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">
              <span>Active Areas</span>
              <span className="text-[10px]">Select to focus</span>
            </div>

            {filteredClusters.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-60 border border-dashed border-[#0A0A0A] rounded-[12px]">
                No reports recorded in the database for this category.
              </div>
            ) : (
              filteredClusters.map((c) => {
                const isSelected = selectedArea?.pincode === c.pincode;
                return (
                  <div
                    key={c.pincode}
                    onClick={() => setSelectedArea(c)}
                    className={`p-3.5 rounded-[12px] border border-[#0A0A0A] cursor-pointer transition ${
                      isSelected
                        ? "bg-[rgba(229,32,27,0.1)] border-[#E5201B]"
                        : "bg-[#F7F7F2] hover:bg-[rgba(10,10,10,0.06)]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-[#0A0A0A]">
                          {c.locality}
                        </div>
                        <div className="text-[11px] opacity-70 mt-0.5">
                          {c.city} &bull; PIN {c.pincode}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[6px] border border-[#E5201B] bg-[rgba(229,32,27,0.12)] text-[#E5201B]">
                        {c.severity}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#0A0A0A]/20 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#E5201B]">
                        {c.report_count} incidents
                      </span>
                      {c.top_scam_type && (
                        <span className="opacity-80">
                          {c.top_scam_type}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Sync */}
          <div className="p-3 border-t border-[#0A0A0A] flex items-center justify-between text-[11px] opacity-75">
            <span>Last sync: {lastRefreshed || "Just now"}</span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-[12px] border border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer font-bold uppercase text-[10px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </aside>

        {/* Main Interactive Map View */}
        <main className="flex-1 relative h-full bg-[#F7F7F2]">
          <ScamMap
            clusters={filteredClusters}
            selectedArea={selectedArea}
            onSelectArea={(area) => setSelectedArea(area)}
            isSidebarOpen={isSidebarOpen}
          />
        </main>
      </div>

      {/* Lookup Modal */}
      <LookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        apiBaseUrl={API_BASE_URL}
        onOpenDispute={(data) => {
          setIsLookupOpen(false);
          setDisputeInitialData(data);
          setIsDisputeOpen(true);
        }}
      />

      {/* Dispute Modal */}
      <DisputeModal
        isOpen={isDisputeOpen}
        onClose={() => setIsDisputeOpen(false)}
        initialData={disputeInitialData}
        apiBaseUrl={API_BASE_URL}
      />

      {/* Community Report Modal */}
      <RadarReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        apiBaseUrl={API_BASE_URL}
        onSuccess={() => {
          fetchData();
        }}
        onHighlightLocation={(loc) => {
          if (!loc) return;
          setSelectedArea(loc);
        }}
      />
    </div>
  );
}
