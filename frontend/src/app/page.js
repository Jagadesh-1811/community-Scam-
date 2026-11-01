"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ShieldAlert,
  Search,
  PlusCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Lock,
  BellRing,
  X,
  Flame,
} from "lucide-react";

import LookupModal from "./components/LookupModal";
import ReportModal from "./components/ReportModal";
import DisputeModal from "./components/DisputeModal";
import PWAInstallBanner from "./components/PWAInstallBanner";

const ScamMap = dynamic(() => import("./components/ScamMap"), {
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [clusters, setClusters] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeInitialData, setDisputeInitialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [surgeWarning, setSurgeWarning] = useState(null);

  // Minimal and Maximal view states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMapMaximized, setIsMapMaximized] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const mapRes = await fetch(`${API_BASE_URL}/map?days=7`);
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        const loadedClusters = mapData.clusters || [];
        setClusters(loadedClusters);

        // Community Alert: If any cluster is prompted >= 5 times, it is treated as a merged spreading heatmap cluster
        const spreadingSurge = loadedClusters.find((c) => (c.report_count || 0) >= 5);
        if (spreadingSurge) {
          setSurgeWarning(spreadingSurge);

          // Trigger system push notification for all members if permission is active
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("🚨 WARNING TO ALL MEMBERS: Scam Heatmap Spreading!", {
                body: `High scam surge spreading in ${spreadingSurge.locality} (${spreadingSurge.pincode}) with ${spreadingSurge.report_count} merged incidents! Warning to all members: check the map now and verify all calls/links.`,
                icon: "/favicon.ico",
              });
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setClusters([]);
    } finally {
      setLastRefreshed(new Date().toLocaleTimeString());
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalReports = clusters.reduce((acc, c) => acc + (c.report_count || 0), 0);
  const critCount = clusters.filter((c) => c.severity === "CRIT" || (c.report_count || 0) >= 10).length;
  const highCount = clusters.filter((c) => c.severity === "HIGH" || ((c.report_count || 0) >= 5 && (c.report_count || 0) < 10)).length;
  const medCount = clusters.filter((c) => c.severity === "MED" && (c.report_count || 0) < 5).length;

  const categories = [
    { id: "all", label: "All Active Clusters", count: clusters.length },
    { id: "CRIT", label: "Critical Threat (≥10)", count: critCount },
    { id: "HIGH", label: "High Alert (5-9)", count: highCount },
    { id: "MED", label: "Medium Warning (<5)", count: medCount },
  ];

  const filteredClusters =
    activeCategory === "all"
      ? clusters
      : clusters.filter((c) => c.severity === activeCategory);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F7F7F2] text-[#0A0A0A] overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-[#0A0A0A] bg-[#F7F7F2] px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          {/* Sidebar Toggle Minimize/Maximize button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Minimize Sidebar" : "Maximize Sidebar"}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-[10px] sm:rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer shrink-0"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 sm:w-5 sm:h-5" /> : <PanelLeftOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] bg-[#0A0A0A] text-[#F7F7F2] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-[#E5201B]" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-nowrap">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-[#0A0A0A] shrink-0 leading-tight">
                ScamRadar
              </h1>
              <span className="hidden lg:inline-flex items-center whitespace-nowrap px-2 py-0.5 bg-[#0A0A0A] text-[#F7F7F2] text-[9px] font-black rounded-[4px] uppercase tracking-wider shrink-0 leading-tight">
                NATIONAL REGISTRY
              </span>
            </div>
            <p className="hidden 2xl:block text-[11px] opacity-70 truncate leading-tight">
              Community Incident Radar & Defense Hub
            </p>
          </div>
        </div>

        {/* Action Controls - Icon-Only on Mobile, Full Labels on Desktop */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Map Maximize / Restore Toggle */}
          <button
            onClick={() => {
              setIsMapMaximized(!isMapMaximized);
              if (!isMapMaximized) setIsSidebarOpen(false);
              else setIsSidebarOpen(true);
            }}
            title={isMapMaximized ? "Restore Layout" : "Maximize Map View"}
            className="w-10 h-10 sm:w-auto sm:px-3 rounded-[10px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center justify-center gap-1.5 text-xs font-bold uppercase transition cursor-pointer shrink-0"
          >
            {isMapMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden lg:inline">{isMapMaximized ? "Restore" : "Maximize"}</span>
          </button>

          {/* Instant Lookup */}
          <button
            onClick={() => setIsLookupOpen(true)}
            title="Instant Threat Lookup"
            className="w-10 h-10 sm:w-auto sm:px-3.5 rounded-[10px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center justify-center gap-1.5 text-xs font-bold uppercase transition cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">Lookup</span>
          </button>

          {/* Dispute False Positive */}
          <button
            onClick={() => {
              setDisputeInitialData(null);
              setIsDisputeOpen(true);
            }}
            title="Dispute / Challenge Listing"
            className="w-10 h-10 sm:w-auto sm:px-3 rounded-[10px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center justify-center gap-1.5 text-xs font-bold uppercase transition cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-[#23E000]" />
            <span className="hidden md:inline">Dispute</span>
          </button>

          {/* Report Scam Button */}
          <button
            onClick={() => setIsReportOpen(true)}
            title="Report Scam Incident"
            className="w-10 h-10 sm:w-auto sm:px-4 rounded-[10px] border border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F2] hover:opacity-90 flex items-center justify-center gap-1.5 text-xs font-black uppercase transition cursor-pointer shadow-sm shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-[#23E000]" />
            <span className="hidden sm:inline">Report Scam</span>
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

            {/* Active Surge Alert Highlight Card */}
            {surgeWarning && (
              <div
                onClick={() => setSelectedArea(surgeWarning)}
                className="p-3 rounded-[12px] bg-[rgba(229,32,27,0.12)] border-2 border-[#E5201B] text-[#0A0A0A] mb-3 cursor-pointer hover:bg-[rgba(229,32,27,0.18)] transition shadow-sm"
              >
                <div className="flex items-center justify-between text-[10px] font-black text-[#E5201B] uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1.5 animate-pulse">
                    <Flame className="w-3.5 h-3.5" />
                    Heatmap Spreading
                  </span>
                  <span>1 Merged Cluster</span>
                </div>
                <div className="font-bold text-xs">
                  {surgeWarning.locality} ({surgeWarning.pincode})
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {surgeWarning.report_count} incidents prompted & merged. Warning to all members!
                </div>
              </div>
            )}

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

        {/* Main Interactive Map View (Minimal / Maximal Canvas) */}
        <main className="flex-1 relative h-full bg-[#F7F7F2]">
          {/* ── Community Warning Alert Notification Banner (Spreading Heatmap) ── */}
          {surgeWarning && (
            <div className="absolute top-4 left-3 right-3 sm:left-6 sm:right-6 z-[1000] max-w-xl mx-auto bg-[#0A0A0A] text-[#F7F7F2] border-2 border-[#E5201B] rounded-[14px] p-3.5 shadow-2xl animate-fadeIn flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-[#E5201B] text-[#F7F7F2] flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#E5201B] text-[#F7F7F2] text-[10px] font-mono font-black uppercase tracking-wider">
                      WARNING TO ALL MEMBERS
                    </span>
                    <span className="text-[11px] font-bold text-[#23E000] font-mono">
                      {surgeWarning.report_count} INCIDENTS MERGED
                    </span>
                  </div>
                  <p className="text-xs font-black mt-1 text-[#F7F7F2] leading-snug">
                    Scam heatmap is spreading in {surgeWarning.locality} ({surgeWarning.pincode})!
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                    Over 5 incidents prompted in this zone. Warning to all members: check this hotspot and verify unexpected calls or payment links immediately.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setSelectedArea(surgeWarning);
                  }}
                  className="h-8 px-2.5 bg-[#23E000] text-[#0A0A0A] rounded-[8px] text-[11px] font-black uppercase hover:bg-white transition cursor-pointer"
                >
                  Check Warning
                </button>
                <button
                  onClick={() => setSurgeWarning(null)}
                  title="Dismiss warning"
                  className="w-8 h-8 rounded-[8px] border border-white/20 hover:bg-white/10 flex items-center justify-center transition cursor-pointer text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <ScamMap
            clusters={filteredClusters}
            selectedArea={selectedArea}
            onSelectArea={(area) => setSelectedArea(area)}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Floating Area Focus Card */}
          {selectedArea && (
            <div className="absolute bottom-6 left-6 z-[1000] w-80 bg-[#F7F7F2] border border-[#0A0A0A] rounded-[12px] p-4 text-[#0A0A0A]">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-base">{selectedArea.locality}</h4>
                  <p className="text-xs opacity-70">
                    {selectedArea.city} &bull; PIN {selectedArea.pincode}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedArea(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] text-xs font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-[#0A0A0A] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="opacity-70">7-Day Incidents:</span>
                  <div className="font-black text-base text-[#E5201B]">
                    {selectedArea.report_count}
                  </div>
                </div>
                <div>
                  <span className="opacity-70">Severity Level:</span>
                  <div className="font-bold text-sm text-[#E5201B]">
                    {selectedArea.severity}
                  </div>
                </div>
              </div>

              {selectedArea.top_scam_type && (
                <div className="mt-2 p-2 bg-[rgba(229,32,27,0.08)] border border-[#E5201B] rounded-[8px] text-xs font-semibold text-[#0A0A0A]">
                  Primary Tactic: <strong>{selectedArea.top_scam_type}</strong>
                </div>
              )}
            </div>
          )}

          {/* Legend Overlay */}
          <div className="absolute top-6 right-6 z-[1000] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[12px] px-3.5 py-2 flex items-center gap-4 text-xs font-bold text-[#0A0A0A]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#E5201B] border border-[#0A0A0A]" />
              <span>CRIT (≥12)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#E5201B] opacity-60 border border-[#0A0A0A]" />
              <span>HIGH (6-11)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#E5201B] opacity-30 border border-[#0A0A0A]" />
              <span>MED (&lt;6)</span>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
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

      <DisputeModal
        isOpen={isDisputeOpen}
        onClose={() => setIsDisputeOpen(false)}
        initialData={disputeInitialData}
        apiBaseUrl={API_BASE_URL}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        apiBaseUrl={API_BASE_URL}
        onHighlightLocation={(loc) => {
          if (!loc) return;
          const lat = loc.lat || (loc.pincode?.startsWith("56") ? 12.9784 : 28.5494);
          const lng = loc.lng || (loc.pincode?.startsWith("56") ? 77.6408 : 77.2001);
          setSelectedArea({
            pincode: loc.pincode || "000000",
            locality: loc.locality || "Target Area",
            city: loc.city || "India",
            lat,
            lng,
            report_count: 1,
            severity: "MED",
            top_scam_type: "incident-focus",
          });
        }}
        onSuccess={() => {
          fetchData();
        }}
      />
      <PWAInstallBanner />
    </div>
  );
}
