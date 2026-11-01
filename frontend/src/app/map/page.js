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
  Flame,
  BellRing,
  X,
  Compass,
  MapPin,
  PhoneCall,
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
        <span className="text-xs font-bold uppercase tracking-wider font-mono">
          Loading OpenStreetMap Radar...
        </span>
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
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [surgeWarning, setSurgeWarning] = useState(null);

  // Responsive minimal & maximal view states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // default closed on mobile, opened on desktop via effect
  const [isMapMaximized, setIsMapMaximized] = useState(false);

  // Auto-open sidebar on wide screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Handle PWA action shortcuts from URL (e.g. /map?action=report or /map?action=verify)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "report") {
        setIsReportOpen(true);
      } else if (params.get("action") === "verify") {
        setIsLookupOpen(true);
      }
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const mapRes = await fetch(`${API_BASE_URL}/map?days=7`, { cache: "no-store" });
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        const loadedClusters = (mapData.clusters && mapData.clusters.length > 0)
          ? mapData.clusters
          : DEFAULT_METRO_CLUSTERS;
        setClusters(loadedClusters);

        // Community Alert: If any cluster is prompted >= 5 times, it is treated as a merged spreading heatmap cluster
        const spreadingSurge = loadedClusters.find((c) => (c.report_count || 0) >= 5);
        if (spreadingSurge) {
          setSurgeWarning(spreadingSurge);

          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("🚨 WARNING TO ALL MEMBERS: Scam Heatmap Spreading!", {
                body: `High scam surge spreading in ${spreadingSurge.locality} (${spreadingSurge.pincode}) with ${spreadingSurge.report_count} merged incidents! Warning to all members: check the map now.`,
                icon: "/icons/icon-192x192.png",
              });
            } catch (e) {}
          }
        }
      } else {
        setClusters(DEFAULT_METRO_CLUSTERS);
      }
    } catch (err) {
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
      : clusters.filter((c) => {
          if (activeCategory === "CRIT") return c.severity === "CRIT" || (c.report_count || 0) >= 10;
          if (activeCategory === "HIGH") return c.severity === "HIGH" || ((c.report_count || 0) >= 5 && (c.report_count || 0) < 10);
          return c.severity === "MED" && (c.report_count || 0) < 5;
        });

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-[#F7F7F2] text-[#0A0A0A] overflow-hidden select-none">
      {/* ── Top Header Navigation Bar ── */}
      <header className="h-14 sm:h-16 border-b border-[#0A0A0A] bg-[#F7F7F2] px-3 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Return to Landing Page Button */}
          <Link
            href="/"
            className="h-9 sm:min-h-[44px] px-2.5 sm:px-3.5 rounded-[10px] sm:rounded-[12px] border border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F2] hover:opacity-90 flex items-center gap-1.5 sm:gap-2 text-xs font-bold uppercase transition cursor-pointer shrink-0"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Landing</span>
          </Link>

          {/* Desktop Sidebar Toggle Minimize/Maximize */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Minimize Sidebar" : "Maximize Sidebar"}
            className="hidden md:flex w-10 h-10 sm:w-11 sm:h-11 items-center justify-center rounded-[10px] sm:rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer shrink-0"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 sm:w-5 sm:h-5" /> : <PanelLeftOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[8px] sm:rounded-[12px] bg-[#0A0A0A] text-[#F7F7F2] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-[#E5201B]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-[#0A0A0A] truncate">
                ScamRadar
              </h1>
              <span className="hidden lg:inline-flex px-1.5 py-0.2 bg-[#0A0A0A] text-[#F7F7F2] text-[9px] font-bold rounded-[4px] uppercase tracking-wider whitespace-nowrap">
                NATIONAL REGISTRY
              </span>
            </div>
            <p className="hidden xl:block text-[11px] opacity-70 truncate">
              Community Incident Radar &amp; Defense Hub
            </p>
          </div>
        </div>

        {/* Desktop Header Action Controls (Hidden on mobile; mobile uses Bottom Dock) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Map Maximize / Restore Toggle */}
          <button
            onClick={() => {
              setIsMapMaximized(!isMapMaximized);
              if (!isMapMaximized) setIsSidebarOpen(false);
              else setIsSidebarOpen(true);
            }}
            title={isMapMaximized ? "Restore Layout" : "Maximize Map View"}
            className="min-h-[40px] px-3 rounded-[10px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center gap-1.5 text-xs font-bold uppercase transition cursor-pointer"
          >
            {isMapMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{isMapMaximized ? "Restore" : "Maximize"}</span>
          </button>

          <button
            onClick={() => setIsLookupOpen(true)}
            className="min-h-[40px] px-3.5 rounded-[10px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center gap-2 text-xs font-bold uppercase transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Instant Lookup</span>
          </button>

          <button
            onClick={() => {
              setDisputeInitialData(null);
              setIsDisputeOpen(true);
            }}
            className="min-h-[40px] px-3 rounded-[10px] border border-[#0A0A0A] bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] flex items-center gap-1.5 text-xs font-bold uppercase transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#23E000]" />
            <span>Dispute</span>
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            className="min-h-[40px] px-3.5 rounded-[10px] border border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F2] hover:opacity-90 flex items-center gap-2 text-xs font-bold uppercase transition cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#23E000]" />
            <span>Report Scam</span>
          </button>
        </div>

        {/* Mobile Header Quick Actions */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`h-9 px-2.5 rounded-[8px] border border-[#0A0A0A] text-[11px] font-bold uppercase flex items-center gap-1 transition ${
              isSidebarOpen ? "bg-[#0A0A0A] text-[#F7F7F2]" : "bg-[#F7F7F2] text-[#0A0A0A]"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#E5201B]" />
            <span>Hotspots ({clusters.length})</span>
          </button>

          <a
            href="tel:1930"
            className="h-9 px-2.5 rounded-[8px] bg-[#E5201B] text-[#F7F7F2] text-[11px] font-black uppercase flex items-center gap-1 shadow-sm"
            title="Emergency Cyber Crime Helpline 1930"
          >
            <PhoneCall className="w-3 h-3" />
            <span>1930</span>
          </a>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 overflow-hidden relative pb-16 md:pb-0">
        {/* ── DESKTOP SIDEBAR (Inline slide-in on >= md) ── */}
        <aside
          className={`hidden md:flex border-r border-[#0A0A0A] bg-[#F7F7F2] flex-col shrink-0 overflow-hidden z-10 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-80 lg:w-96" : "w-0 border-r-0"
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

          {/* Active Spreading Heatmap Cluster Alert Card */}
          {surgeWarning && (
            <div
              onClick={() => setSelectedArea(surgeWarning)}
              className="m-3 p-3 rounded-[12px] bg-[rgba(229,32,27,0.12)] border-2 border-[#E5201B] text-[#0A0A0A] cursor-pointer hover:bg-[rgba(229,32,27,0.18)] transition shadow-sm"
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
                {surgeWarning.report_count} incidents merged. Warning to all members!
              </div>
            </div>
          )}

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
                  className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-bold uppercase transition cursor-pointer border border-[#0A0A0A] ${
                    activeCategory === cat.id
                      ? "bg-[#0A0A0A] text-[#F7F7F2]"
                      : "bg-[#F7F7F2] text-[#0A0A0A] hover:bg-[rgba(10,10,10,0.06)]"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono border border-current ${
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
                    className={`p-3 rounded-[10px] border border-[#0A0A0A] cursor-pointer transition ${
                      isSelected
                        ? "bg-[rgba(229,32,27,0.1)] border-[#E5201B]"
                        : "bg-[#F7F7F2] hover:bg-[rgba(10,10,10,0.06)]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-xs text-[#0A0A0A]">
                          {c.locality}
                        </div>
                        <div className="text-[10px] opacity-70 mt-0.5">
                          {c.city} &bull; PIN {c.pincode}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] border border-[#E5201B] bg-[rgba(229,32,27,0.12)] text-[#E5201B]">
                        {c.severity}
                      </span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-[#0A0A0A]/20 flex items-center justify-between text-[10px]">
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
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-[8px] border border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer font-bold uppercase text-[10px]"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </aside>

        {/* ── MOBILE SLIDE-OVER DRAWER (When open on mobile) ── */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex md:hidden animate-fadeIn">
            <div className="w-[85vw] max-w-sm h-full bg-[#F7F7F2] border-r border-[#0A0A0A] flex flex-col shadow-2xl animate-slideRight">
              {/* Mobile Drawer Header */}
              <div className="p-3.5 border-b border-[#0A0A0A] flex items-center justify-between bg-[#0A0A0A] text-[#F7F7F2]">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#E5201B]" />
                  <span className="text-xs font-black uppercase tracking-wider font-futuristic">
                    Hotspot Clusters ({clusters.length})
                  </span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-7 h-7 rounded-[6px] border border-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Filter Category Pills */}
              <div className="p-3 border-b border-[#0A0A0A] bg-[#FFFFFF] overflow-x-auto flex gap-1.5 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase whitespace-nowrap transition cursor-pointer border border-[#0A0A0A] ${
                      activeCategory === cat.id
                        ? "bg-[#0A0A0A] text-[#F7F7F2]"
                        : "bg-[#F7F7F2] text-[#0A0A0A]"
                    }`}
                  >
                    {cat.label} ({cat.count})
                  </button>
                ))}
              </div>

              {/* Mobile Cluster Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredClusters.map((c) => {
                  const isSelected = selectedArea?.pincode === c.pincode;
                  return (
                    <div
                      key={c.pincode}
                      onClick={() => {
                        setSelectedArea(c);
                        setIsSidebarOpen(false); // Close drawer to show map on mobile
                      }}
                      className={`p-3 rounded-[10px] border border-[#0A0A0A] cursor-pointer transition ${
                        isSelected
                          ? "bg-[rgba(229,32,27,0.1)] border-[#E5201B]"
                          : "bg-white hover:bg-[rgba(10,10,10,0.04)]"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-[#0A0A0A]">
                            {c.locality}
                          </div>
                          <div className="text-[10px] opacity-70">
                            {c.city} &bull; PIN {c.pincode}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#E5201B] bg-[rgba(229,32,27,0.1)] text-[#E5201B]">
                          {c.severity}
                        </span>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-[#0A0A0A]/10 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-[#E5201B]">
                          {c.report_count} incidents
                        </span>
                        <span className="text-[9px] text-[#23E000] font-black uppercase">
                          Tap to View Map &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Drawer Footer */}
              <div className="p-3 border-t border-[#0A0A0A] bg-[#F7F7F2] flex items-center justify-between text-[11px]">
                <span className="text-[10px] opacity-70">Sync: {lastRefreshed || "Just now"}</span>
                <button
                  onClick={fetchData}
                  className="px-2.5 py-1 rounded-[6px] border border-[#0A0A0A] bg-black text-white text-[10px] font-bold uppercase"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Interactive Map View (Full canvas on mobile) ── */}
        <main className="flex-1 relative h-full bg-[#F7F7F2]">
          {/* Spreading Heatmap Warning Notification Banner */}
          {surgeWarning && (
            <div className="absolute top-3 left-3 right-3 sm:left-6 sm:right-6 z-[1000] max-w-xl mx-auto bg-[#0A0A0A] text-[#F7F7F2] border-2 border-[#E5201B] rounded-[12px] p-3 shadow-2xl animate-fadeIn flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-[6px] bg-[#E5201B] text-[#F7F7F2] flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <BellRing className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-[#E5201B] text-[#F7F7F2] text-[9px] font-mono font-black uppercase">
                      WARNING TO ALL MEMBERS
                    </span>
                    <span className="text-[10px] font-bold text-[#23E000] font-mono">
                      {surgeWarning.report_count} MERGED
                    </span>
                  </div>
                  <p className="text-xs font-bold mt-0.5 text-[#F7F7F2] leading-snug">
                    Scam surge spreading in {surgeWarning.locality} ({surgeWarning.pincode})!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSelectedArea(surgeWarning)}
                  className="h-7 px-2 bg-[#23E000] text-[#0A0A0A] rounded-[6px] text-[10px] font-black uppercase hover:bg-white transition cursor-pointer"
                >
                  Locate
                </button>
                <button
                  onClick={() => setSurgeWarning(null)}
                  className="w-7 h-7 rounded-[6px] border border-white/20 hover:bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-3.5 h-3.5" />
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
        </main>
      </div>

      {/* ── Mobile PWA Bottom Navigation Dock (md:hidden) ── */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A0A0A] border-t-2 border-[#23E000]/40 px-2 py-1.5 flex items-center justify-around shadow-2xl"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {/* 1. Radar Map */}
        <button
          onClick={() => {
            setIsSidebarOpen(false);
            setSelectedArea(null);
          }}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 text-[#F7F7F2] hover:text-[#23E000] transition cursor-pointer"
        >
          <Compass className="w-5 h-5 mb-0.5 text-[#23E000]" />
          <span className="text-[10px] font-bold tracking-wider font-futuristic uppercase">Radar</span>
        </button>

        {/* 2. Instant Lookup */}
        <button
          onClick={() => setIsLookupOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 text-[#F7F7F2] hover:text-[#23E000] transition cursor-pointer"
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-wider font-futuristic uppercase">Verify</span>
        </button>

        {/* 3. REPORT SCAM (Prominent Center Action Button) */}
        <button
          onClick={() => setIsReportOpen(true)}
          className="flex flex-col items-center justify-center -mt-5 cursor-pointer group"
          title="Report Scam Incident"
        >
          <div className="w-12 h-12 rounded-full bg-[#E5201B] border-2 border-[#23E000] flex items-center justify-center shadow-[0_0_15px_rgba(35,224,0,0.4)] group-hover:scale-105 transition-transform text-[#F7F7F2]">
            <PlusCircle className="w-6 h-6 text-[#F7F7F2]" />
          </div>
          <span className="text-[9px] font-black tracking-wider font-futuristic uppercase text-[#23E000] mt-0.5">
            Report
          </span>
        </button>

        {/* 4. Hotspots Drawer Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 text-[#F7F7F2] hover:text-[#E5201B] transition cursor-pointer relative"
        >
          <Flame className="w-5 h-5 mb-0.5 text-[#E5201B]" />
          <span className="text-[10px] font-bold tracking-wider font-futuristic uppercase">Hotspots</span>
          <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-[#E5201B] text-[#F7F7F2] text-[8px] font-mono font-bold flex items-center justify-center">
            {clusters.length}
          </span>
        </button>

        {/* 5. Dispute */}
        <button
          onClick={() => {
            setDisputeInitialData(null);
            setIsDisputeOpen(true);
          }}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 text-[#F7F7F2] hover:text-[#23E000] transition cursor-pointer"
        >
          <ShieldCheck className="w-5 h-5 mb-0.5 text-[#23E000]" />
          <span className="text-[10px] font-bold tracking-wider font-futuristic uppercase">Dispute</span>
        </button>
      </nav>

      {/* ── Modals ── */}
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
