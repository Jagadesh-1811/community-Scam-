"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function ScamMap({ clusters, selectedArea, onSelectArea, isSidebarOpen }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Use ResizeObserver to auto-invalidate map bounds whenever container size changes
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // When sidebar toggles or viewport changes, invalidate size with small timeout
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(t);
  }, [isSidebarOpen]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    clusters.forEach((c) => {
      if (!c.lat || !c.lng) return;

      const isSpreadingHeatmap = c.report_count >= 5;
      const isCrit = c.severity === "CRIT" || c.report_count >= 10;
      const isHigh = c.severity === "HIGH" || c.report_count >= 5;

      const color = "#E5201B";
      const fillOpacity = isCrit ? 0.85 : isHigh ? 0.55 : 0.25;
      const radius = isCrit ? 20 : isHigh ? 15 : 10;

      // ── Spreading Heatmap Perimeter Ring for Consolidating Clusters (≥ 5 reports) ──
      if (isSpreadingHeatmap) {
        const spreadDistanceMeters = Math.min(3000, 1000 + (c.report_count * 180));
        const heatPerimeter = L.circle([c.lat, c.lng], {
          radius: spreadDistanceMeters,
          color: "#E5201B",
          weight: 1.5,
          opacity: 0.65,
          fillColor: "#E5201B",
          fillOpacity: 0.12,
          dashArray: "5, 8",
        });
        markersLayer.addLayer(heatPerimeter);
      }

      // Core cluster marker
      const circle = L.circleMarker([c.lat, c.lng], {
        radius: radius,
        fillColor: color,
        color: "#0A0A0A",
        weight: isSpreadingHeatmap ? 2.5 : 1.5,
        opacity: 1,
        fillOpacity: fillOpacity,
      });

      const popupHtml = `
        <div style="min-width: 190px; padding: 4px; font-family: inherit;">
          ${
            isSpreadingHeatmap
              ? `<div style="background: #E5201B; color: #FFFFFF; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">
                  🔥 CONSOLIDATED HEATMAP (${c.report_count} INCIDENTS MERGED)
                </div>`
              : ""
          }
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0A0A0A;">${c.locality}</strong>
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 6px; font-weight: 700; background: rgba(229, 32, 27, 0.12); color: #E5201B; border: 1px solid #E5201B;">
              ${c.severity}
            </span>
          </div>
          <div style="font-size: 12px; color: #0A0A0A; opacity: 0.8; margin-bottom: 4px;">
            PIN: <strong>${c.pincode}</strong> &bull; ${c.city}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #E5201B; margin-bottom: 4px;">
            ${c.report_count} Verified Incidents (1 Single Cluster)
          </div>
          ${
            isSpreadingHeatmap
              ? `<div style="font-size: 11px; font-weight: 700; color: #E5201B; background: rgba(229, 32, 27, 0.08); padding: 4px 6px; border-radius: 4px; border: 1px solid rgba(229, 32, 27, 0.3); margin-bottom: 4px;">
                  ⚠️ Warning to all members: Heatmap spreading in this zone!
                </div>`
              : ""
          }
          ${
            c.top_scam_type
              ? `<div style="font-size: 11px; color: #0A0A0A; background: rgba(10, 10, 10, 0.06); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(10, 10, 10, 0.15);">Top Vector: ${c.top_scam_type}</div>`
              : ""
          }
        </div>
      `;

      circle.bindPopup(popupHtml);

      circle.on("click", () => {
        if (onSelectArea) onSelectArea(c);
      });

      markersLayer.addLayer(circle);
    });

    if (selectedArea && selectedArea.lat && selectedArea.lng) {
      map.flyTo([selectedArea.lat, selectedArea.lng], 13, {
        duration: 1.0,
      });
    }
  }, [clusters, selectedArea, onSelectArea]);

  return (
    <div className="relative w-full h-full min-h-[450px] overflow-hidden bg-[#F7F7F2]">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
