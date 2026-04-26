"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────

interface AttachmentScanResult {
  filename: string;
  type: string;
  size: number;
  verdict: string;
  score: number;
  summary: string;
}

interface ScannedEmail {
  uid: number;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
  attachmentCount?: number;
  attachmentResults?: AttachmentScanResult[];
  verdict?: string;
  score?: number;
  signalCount?: number;
  topSignals?: { check: string; status: string; detail: string }[];
  summary?: string;
  error?: string;
}

interface ScanSummary {
  highRisk: number;
  mediumRisk: number;
  safe: number;
  errors: number;
}

interface InboxScannerProps {
  onSelectEmail?: (email: ScannedEmail) => void;
}

// ── Verdict styling ────────────────────────────────────────────────────

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  HIGH_RISK: { bg: "bg-red-500/15", text: "text-red-400", label: "High Risk", icon: "🔴" },
  MEDIUM_RISK: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Suspicious", icon: "🟡" },
  SAFE: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Safe", icon: "🟢" },
  ERROR: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Error", icon: "⚠️" },
};

const DAY_OPTIONS = [1, 2, 5, 10, 30];

interface InboxSummaryData {
  days: number;
  totalEmails: number;
  emails: Array<{ uid: number; subject: string; from: string; date: string; verdict: string; score: number; summary: string }>;
  stats: { safe: number; suspicious: number; highRisk: number; avgScore: number };
  topSenders: Array<{ address: string; count: number; maxScore: number }>;
  timeline: Array<{ date: string; total: number; risky: number }>;
}

// ── Component ──────────────────────────────────────────────────────────

export default function InboxScanner({ onSelectEmail }: InboxScannerProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [provider, setProvider] = useState<"gmail" | "outlook" | "yahoo">("gmail");
  const [emailCount, setEmailCount] = useState(5);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [results, setResults] = useState<ScannedEmail[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [expandedUid, setExpandedUid] = useState<number | null>(null);

  // Summary state
  const [summaryDays, setSummaryDays] = useState(2);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [inboxSummary, setInboxSummary] = useState<InboxSummaryData | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // ── Test Connection ──────────────────────────────────────────────────
  const handleTestConnection = useCallback(async () => {
    if (!email || !password) return;
    setIsConnecting(true);
    setConnectionStatus("idle");

    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", email, password, provider }),
      });
      const data = await res.json();

      if (data.success) {
        setConnectionStatus("success");
        setConnectionMessage(`Connected! ${data.mailboxCount} emails in inbox.`);
      } else {
        setConnectionStatus("error");
        setConnectionMessage(data.error || "Connection failed");
      }
    } catch {
      setConnectionStatus("error");
      setConnectionMessage("Network error. Try again.");
    } finally {
      setIsConnecting(false);
    }
  }, [email, password, provider]);

  // ── Fetch Inbox Summary ──────────────────────────────────────────────
  const fetchInboxSummary = useCallback(async () => {
    if (!email || !password) return;
    setSummaryLoading(true);
    setSummaryError(null);
    setInboxSummary(null);
    try {
      const res = await fetch("/api/inbox-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, provider, days: summaryDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Summary failed");
      setInboxSummary(data);
    } catch (err) {
      setSummaryError((err as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  }, [email, password, provider, summaryDays]);

  // ── Scan Inbox ───────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!email || !password) return;
    setIsScanning(true);
    setResults([]);
    setSummary(null);
    setScanProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => Math.min(prev + 2, 90));
    }, 500);

    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", email, password, provider, count: emailCount }),
      });
      const data = await res.json();

      if (data.success) {
        setResults(data.results);
        setSummary(data.summary);
        setScanProgress(100);
      } else {
        setConnectionStatus("error");
        setConnectionMessage(data.error || "Scan failed");
      }
    } catch {
      setConnectionStatus("error");
      setConnectionMessage("Scan failed. Check your connection.");
    } finally {
      clearInterval(progressInterval);
      setIsScanning(false);
    }
  }, [email, password, provider, emailCount]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ── Connection Form ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161616] p-6 sm:p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#f5f5f5]">Connect Your Inbox</h3>
            <p className="text-sm text-[#a3a3a3]">Auto-scan emails without copy-pasting</p>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="flex gap-2 mb-5">
          {(["gmail", "outlook", "yahoo"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
                ${provider === p
                  ? "bg-[rgba(255,255,255,0.08)] text-white border border-[rgba(255,255,255,0.15)]"
                  : "bg-white/[0.02] text-[#a3a3a3] border border-[rgba(255,255,255,0.08)] hover:bg-white/[0.03]"
                }`}
            >
              {p === "gmail" ? "📧 Gmail" : p === "outlook" ? "📬 Outlook" : "📩 Yahoo"}
            </button>
          ))}
        </div>

        {/* Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-[#666] mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@gmail.com"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)]
                         text-white placeholder-[#404040] text-sm focus:outline-none focus:border-[rgba(255,255,255,0.15)]
                         transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-1.5 uppercase tracking-wider">App Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)]
                         text-white placeholder-[#404040] text-sm focus:outline-none focus:border-[rgba(255,255,255,0.15)]
                         transition-colors"
            />
          </div>
        </div>

        {/* App Password Help */}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 px-4 py-3 mb-5">
          <p className="text-xs text-amber-400/70">
            <strong>⚠️ Use an App Password</strong>, not your real password.{" "}
            {provider === "gmail" && (
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-amber-400">
                Generate Gmail App Password →
              </a>
            )}
            {provider === "outlook" && "Go to Microsoft Account → Security → App Passwords"}
            {provider === "yahoo" && "Go to Yahoo Account → Security → App Passwords"}
          </p>
        </div>

        {/* Email Count + Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#666]">Scan last</label>
            <select
              value={emailCount}
              onChange={(e) => setEmailCount(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-white text-sm
                         focus:outline-none focus:border-[rgba(255,255,255,0.15)]"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
            <label className="text-xs text-[#666]">emails</label>
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleTestConnection}
              disabled={!email || !password || isConnecting}
              className="px-5 py-2.5 rounded-xl text-sm font-medium
                         bg-white/[0.03] border border-white/[0.08] text-[#a3a3a3]
                         hover:bg-white/[0.04] transition-all disabled:opacity-30"
            >
              {isConnecting ? "Testing..." : "Test Connection"}
            </button>

            <button
              onClick={handleScan}
              disabled={!email || !password || isScanning}
              className="px-6 py-2.5 rounded-xl text-sm font-medium
                         bg-accent text-white hover:bg-[rgba(255,255,255,0.04)]0
                         transition-all disabled:opacity-30 flex items-center gap-2"
            >
              {isScanning ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scanning...
                </>
              ) : (
                <>🔍 Scan Inbox</>
              )}
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <AnimatePresence>
          {connectionStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 px-4 py-3 rounded-lg text-sm ${
                connectionStatus === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {connectionStatus === "success" ? "✅" : "❌"} {connectionMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan Progress */}
        {isScanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#a3a3a3]">Scanning emails with AI...</span>
              <span className="text-xs text-white font-mono">{scanProgress}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${scanProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── Results Summary ──────────────────────────────────────── */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161616] p-6"
        >
          <h4 className="text-sm font-medium text-[#a3a3a3] uppercase tracking-wider mb-4">Scan Results</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-red-500/10 border border-red-500/15 p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{summary.highRisk}</p>
              <p className="text-xs text-red-400/60 mt-1">High Risk</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/15 p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{summary.mediumRisk}</p>
              <p className="text-xs text-amber-400/60 mt-1">Suspicious</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/15 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{summary.safe}</p>
              <p className="text-xs text-emerald-400/50 mt-1">Safe</p>
            </div>
            <div className="rounded-xl bg-gray-500/10 border border-gray-500/15 p-4 text-center">
              <p className="text-2xl font-bold text-gray-400">{summary.errors}</p>
              <p className="text-xs text-gray-400/60 mt-1">Errors</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Email List ───────────────────────────────────────────── */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161616] overflow-hidden"
        >
          <div className="divide-y divide-white/[0.04]">
            {results.map((result, i) => {
              const style = VERDICT_STYLES[result.verdict || "SAFE"] || VERDICT_STYLES.SAFE;
              const isExpanded = expandedUid === result.uid;

              return (
                <motion.div
                  key={result.uid}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <button
                    onClick={() => setExpandedUid(isExpanded ? null : result.uid)}
                    className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-[#1c1c1c] transition-colors"
                  >
                    {/* Verdict icon */}
                    <span className="text-lg mt-0.5 flex-shrink-0">{style.icon}</span>

                    {/* Email info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#d4d4d4] font-medium truncate">{result.subject}</p>
                      <p className="text-xs text-[#666] mt-0.5 truncate">
                        {result.from} · {new Date(result.date).toLocaleDateString()}
                        {result.hasAttachments && (
                          <span className="text-purple-400/70"> · 📎 {result.attachmentCount || 0} file{(result.attachmentCount || 0) !== 1 ? "s" : ""}</span>
                        )}
                      </p>
                      <p className="text-xs text-[#666] mt-1 line-clamp-1">{result.snippet}</p>
                    </div>

                    {/* Verdict badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {result.score !== undefined && (
                        <span className="text-xs text-[#666] font-mono">{result.score}</span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pl-14 space-y-3">
                          {result.summary && (
                            <p className="text-sm text-[#a3a3a3]">{result.summary}</p>
                          )}

                          {result.topSignals && result.topSignals.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-[#666] uppercase tracking-wider">Top Signals</p>
                              {result.topSignals.map((sig, j) => (
                                <div key={j} className="flex items-start gap-2 text-xs">
                                  <span className={sig.status === "FAIL" ? "text-red-400" : sig.status === "WARN" ? "text-amber-400" : "text-emerald-400"}>
                                    {sig.status === "FAIL" ? "✗" : sig.status === "WARN" ? "⚠" : "✓"}
                                  </span>
                                  <span className="text-[#a3a3a3]">{sig.detail}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {result.error && (
                            <p className="text-xs text-red-400/60">Error: {result.error}</p>
                          )}

                          {/* Attachment Results */}
                          {result.attachmentResults && result.attachmentResults.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] text-[#666] uppercase tracking-wider">📎 Attachment Scan Results</p>
                              {result.attachmentResults.map((att, k) => {
                                const attStyle = VERDICT_STYLES[att.verdict] || VERDICT_STYLES.SAFE;
                                return (
                                  <div key={k} className={`rounded-lg p-3 border ${attStyle.bg} border-[rgba(255,255,255,0.08)]`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-[#a3a3a3] font-medium">
                                        {att.type === "application/pdf" ? "📄" : att.type.startsWith("image/") ? "🖼️" : "🌐"}{" "}
                                        {att.filename}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${attStyle.bg} ${attStyle.text}`}>
                                        {attStyle.label} ({att.score})
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#a3a3a3]">{att.summary}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {onSelectEmail && (
                            <button
                              onClick={() => onSelectEmail(result)}
                              className="text-xs text-white hover:text-indigo-300 transition-colors"
                            >
                              View Full Report →
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Inbox Summary ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5 sm:p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#f5f5f5]">Inbox Summary</h3>
            <p className="text-sm text-[#a3a3a3]">AI-powered threat overview of your recent emails</p>
          </div>
        </div>

        {/* Day Range Selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[10px] text-[#666] uppercase tracking-wider mr-1">Last</span>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setSummaryDays(d)}
              disabled={summaryLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${summaryDays === d
                  ? "bg-[rgba(255,255,255,0.08)] text-white border border-[rgba(255,255,255,0.15)]"
                  : "bg-white/[0.02] text-[#a3a3a3] border border-[rgba(255,255,255,0.08)] hover:bg-white/[0.03]"
                } disabled:opacity-50`}
            >
              {d} {d === 1 ? "day" : "days"}
            </button>
          ))}
          <button
            onClick={fetchInboxSummary}
            disabled={summaryLoading || !email || !password}
            className="ml-auto px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-accent to-safe
                       text-white hover:from-accent/90 hover:to-safe/90 shadow-lg shadow-accent/15
                       disabled:opacity-30 transition-all flex items-center gap-2"
          >
            {summaryLoading ? (
              <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
            ) : (
              <>📊 Get Summary</>
            )}
          </button>
        </div>

        {summaryLoading && (
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-[#666]">Scanning last {summaryDays} day{summaryDays > 1 ? "s" : ""}...</span>
          </div>
        )}

        {summaryError && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-3">
            ❌ {summaryError}
          </div>
        )}

        {/* Summary Results */}
        {inboxSummary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] p-4 text-center">
                <p className="text-2xl font-bold text-[#f5f5f5]">{inboxSummary.totalEmails}</p>
                <p className="text-[10px] text-[#666] uppercase tracking-wider mt-1">Emails Analyzed</p>
              </div>
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{inboxSummary.stats.safe}</p>
                <p className="text-[10px] text-emerald-400/50 uppercase tracking-wider mt-1">Safe</p>
              </div>
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{inboxSummary.stats.suspicious}</p>
                <p className="text-[10px] text-amber-400/50 uppercase tracking-wider mt-1">Suspicious</p>
              </div>
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{inboxSummary.stats.highRisk}</p>
                <p className="text-[10px] text-red-400/50 uppercase tracking-wider mt-1">High Risk</p>
              </div>
            </div>

            {/* Avg Score Bar */}
            <div className="rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#a3a3a3]">Average Risk Score</span>
                <span className={`text-sm font-bold ${
                  inboxSummary.stats.avgScore > 60 ? "text-red-400" :
                  inboxSummary.stats.avgScore > 30 ? "text-amber-400" : "text-emerald-400"
                }`}>{inboxSummary.stats.avgScore}/100</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.03] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${inboxSummary.stats.avgScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    inboxSummary.stats.avgScore > 60 ? "bg-red-500" :
                    inboxSummary.stats.avgScore > 30 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              </div>
            </div>

            {/* Daily Timeline */}
            {inboxSummary.timeline.length > 1 && (
              <div className="rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] p-4">
                <h4 className="text-xs text-[#666] uppercase tracking-wider mb-3">Daily Breakdown</h4>
                <div className="flex items-end gap-1 h-20">
                  {inboxSummary.timeline.map((day, i) => {
                    const maxTotal = Math.max(...inboxSummary.timeline.map((d) => d.total));
                    const height = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;
                    const riskyRatio = day.total > 0 ? day.risky / day.total : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end" style={{ height: "60px" }}>
                          <div
                            className={`w-full rounded-t-sm transition-all ${
                              riskyRatio > 0.5 ? "bg-red-500/40" : riskyRatio > 0 ? "bg-amber-500/30" : "bg-emerald-500/30"
                            }`}
                            style={{ height: `${height}%`, minHeight: day.total > 0 ? "4px" : "0" }}
                          />
                        </div>
                        <span className="text-[8px] text-[#666] truncate w-full text-center">
                          {day.date.split("/").slice(0, 2).join("/")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Senders */}
            {inboxSummary.topSenders.length > 0 && (
              <div className="rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] p-4">
                <h4 className="text-xs text-[#666] uppercase tracking-wider mb-3">Top Senders</h4>
                <div className="space-y-2">
                  {inboxSummary.topSenders.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          s.maxScore > 60 ? "bg-red-500/20 text-red-400" :
                          s.maxScore > 30 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                        }`}>{i + 1}</span>
                        <span className="text-xs text-[#a3a3a3] truncate">{s.address}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[10px] text-[#666]">{s.count} email{s.count > 1 ? "s" : ""}</span>
                        <span className={`text-[10px] font-medium ${
                          s.maxScore > 60 ? "text-red-400" : s.maxScore > 30 ? "text-amber-400" : "text-emerald-400"
                        }`}>Score: {s.maxScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email List (sorted by risk) */}
            <div className="rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] p-4">
              <h4 className="text-xs text-[#666] uppercase tracking-wider mb-3">
                All Emails — Sorted by Risk
              </h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {inboxSummary.emails.map((em, i) => {
                  const style = VERDICT_STYLES[em.verdict] || VERDICT_STYLES.SAFE;
                  return (
                    <motion.div
                      key={em.uid}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`rounded-lg border p-3 ${style.bg} border-[rgba(255,255,255,0.08)]`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#b3b3b3] font-medium truncate">{em.subject}</p>
                          <p className="text-[10px] text-white/25 mt-0.5">
                            {em.from.match(/<(.+?)>/)?.[1] || em.from} · {new Date(em.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${style.bg} ${style.text}`}>
                            {em.score}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
