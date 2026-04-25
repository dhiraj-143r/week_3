"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────

// Flexible report payload shape (dynamic from API)
interface ReportPayload {
  [key: string]: unknown;
  analysis?: { verdict?: string; overallScore?: number; signals?: unknown[] };
  parsed?: { subject?: string; from?: string };
}

interface TimelineEntry {
  id: string;
  timestamp: string;
  subject: string;
  from: string;
  verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
  score: number;
  signalCount: number;
  reportData: ReportPayload;
}

interface ThreatTimelineProps {
  onSelectReport: (report: ReportPayload) => void;
}

const STORAGE_KEY = "phishfilter_timeline";
const MAX_ENTRIES = 10;

const VERDICT_CONFIG = {
  HIGH_RISK: {
    dot: "bg-red-500",
    glow: "shadow-red-500/30",
    label: "High Risk",
    labelClass: "bg-red-500/15 text-red-400 border-red-500/20",
  },
  MEDIUM_RISK: {
    dot: "bg-amber-500",
    glow: "shadow-amber-500/30",
    label: "Suspicious",
    labelClass: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
  SAFE: {
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/30",
    label: "Safe",
    labelClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
};

// ── Public API: save analysis to timeline ──────────────────────────────

export function saveToTimeline(reportData: ReportPayload) {
  if (typeof window === "undefined") return;

  try {
    const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");

    const entry: TimelineEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      subject: reportData?.parsed?.subject || "Unknown Subject",
      from: reportData?.parsed?.from || "Unknown Sender",
      verdict: (reportData?.analysis?.verdict as TimelineEntry["verdict"]) || "SAFE",
      score: reportData?.analysis?.overallScore || 0,
      signalCount: reportData?.analysis?.signals?.length || 0,
      reportData,
    };

    existing.unshift(entry);
    const trimmed = existing.slice(0, MAX_ENTRIES);

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("[ThreatTimeline] Failed to save:", e);
  }
}

// ── Time formatting ────────────────────────────────────────────────────

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ── Component ──────────────────────────────────────────────────────────

export default function ThreatTimeline({ onSelectReport }: ThreatTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const load = () => {
      try {
        const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
        setEntries(data);
      } catch {
        setEntries([]);
      }
    };

    load();

    // Re-check periodically (sessionStorage doesn't fire events in same tab)
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const high = entries.filter((e) => e.verdict === "HIGH_RISK").length;
    const med = entries.filter((e) => e.verdict === "MEDIUM_RISK").length;
    const safe = entries.filter((e) => e.verdict === "SAFE").length;
    return { high, med, safe, total: entries.length };
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Toggle bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-3 rounded-xl border border-white/[0.06] bg-[#111111]
                   hover:bg-white/[0.03] transition-colors text-left"
      >
        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium text-white/60">Threat Timeline</span>

        {/* Stats pills */}
        <div className="flex items-center gap-1.5 ml-auto mr-2">
          {stats.high > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400">{stats.high}</span>
          )}
          {stats.med > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400">{stats.med}</span>
          )}
          {stats.safe > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400">{stats.safe}</span>
          )}
        </div>

        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="w-4 h-4 text-white/20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Timeline list */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#111111] divide-y divide-white/[0.04] overflow-hidden">
              {entries.map((entry, i) => {
                const config = VERDICT_CONFIG[entry.verdict] || VERDICT_CONFIG.SAFE;
                return (
                  <motion.button
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * i }}
                    onClick={() => onSelectReport(entry.reportData)}
                    className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${config.dot} shadow-lg ${config.glow}`} />
                      {i < entries.length - 1 && (
                        <div className="w-px h-full min-h-[20px] bg-white/[0.06] mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 truncate">{entry.subject}</p>
                      <p className="text-[11px] text-white/25 mt-0.5">
                        {entry.from} · {timeAgo(entry.timestamp)} · {entry.signalCount} signals
                      </p>
                    </div>

                    {/* Verdict badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${config.labelClass}`}>
                      {config.label}
                    </span>

                    {/* Score */}
                    <span className="text-xs text-white/20 font-mono w-8 text-right flex-shrink-0">{entry.score}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
