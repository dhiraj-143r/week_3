"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
} from "react-simple-maps";

// ── Types ──────────────────────────────────────────────────────────────

export interface HopData {
  ip: string;
  city: string;
  country: string;
  countryCode: string;
  org: string;
  isSuspicious: boolean;
  lat?: number;
  lng?: number;
}

interface HeaderHopMapProps {
  hops: HopData[];
  rawIPs?: string[];
}

// ── Geo URL (Natural Earth TopoJSON) ───────────────────────────────────

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ── Country → approximate center coords ────────────────────────────────

const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [-98.5, 39.8], IN: [78.9, 20.6], GB: [-1.2, 52.5], DE: [10.4, 51.2],
  FR: [2.2, 46.6], JP: [138.3, 36.2], CN: [104.2, 35.9], RU: [105.3, 61.5],
  BR: [-51.9, -14.2], AU: [133.8, -25.3], CA: [-106.3, 56.1], KR: [127.8, 35.9],
  SG: [103.8, 1.35], NL: [5.3, 52.1], SE: [18.6, 60.1], IE: [-8.2, 53.4],
  IT: [12.6, 41.9], ES: [-3.7, 40.4], CH: [8.2, 46.8], PL: [19.1, 51.9],
  UA: [31.2, 48.4], NG: [8.7, 9.1], ZA: [22.9, -30.6], MX: [-102.5, 23.6],
  AR: [-63.6, -38.4], CL: [-71.5, -35.7], CO: [-74.3, 4.6], EG: [30.8, 26.8],
  SA: [45.1, 23.9], AE: [53.8, 23.4], TR: [35.2, 38.9], PK: [69.3, 30.4],
  BD: [90.4, 23.7], ID: [113.9, -0.8], MY: [101.9, 4.2], TH: [100.9, 15.9],
  VN: [108.3, 14.1], PH: [121.8, 12.9], TW: [120.9, 23.7], HK: [114.1, 22.4],
  IL: [34.9, 31.0], FI: [25.7, 61.9], NO: [8.5, 60.5], DK: [9.5, 56.3],
  PT: [-8.2, 39.4], AT: [14.6, 47.5], BE: [4.5, 50.5], CZ: [15.5, 49.8],
  RO: [24.9, 45.9], HU: [19.5, 47.2], GR: [21.8, 39.1], NZ: [174.9, -40.9],
  KE: [37.9, -0.02], GH: [-1.0, 7.9], LK: [80.8, 7.9], BG: [25.5, 42.7],
};

// ── Helpers ────────────────────────────────────────────────────────────

/** Convert country code to flag emoji. */
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const points = code
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...points);
}

/** Get coordinates for a hop — prefer lat/lng, fall back to country lookup. */
function getCoords(hop: HopData): [number, number] | null {
  if (hop.lng && hop.lat) return [hop.lng, hop.lat];
  if (hop.countryCode && COUNTRY_COORDS[hop.countryCode.toUpperCase()]) {
    return COUNTRY_COORDS[hop.countryCode.toUpperCase()];
  }
  return null;
}

/** Count unique countries in hops. */
function uniqueCountries(hops: HopData[]): string[] {
  const set = new Set<string>();
  hops.forEach((h) => {
    if (h.country) set.add(h.country);
  });
  return Array.from(set);
}

// ── Tooltip Component ──────────────────────────────────────────────────

function HopTooltip({ hop, position }: { hop: HopData; position: { x: number; y: number } }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-[100] pointer-events-none"
      style={{ left: position.x + 12, top: position.y - 10 }}
    >
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 shadow-xl max-w-[220px]">
        <p className="text-xs font-mono text-white/80 mb-1">{hop.ip}</p>
        <p className="text-[11px] text-white/50">{hop.org || "Unknown org"}</p>
        <p className="text-[11px] text-white/40">
          {hop.city ? `${hop.city}, ` : ""}{hop.country || "Unknown location"}
        </p>
        {hop.isSuspicious && (
          <p className="text-[10px] text-red-400 mt-1 font-medium">⚠ Suspicious server</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function HeaderHopMap({ hops, rawIPs }: HeaderHopMapProps) {
  const [hoveredHop, setHoveredHop] = useState<{ hop: HopData; pos: { x: number; y: number } } | null>(null);
  const hasGeoData = hops.some((h) => getCoords(h) !== null);
  const countries = useMemo(() => uniqueCountries(hops), [hops]);

  // Build coordinate pairs for the lines
  const geoHops = useMemo(
    () =>
      hops
        .map((h, i) => ({ ...h, coords: getCoords(h), index: i }))
        .filter((h) => h.coords !== null) as (HopData & { coords: [number, number]; index: number })[],
    [hops]
  );

  // ── No data fallback ──────────────────────────────────
  if (hops.length === 0 && (!rawIPs || rawIPs.length === 0)) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 text-center">
        <svg className="w-10 h-10 text-white/10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-white/30">No header hops detected</p>
      </div>
    );
  }

  // ── Fallback: raw IP list (no geolocation) ─────────────
  if (!hasGeoData) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#111111] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-white/70">Header Hop Trace</h3>
        </div>

        <div className="px-6 py-3 bg-amber-500/[0.04] border-b border-white/[0.04]">
          <p className="text-xs text-amber-400/70 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Geolocation unavailable — showing raw IP addresses from headers
          </p>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {(rawIPs && rawIPs.length > 0 ? rawIPs : hops.map((h) => h.ip)).map((ip, i) => (
            <div key={i} className="px-6 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center text-[10px] text-white/30 font-mono">
                {i + 1}
              </span>
              <span className="text-sm font-mono text-white/60">{ip}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Full map view ──────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-[#111111] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-white/70">Email Route Map</h3>
        </div>
        <span className="text-xs text-white/25">
          {countries.length} {countries.length === 1 ? "country" : "countries"} · {hops.length} hops
        </span>
      </div>

      {/* Map — hidden on mobile */}
      <div className="hidden md:block relative bg-[#0d0d0d]">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 130, center: [10, 25] }}
          style={{ width: "100%", height: "auto" }}
          width={800}
          height={400}
        >
          {/* World geography */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rpiKey || geo.properties.name}
                  geography={geo}
                  fill="#1a1a1a"
                  stroke="#252525"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#222222" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Connecting lines */}
          {geoHops.map((hop, i) => {
            if (i === 0) return null;
            const prev = geoHops[i - 1];
            const anySuspiciousBefore = geoHops.slice(0, i + 1).some((h) => h.isSuspicious);
            return (
              <Line
                key={`line-${i}`}
                from={prev.coords}
                to={hop.coords}
                stroke={anySuspiciousBefore ? "#ef4444" : "#22c55e"}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray="4 2"
                style={{ opacity: 0.6 }}
              />
            );
          })}

          {/* Hop markers */}
          {geoHops.map((hop, i) => (
            <Marker
              key={`marker-${i}`}
              coordinates={hop.coords}
              onMouseEnter={(e: React.MouseEvent) =>
                setHoveredHop({ hop, pos: { x: e.clientX, y: e.clientY } })
              }
              onMouseLeave={() => setHoveredHop(null)}
            >
              {/* Pulse ring */}
              <circle
                r={8}
                fill={hop.isSuspicious ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"}
                className="animate-ping"
                style={{ animationDuration: "2s" }}
              />
              {/* Solid dot */}
              <circle
                r={4}
                fill={hop.isSuspicious ? "#ef4444" : "#22c55e"}
                stroke="#0a0a0a"
                strokeWidth={1.5}
              />
              {/* Hop number */}
              <text
                textAnchor="middle"
                y={-10}
                style={{
                  fill: "rgba(255,255,255,0.5)",
                  fontSize: "8px",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                {i + 1}
              </text>
            </Marker>
          ))}
        </ComposableMap>

        {/* Tooltip portal */}
        <AnimatePresence>
          {hoveredHop && <HopTooltip hop={hoveredHop.hop} position={hoveredHop.pos} />}
        </AnimatePresence>
      </div>

      {/* Summary bar */}
      <div className="px-6 py-3 bg-white/[0.01] border-t border-white/[0.04] border-b border-b-white/[0.04]">
        <p className="text-xs text-white/40">
          {countries.length > 1
            ? `This email travelled through ${countries.length} countries before reaching you: ${countries.join(", ")}`
            : `This email was routed within ${countries[0] || "an unknown region"}`}
        </p>
      </div>

      {/* Hop list */}
      <div className="divide-y divide-white/[0.04]">
        {hops.map((hop, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            className={`px-6 py-3 flex items-center gap-4 ${
              hop.isSuspicious ? "bg-red-500/[0.04]" : ""
            }`}
          >
            {/* Hop number */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold ${
                hop.isSuspicious
                  ? "bg-red-500/15 text-red-400"
                  : "bg-white/[0.04] text-white/40"
              }`}
            >
              {i + 1}
            </div>

            {/* IP */}
            <span className="text-sm font-mono text-white/60 w-36 flex-shrink-0 truncate">
              {hop.ip}
            </span>

            {/* Flag + location */}
            <span className="text-sm text-white/40 flex items-center gap-1.5 flex-1 min-w-0 truncate">
              <span className="text-base">{countryFlag(hop.countryCode)}</span>
              {hop.city ? `${hop.city}, ${hop.country}` : hop.country || "Unknown"}
            </span>

            {/* Org */}
            <span className="text-xs text-white/25 hidden sm:block truncate max-w-[180px]">
              {hop.org || "—"}
            </span>

            {/* Suspicious badge */}
            {hop.isSuspicious && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/20 flex-shrink-0">
                Suspicious
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
