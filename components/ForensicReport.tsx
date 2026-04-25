"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiskBadge from "./RiskBadge";
import ScreenshotPreview from "./ScreenshotPreview";
import VoiceVerdict from "./VoiceVerdict";
import PDFExport from "./PDFExport";

// ── Types ──────────────────────────────────────────────────────────────

interface Signal {
  check: string;
  status: "FAIL" | "WARN" | "PASS";
  severity: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  technical: string;
}

interface UrlAnalysisItem {
  original: string;
  unshortened: string;
  isSuspicious: boolean;
  reason: string;
  virusTotalScore: string;
  screenshotUrl: string;
}

interface ReportData {
  analysis: {
    verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
    overallScore: number;
    signals: Signal[];
    senderAnalysis: {
      fromDomain: string;
      returnPathDomain: string;
      mismatch: boolean;
      explanation: string;
    };
    urlAnalysis: UrlAnalysisItem[];
    homographAnalysis: {
      detected: boolean;
      domains: string[];
      explanation: string;
    };
    headerAnalysis: {
      hops: number;
      suspiciousHops: string[];
      explanation: string;
    };
    replicaDetection: {
      targetBrand: string;
      similarityScore: number;
      explanation: string;
    };
    summary: string;
    technicalSummary: string;
  };
  enrichment: {
    screenshot: {
      url: string | null;
      screenshotUrl: string | null;
    };
  };
  parsed: {
    from: string;
    subject: string;
    senderDomain: string;
    spf: string;
    dkim: string;
    dmarc: string;
  };
  timings: {
    total: number;
  };
}

interface ForensicReportProps {
  data: ReportData;
}

// ── Verdict Config ─────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  HIGH_RISK: {
    label: "PHISHING DETECTED",
    sublabel: "This email contains strong indicators of a phishing attack",
    bg: "from-red-600/20 to-red-900/10",
    border: "border-red-500/30",
    text: "text-red-400",
    icon: "🚨",
    glow: "shadow-red-500/10",
    ring: "text-red-500",
    ringTrack: "text-red-500/10",
  },
  MEDIUM_RISK: {
    label: "SUSPICIOUS EMAIL",
    sublabel: "This email has some concerning elements that warrant caution",
    bg: "from-amber-600/20 to-amber-900/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    icon: "⚠️",
    glow: "shadow-amber-500/10",
    ring: "text-amber-500",
    ringTrack: "text-amber-500/10",
  },
  SAFE: {
    label: "EMAIL APPEARS SAFE",
    sublabel: "No significant phishing indicators were found",
    bg: "from-emerald-600/20 to-emerald-900/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    icon: "✅",
    glow: "shadow-emerald-500/10",
    ring: "text-emerald-500",
    ringTrack: "text-emerald-500/10",
  },
};

// ── Circular Score Component ───────────────────────────────────────────

function CircularScore({ score, verdict }: { score: number; verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE" }) {
  const config = VERDICT_CONFIG[verdict];
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className={config.ringTrack} stroke="currentColor" />
        {/* Progress */}
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth="6"
          className={config.ring}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className={`text-3xl font-bold ${config.text}`}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Risk Score</span>
      </div>
    </div>
  );
}

// ── Signal Card ────────────────────────────────────────────────────────

function SignalCard({ signal, index }: { signal: Signal; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const borderColor =
    signal.status === "FAIL" ? "border-l-red-500" :
    signal.status === "WARN" ? "border-l-amber-500" : "border-l-emerald-500";

  const bgColor =
    signal.status === "FAIL" ? "bg-red-500/[0.03]" :
    signal.status === "WARN" ? "bg-amber-500/[0.03]" : "bg-emerald-500/[0.03]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      className={`rounded-xl border border-white/[0.06] border-l-[3px] ${borderColor} ${bgColor} overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 text-left flex items-start justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <RiskBadge status={signal.status} label={signal.status} size="sm" />
            <span className="text-xs text-white/20 uppercase tracking-wider">{signal.severity}</span>
          </div>
          <h4 className="text-sm font-semibold text-white/90">{signal.check}</h4>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">{signal.detail}</p>
        </div>
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }}
          className="w-4 h-4 text-white/20 mt-1 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-white/[0.04]">
              <p className="text-xs text-white/30 pt-3 font-mono leading-relaxed">{signal.technical}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Auth Badge ─────────────────────────────────────────────────────────

function AuthBadge({ protocol, result }: { protocol: string; result: string }) {
  const status: "FAIL" | "WARN" | "PASS" =
    result === "pass" ? "PASS" :
    result === "fail" || result === "softfail" ? "FAIL" : "WARN";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40 font-mono w-12">{protocol}</span>
      <RiskBadge status={status} label={result || "N/A"} size="sm" />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function ForensicReport({ data }: ForensicReportProps) {
  const { analysis, enrichment, parsed, timings } = data;
  const config = VERDICT_CONFIG[analysis.verdict];

  return (
    <motion.div
      id="forensic-report"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      {/* ── Verdict Banner ────────────────────────────────────── */}
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: [0.95, 1.02, 1] }}
        transition={{ duration: 0.6, times: [0, 0.6, 1] }}
        className={`rounded-2xl border ${config.border} bg-gradient-to-br ${config.bg} p-6 sm:p-8 shadow-2xl ${config.glow}`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Score circle */}
          <CircularScore score={analysis.overallScore} verdict={analysis.verdict} />

          {/* Verdict text */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
              <span className="text-2xl">{config.icon}</span>
              <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${config.text}`}>
                {config.label}
              </h2>
            </div>
            <p className="text-sm text-white/50 mb-4">{config.sublabel}</p>
            <p className="text-sm text-white/70 leading-relaxed">{analysis.summary}</p>
          </div>
        </div>

        {/* Auth results row */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap items-center gap-4">
          <AuthBadge protocol="SPF" result={parsed.spf} />
          <AuthBadge protocol="DKIM" result={parsed.dkim} />
          <AuthBadge protocol="DMARC" result={parsed.dmarc} />
          <div className="ml-auto flex items-center gap-2 text-xs text-white/20">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {timings?.total ? `${(timings.total / 1000).toFixed(1)}s` : "—"}
          </div>
        </div>
      </motion.div>

      {/* ── Voice Verdict ──────────────────────────────────────── */}
      <VoiceVerdict
        verdict={analysis.verdict}
        overallScore={analysis.overallScore}
        signals={analysis.signals || []}
        summary={analysis.summary}
        homographDomain={analysis.homographAnalysis?.domains?.[0]}
        targetBrand={analysis.replicaDetection?.targetBrand}
        autoPlay={true}
      />

      {/* ── Sender Analysis ───────────────────────────────────── */}
      {analysis.senderAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Sender Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">From Domain</p>
              {analysis.senderAnalysis.fromDomain && 
               !analysis.senderAnalysis.fromDomain.toLowerCase().includes("unknown") ? (
                <p className="text-sm font-mono text-white/80">{analysis.senderAnalysis.fromDomain}</p>
              ) : (
                <p className="text-xs text-white/30 italic">Not available — paste raw email with headers</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Return-Path Domain</p>
              <div className="flex items-center gap-2">
                {analysis.senderAnalysis.returnPathDomain && 
                 !analysis.senderAnalysis.returnPathDomain.toLowerCase().includes("unknown") ? (
                  <p className="text-sm font-mono text-white/80">{analysis.senderAnalysis.returnPathDomain}</p>
                ) : (
                  <p className="text-xs text-white/30 italic">No headers found — paste full raw email source for header analysis</p>
                )}
                {analysis.senderAnalysis.mismatch && (
                  <RiskBadge status="FAIL" label="MISMATCH" size="sm" />
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-white/40 mt-3 leading-relaxed">{analysis.senderAnalysis.explanation}</p>
        </motion.div>
      )}

      {/* ── Signals Grid ──────────────────────────────────────── */}
      {analysis.signals && analysis.signals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2 px-1">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Security Signals ({analysis.signals.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {analysis.signals.map((signal, index) => (
              <SignalCard key={`${signal.check}-${index}`} signal={signal} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* ── URL Analysis ──────────────────────────────────────── */}
      {analysis.urlAnalysis && analysis.urlAnalysis.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/[0.06] bg-[#111111] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              URL Analysis ({analysis.urlAnalysis.length})
            </h3>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {analysis.urlAnalysis.map((urlItem, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/30 mb-0.5">Original</p>
                    <p className="text-sm font-mono text-white/60 truncate">{urlItem.original}</p>
                  </div>
                  {urlItem.unshortened && urlItem.unshortened !== urlItem.original && (
                    <>
                      <svg className="w-4 h-4 text-white/10 hidden sm:block flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/30 mb-0.5">Unshortened</p>
                        <p className="text-sm font-mono text-white/60 truncate">{urlItem.unshortened}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <RiskBadge
                    status={urlItem.isSuspicious ? "FAIL" : "PASS"}
                    label={urlItem.isSuspicious ? "Suspicious" : "Clean"}
                    size="sm"
                  />
                  {urlItem.virusTotalScore && (
                    <span className="text-xs text-white/30 font-mono">VT: {urlItem.virusTotalScore}</span>
                  )}
                  {urlItem.reason && (
                    <span className="text-xs text-white/40">{urlItem.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Screenshot Preview ────────────────────────────────── */}
      {enrichment?.screenshot?.screenshotUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2 px-1">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Safe Preview
          </h3>
          <ScreenshotPreview
            url={enrichment.screenshot.url || ""}
            screenshotUrl={enrichment.screenshot.screenshotUrl}
            isSuspicious={analysis.verdict === "HIGH_RISK"}
          />
        </motion.div>
      )}

      {/* ── Homograph Analysis ────────────────────────────────── */}
      {analysis.homographAnalysis?.detected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6"
        >
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <span>🔤</span> Homograph Attack Detected
          </h3>
          <p className="text-xs text-white/50 leading-relaxed">{analysis.homographAnalysis.explanation}</p>
          {analysis.homographAnalysis.domains.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.homographAnalysis.domains.map((domain, i) => (
                <span key={i} className="px-2 py-1 rounded bg-red-500/10 text-red-300 text-xs font-mono">
                  {domain}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Technical Summary ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6"
      >
        <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Technical Summary
        </h3>
        <p className="text-xs text-white/40 font-mono leading-relaxed whitespace-pre-wrap">
          {analysis.technicalSummary}
        </p>
      </motion.div>

      {/* ── Actions Bar ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between pt-2 pb-8"
      >
        <p className="text-xs text-white/15">
          Analysis ID: {Date.now().toString(36).toUpperCase()}
        </p>
        <PDFExport reportData={data as any} />
      </motion.div>
    </motion.div>
  );
}
