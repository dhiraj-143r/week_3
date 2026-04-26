"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ────────────────────────────────────────────────────────────── */

interface RedirectHop {
  url: string;
  status: number;
}

interface SandboxResult {
  inputUrl: string;
  redirectChain: RedirectHop[];
  finalUrl: string;
  virusTotal: { flagged: number; total: number };
  verdict: "SAFE" | "SUSPICIOUS" | "PHISHING";
  serverLocation: string;
  screenshotUrl: string | null;
  pageTitle: string;
  pageSummary: string;
}

const VERDICT_CONFIG = {
  SAFE: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: "✅", label: "SAFE" },
  SUSPICIOUS: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "⚠️", label: "SUSPICIOUS" },
  PHISHING: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "🚨", label: "PHISHING SITE" },
};

/* ── Component ────────────────────────────────────────────────────────── */

export default function LinkSandbox() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"input" | "scanning" | "results">("input");
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);

  const scanSteps = [
    "Resolving URL...",
    "Following redirect chain...",
    "Capturing screenshot...",
    "Checking VirusTotal database...",
    "Analyzing server location...",
  ];

  const handleScan = useCallback(async () => {
    if (!url.trim()) return;
    setPhase("scanning");
    setError(null);
    setScanStep(0);

    // Animate through steps
    const stepInterval = setInterval(() => {
      setScanStep((prev) => {
        if (prev < scanSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 800);

    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data: SandboxResult = await res.json();
      setScanStep(scanSteps.length - 1);

      // Brief pause to show final step
      setTimeout(() => {
        setResult(data);
        setPhase("results");
      }, 600);
    } catch (err: unknown) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : "Failed to analyze URL");
      setPhase("input");
    }
  }, [url, scanSteps.length]);

  const handleReset = () => {
    setPhase("input");
    setResult(null);
    setUrl("");
    setError(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <AnimatePresence mode="wait">
        {/* ═══ INPUT PHASE ═══ */}
        {phase === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* URL Input Card */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                  <span className="text-lg">🔗</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Safe Link Sandbox</h3>
                  <p className="text-sm text-white/40">Paste a suspicious URL — your server checks it so you don&apos;t have to</p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  placeholder="https://bit.ly/suspicious-link"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                             text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40
                             font-mono tracking-wide"
                />
                <button
                  onClick={handleScan}
                  disabled={!url.trim()}
                  className="px-6 py-3 rounded-xl text-sm font-medium transition-all
                             bg-gradient-to-r from-indigo-600 to-violet-600 text-white
                             hover:from-indigo-500 hover:to-violet-500
                             shadow-lg shadow-indigo-500/20
                             disabled:opacity-30 disabled:cursor-not-allowed
                             flex items-center gap-2"
                >
                  🛡️ Scan Link
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400"
                >
                  ❌ {error}
                </motion.div>
              )}
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* How It Works */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-5">
                  <span>🔗</span> How Safe Link Sandbox Works
                </h4>
                <div className="space-y-0 font-mono text-xs">
                  <div className="px-4 py-3 rounded-t-xl bg-white/[0.02] border border-white/[0.04] text-white/50">
                    User pastes: <span className="text-indigo-400">bit.ly/free-iphone-2024</span>
                  </div>
                  <div className="text-center text-white/20 py-1">↓</div>
                  <div className="px-4 py-2 bg-white/[0.02] border-x border-white/[0.04] text-white/40 text-center">
                    YOUR SERVER follows the link (not the user)
                  </div>
                  <div className="text-center text-white/20 py-1">↓</div>
                  <div className="px-4 py-4 bg-white/[0.02] border border-white/[0.04] rounded-b-xl space-y-3">
                    <div className="text-white/50">
                      <span className="text-white/30">🔗</span> Redirect Chain:
                    </div>
                    <div className="pl-4 space-y-1 text-white/35">
                      <div>1. bit.ly/free-iphone-2024</div>
                      <div className="text-white/15 pl-4">↓</div>
                      <div>2. tracking.scammer.ru/redirect?id=483</div>
                      <div className="text-white/15 pl-4">↓</div>
                      <div>3. fake-apple.com/login</div>
                    </div>
                    <div className="pt-2 border-t border-white/[0.04]">
                      <span className="text-red-400/60">🎯</span>{" "}
                      <span className="text-white/40">Final Destination: </span>
                      <span className="text-red-400/80">fake-apple.com/login</span>
                    </div>
                    <div className="pt-2 space-y-1">
                      <div className="text-white/40">
                        🔍 VirusTotal: <span className="text-red-400">🔴 12/90 engines flagged</span>
                      </div>
                      <div className="text-white/40">
                        ⚠️ Verdict: <span className="text-red-400 font-bold">PHISHING SITE</span>
                      </div>
                      <div className="text-white/40">
                        🌍 Server Location: <span className="text-white/50">Russia</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why It's Safe */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-5">
                  <span>🛡️</span> Why It&apos;s Safe
                </h4>
                <div className="font-mono text-xs px-4 py-5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-5">
                  <div>
                    <div className="text-white/50 mb-2">Normal clicking:</div>
                    <div className="text-white/35 pl-4">
                      YOU → visit scam site → malware/phishing → YOU get hacked{" "}
                      <span className="text-red-400">✕</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-white/50 mb-2">Safe Link Sandbox:</div>
                    <div className="text-white/35 pl-4">
                      YOU → paste link → YOUR SERVER visits it → shows YOU the result{" "}
                      <span className="text-emerald-400">✓</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/[0.04] text-white/30 leading-relaxed">
                    You NEVER touch the dangerous site. Your server does it for you.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ SCANNING PHASE ═══ */}
        {phase === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center text-center py-24 lg:py-32"
          >
            {/* Shield Animation */}
            <div className="relative w-[120px] h-[120px] flex items-center justify-center mb-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{ borderTopColor: "rgba(99,102,241,0.5)", borderRightColor: "rgba(139,92,246,0.3)" }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border-2 border-transparent"
                style={{ borderBottomColor: "rgba(99,102,241,0.3)", borderLeftColor: "rgba(139,92,246,0.2)" }}
              />
              <span className="text-4xl">🔗</span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
              className="text-2xl text-white mb-6"
            >
              Analyzing link safely...
            </motion.h2>

            {/* Progress Steps */}
            <div className="space-y-3 text-left max-w-sm w-full">
              {scanSteps.map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: i <= scanStep ? 1 : 0.2, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-3"
                >
                  {i < scanStep ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                  ) : i === scanStep ? (
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    </motion.span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white/10" />
                    </span>
                  )}
                  <span className={`text-xs ${i <= scanStep ? "text-white/60" : "text-white/15"}`}>{step}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ RESULTS PHASE ═══ */}
        {phase === "results" && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            {/* Verdict Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border p-6"
              style={{
                borderColor: VERDICT_CONFIG[result.verdict].color + "30",
                background: VERDICT_CONFIG[result.verdict].bg,
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{VERDICT_CONFIG[result.verdict].icon}</span>
                  <div>
                    <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Verdict</div>
                    <div className="text-2xl font-bold" style={{ color: VERDICT_CONFIG[result.verdict].color }}>
                      {VERDICT_CONFIG[result.verdict].label}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] transition-all"
                >
                  ← Scan Another
                </button>
              </div>
            </motion.div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Redirect Chain */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5"
              >
                <h4 className="text-xs text-white/30 uppercase tracking-wider font-medium mb-4">
                  🔗 Redirect Chain ({result.redirectChain.length} hop{result.redirectChain.length !== 1 ? "s" : ""})
                </h4>
                <div className="space-y-1 font-mono text-xs">
                  {result.redirectChain.map((hop, i) => (
                    <React.Fragment key={i}>
                      <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-white/20 flex-shrink-0 mt-0.5">{i + 1}.</span>
                        <span className="text-white/50 break-all">{hop.url}</span>
                        <span
                          className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium"
                          style={{
                            background: hop.status >= 300 && hop.status < 400 ? "rgba(245,158,11,0.15)" : hop.status === 200 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            color: hop.status >= 300 && hop.status < 400 ? "#f59e0b" : hop.status === 200 ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {hop.status || "ERR"}
                        </span>
                      </div>
                      {i < result.redirectChain.length - 1 && (
                        <div className="text-center text-white/10 text-xs">↓</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.04]">
                  <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Final Destination</div>
                  <div className="font-mono text-sm break-all" style={{ color: VERDICT_CONFIG[result.verdict].color }}>
                    🎯 {result.finalUrl}
                  </div>
                </div>
              </motion.div>

              {/* Analysis Details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5 space-y-5"
              >
                {/* VirusTotal */}
                <div>
                  <h4 className="text-xs text-white/30 uppercase tracking-wider font-medium mb-3">
                    🔍 VirusTotal Scan
                  </h4>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold"
                      style={{
                        background: result.virusTotal.flagged > 5 ? "rgba(239,68,68,0.15)" : result.virusTotal.flagged > 0 ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
                        color: result.virusTotal.flagged > 5 ? "#ef4444" : result.virusTotal.flagged > 0 ? "#f59e0b" : "#22c55e",
                      }}
                    >
                      {result.virusTotal.flagged}/{result.virusTotal.total}
                    </div>
                    <div>
                      <div className="text-sm text-white/70">
                        {result.virusTotal.flagged > 0 ? (
                          <>{result.virusTotal.flagged} engines flagged this URL</>
                        ) : (
                          <>No engines flagged this URL</>
                        )}
                      </div>
                      <div className="text-xs text-white/30 mt-0.5">Scanned against {result.virusTotal.total} security engines</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(result.virusTotal.flagged / result.virusTotal.total) * 100}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{
                        background: result.virusTotal.flagged > 5 ? "#ef4444" : result.virusTotal.flagged > 0 ? "#f59e0b" : "#22c55e",
                      }}
                    />
                  </div>
                </div>

                {/* Server Location */}
                <div className="pt-4 border-t border-white/[0.04]">
                  <h4 className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2">
                    🌍 Server Location
                  </h4>
                  <div className="text-sm text-white/60">{result.serverLocation}</div>
                </div>

                {/* Page Info */}
                <div className="pt-4 border-t border-white/[0.04]">
                  <h4 className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2">
                    📄 Page Analysis
                  </h4>
                  <div className="text-sm text-white/60 font-medium">{result.pageTitle}</div>
                  <div className="text-xs text-white/30 mt-1 leading-relaxed">{result.pageSummary}</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
