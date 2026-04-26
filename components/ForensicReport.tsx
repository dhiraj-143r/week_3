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
    bg: "from-red-600/15 to-red-900/5",
    border: "border-red-500/20",
    text: "text-red-400",
    icon: "🚨",
    glow: "shadow-red-500/5",
    ring: "text-red-400",
    ringTrack: "text-red-500/10",
    accentBg: "bg-red-500/8",
  },
  MEDIUM_RISK: {
    label: "SUSPICIOUS EMAIL",
    sublabel: "This email has some concerning elements that warrant caution",
    bg: "from-amber-600/15 to-amber-900/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    icon: "⚠️",
    glow: "shadow-amber-500/5",
    ring: "text-amber-400",
    ringTrack: "text-amber-500/10",
    accentBg: "bg-amber-500/8",
  },
  SAFE: {
    label: "EMAIL APPEARS SAFE",
    sublabel: "No significant phishing indicators were found",
    bg: "from-emerald-600/15 to-emerald-900/5",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    icon: "✅",
    glow: "shadow-emerald-500/5",
    ring: "text-emerald-400",
    ringTrack: "text-emerald-500/10",
    accentBg: "bg-emerald-500/8",
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
        <circle cx="60" cy="60" r="54" fill="none" strokeWidth="4" className={config.ringTrack} stroke="currentColor" />
        {/* Progress */}
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth="4"
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
          className={`text-3xl font-serif font-bold ${config.text}`}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-[#666] uppercase tracking-[0.15em] font-semibold">Risk Score</span>
      </div>
    </div>
  );
}

// ── Signal Card ────────────────────────────────────────────────────────

function SignalCard({ signal, index }: { signal: Signal; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const borderColor =
    signal.status === "FAIL" ? "border-l-red-400" :
    signal.status === "WARN" ? "border-l-amber-400" : "border-l-emerald-400";

  const bgColor =
    signal.status === "FAIL" ? "bg-red-500/[0.02]" :
    signal.status === "WARN" ? "bg-amber-500/[0.02]" : "bg-emerald-500/[0.02]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      className={`rounded-2xl border border-[rgba(255,255,255,0.08)] border-l-[3px] ${borderColor} ${bgColor} overflow-hidden card-interactive`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-5 text-left flex items-start justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <RiskBadge status={signal.status} label={signal.status} size="sm" />
            <span className="text-[10px] text-[#666] uppercase tracking-[0.15em] font-semibold">{signal.severity}</span>
          </div>
          <h4 className="text-sm font-semibold text-[#e5e5e5]">{signal.check}</h4>
          <p className="text-xs text-[#a3a3a3] mt-1.5 leading-relaxed">{signal.detail}</p>
        </div>
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }}
          className="w-4 h-4 text-[#666] mt-1 flex-shrink-0"
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
            <div className="px-6 pb-5 border-t border-[rgba(255,255,255,0.08)]">
              <p className="text-xs text-[#666] font-mono leading-relaxed pt-4">{signal.technical}</p>
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
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#666] font-mono w-12 font-semibold">{protocol}</span>
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
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      {/* ── Verdict Banner ────────────────────────────────────── */}
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: [0.95, 1.01, 1] }}
        transition={{ duration: 0.6, times: [0, 0.6, 1] }}
        className={`rounded-2xl border ${config.border} bg-gradient-to-br ${config.bg} p-8 sm:p-10 shadow-2xl ${config.glow}`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Score circle */}
          <CircularScore score={analysis.overallScore} verdict={analysis.verdict} />

          {/* Verdict text */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
              <span className="text-2xl">{config.icon}</span>
              <h2 className={`text-xl sm:text-2xl font-serif font-bold tracking-tight ${config.text}`}>
                {config.label}
              </h2>
            </div>
            <p className="text-sm text-[#a3a3a3] mb-4">{config.sublabel}</p>
            <p className="text-sm text-[#b3b3b3] leading-relaxed">{analysis.summary}</p>
          </div>
        </div>

        {/* Auth results row */}
        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap items-center gap-5">
          <AuthBadge protocol="SPF" result={parsed.spf} />
          <AuthBadge protocol="DKIM" result={parsed.dkim} />
          <AuthBadge protocol="DMARC" result={parsed.dmarc} />
          <div className="ml-auto flex items-center gap-2 text-xs text-[#666]">
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
          className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161616] p-7"
        >
          <h3 className="text-sm font-serif font-bold text-[#d4d4d4] mb-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            Sender Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)]">
              <p className="text-[10px] text-[#666] uppercase tracking-[0.15em] font-semibold mb-2">From Domain</p>
              {analysis.senderAnalysis.fromDomain && 
               !analysis.senderAnalysis.fromDomain.toLowerCase().includes("unknown") ? (
                <p className="text-sm font-mono text-[#d4d4d4]">{analysis.senderAnalysis.fromDomain}</p>
              ) : (
                <p className="text-xs text-[#666] italic">Not available — paste raw email with headers</p>
              )}
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)]">
              <p className="text-[10px] text-[#666] uppercase tracking-[0.15em] font-semibold mb-2">Return-Path Domain</p>
              <div className="flex items-center gap-2">
                {analysis.senderAnalysis.returnPathDomain && 
                 !analysis.senderAnalysis.returnPathDomain.toLowerCase().includes("unknown") ? (
                  <p className="text-sm font-mono text-[#d4d4d4]">{analysis.senderAnalysis.returnPathDomain}</p>
                ) : (
                  <p className="text-xs text-[#666] italic">No headers found — paste full raw email source for header analysis</p>
                )}
                {analysis.senderAnalysis.mismatch && (
                  <RiskBadge status="FAIL" label="MISMATCH" size="sm" />
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#a3a3a3] mt-4 leading-relaxed">{analysis.senderAnalysis.explanation}</p>
        </motion.div>
      )}

      {/* ── Signals Grid ──────────────────────────────────────── */}
      {analysis.signals && analysis.signals.length > 0 && (
        <div>
          <h3 className="text-sm font-serif font-bold text-[#d4d4d4] mb-5 flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
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
          className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161616] overflow-hidden"
        >
          <div className="px-7 py-5 border-b border-[rgba(255,255,255,0.08)]">
            <h3 className="text-sm font-serif font-bold text-[#d4d4d4] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              URL Analysis ({analysis.urlAnalysis.length})
            </h3>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {analysis.urlAnalysis.map((urlItem, index) => (
              <div key={index} className="px-7 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#666] uppercase tracking-[0.15em] font-semibold mb-1">Original</p>
                    <p className="text-sm font-mono text-foreground/60 truncate">{urlItem.original}</p>
                  </div>
                  {urlItem.unshortened && urlItem.unshortened !== urlItem.original && (
                    <>
                      <svg className="w-4 h-4 text-[#666]/30 hidden sm:block flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#666] uppercase tracking-[0.15em] font-semibold mb-1">Unshortened</p>
                        <p className="text-sm font-mono text-foreground/60 truncate">{urlItem.unshortened}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge
                    status={urlItem.isSuspicious ? "FAIL" : "PASS"}
                    label={urlItem.isSuspicious ? "Suspicious" : "Clean"}
                    size="sm"
                  />
                  {urlItem.virusTotalScore && (
                    <span className="text-xs text-[#666] font-mono">VT: {urlItem.virusTotalScore}</span>
                  )}
                  {urlItem.reason && (
                    <span className="text-xs text-[#a3a3a3]">{urlItem.reason}</span>
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
          <h3 className="text-sm font-serif font-bold text-[#d4d4d4] mb-5 flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
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
          className="rounded-2xl border border-red-500/15 bg-red-500/[0.02] p-7"
        >
          <h3 className="text-sm font-serif font-bold text-red-400 mb-4 flex items-center gap-3">
            <span>🔤</span> Homograph Attack Detected
          </h3>
          <p className="text-xs text-[#a3a3a3] leading-relaxed">{analysis.homographAnalysis.explanation}</p>
          {analysis.homographAnalysis.domains.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.homographAnalysis.domains.map((domain, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-300 text-xs font-mono border border-red-500/15">
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
        className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161616] p-7"
      >
        <h3 className="text-sm font-serif font-bold text-[#d4d4d4] mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          Technical Summary
        </h3>
        <p className="text-xs text-[#a3a3a3] font-mono leading-relaxed whitespace-pre-wrap">
          {analysis.technicalSummary}
        </p>
      </motion.div>

      {/* ── Actions Bar ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between pt-4 pb-8"
      >
        <p className="text-xs text-[#666]">
          Analysis ID: {Date.now().toString(36).toUpperCase()}
        </p>
        <PDFExport reportData={data as any} />
      </motion.div>
    </motion.div>
  );
}
