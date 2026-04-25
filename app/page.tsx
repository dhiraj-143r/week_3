"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import EmailInput from "@/components/EmailInput";
import ForensicReport from "@/components/ForensicReport";
import ThreatTimeline, { saveToTimeline } from "@/components/ThreatTimeline";
import InboxScanner from "@/components/InboxScanner";
import EmailWatchdog from "@/components/EmailWatchdog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SAMPLE_PHISHING_EMAIL, MOCK_REPORT } from "@/lib/demo-data";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [samplePrefill, setSamplePrefill] = useState("");
  const [activeTab, setActiveTab] = useState<"paste" | "inbox" | "watchdog">("paste");
  const reportRef = useRef<HTMLDivElement>(null);

  // ── Submit handler ────────────────────────────────────
  const handleSubmit = useCallback(async (emailContent: string, userEmail?: string, userPhone?: string, files?: File[]) => {
    setIsLoading(true);
    setReportData(null);

    // Demo mode — instant mock report
    if (demoMode) {
      await new Promise((r) => setTimeout(r, 2000));
      const mockData = { ...MOCK_REPORT, timestamp: new Date().toISOString() };
      setReportData(mockData);
      saveToTimeline(mockData);
      toast.success("Demo analysis complete!");
      setIsLoading(false);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
      return;
    }

    try {
      // 1. Analyze email content
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailContent, userEmail, userPhone }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      // 2. Scan attachments in parallel if any files attached
      let attachmentResults: Array<{ fileName: string; verdict: string; score: number; summary: string }> = [];
      if (files && files.length > 0) {
        toast("Scanning attachments...", { icon: "📎" });
        const attPromises = files.map(async (file) => {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const attRes = await fetch("/api/scan-attachment", { method: "POST", body: formData });
            const attData = await attRes.json();
            return attData.success ? attData.result : { fileName: file.name, verdict: "ERROR", score: 0, summary: attData.error };
          } catch {
            return { fileName: file.name, verdict: "ERROR", score: 0, summary: "Scan failed" };
          }
        });
        attachmentResults = await Promise.all(attPromises);
      }

      // Merge attachment results into report
      const finalData = { ...data, attachmentResults };
      setReportData(finalData);
      saveToTimeline(finalData);

      const attSummary = attachmentResults.length > 0
        ? ` + ${attachmentResults.length} attachment${attachmentResults.length > 1 ? "s" : ""} scanned`
        : "";
      toast.success(`Forensic analysis complete!${attSummary}`);

      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to analyze email");
      console.error("[PhishFilter] Analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [demoMode]);

  // ── Load report from timeline ─────────────────────────
  // eslint-disable-next-line
  const handleSelectReport = useCallback((report: any) => {
    setReportData(report);
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }, []);

  // ── Sample email prefill ──────────────────────────────
  const handleLoadSample = useCallback(() => {
    setSamplePrefill(SAMPLE_PHISHING_EMAIL);
    toast.success("Sample phishing email loaded!");
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* ── Background effects ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[400px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-[300px] right-0 w-[600px] h-[600px] rounded-full bg-purple-500/[0.03] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">PhishFilter</h1>
              <p className="text-[10px] text-white/30 -mt-0.5 hidden sm:block">AI-Powered Phishing Detection</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Demo mode toggle */}
            <button
              onClick={() => { setDemoMode(!demoMode); toast(demoMode ? "Live mode" : "Demo mode — mock data", { icon: demoMode ? "🔴" : "🟢" }); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                demoMode
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-white/[0.02] border-white/[0.06] text-white/25 hover:text-white/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${demoMode ? "bg-amber-400" : "bg-white/20"}`} />
              {demoMode ? "Demo" : "Live"}
            </button>

            <div className="h-5 w-px bg-white/[0.06]" />
            <span className="text-xs text-white/20 font-mono">v1.0</span>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────── */}
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center pt-12 sm:pt-16 pb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Powered by Grok AI + VirusTotal + Firecrawl
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
              Detect phishing emails
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                before they detect you
              </span>
            </h2>
            <p className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed">
              Paste any suspicious email for instant AI forensic analysis — header inspection,
              URL scanning, homograph detection, and brand impersonation checks.
            </p>
          </motion.div>

          {/* ── Tab Switcher ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex rounded-xl bg-white/[0.02] border border-white/[0.06] p-1">
              <button
                onClick={() => setActiveTab("paste")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "paste"
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Paste Email
              </button>
              <button
                onClick={() => setActiveTab("inbox")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "inbox"
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Inbox Scanner
              </button>
              <button
                onClick={() => setActiveTab("watchdog")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "watchdog"
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Watchdog
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-500/15 text-orange-400 font-bold">LIVE</span>
              </button>
            </div>
          </motion.div>

          {/* ── Tab Content ─────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {activeTab === "paste" ? (
              <motion.div key="paste" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* ── Email Input ──────────────────────────────── */}
                <ErrorBoundary fallbackLabel="Email Input">
                  <EmailInput
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    prefillContent={samplePrefill}
                    onPrefillConsumed={() => setSamplePrefill("")}
                  />
                </ErrorBoundary>

                {/* ── Action Buttons Row ────────────────────────── */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap justify-center gap-2 mt-6"
                >
                  <button
                    onClick={handleLoadSample}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium
                               bg-white/[0.02] border border-white/[0.06] text-white/30
                               hover:bg-indigo-500/10 hover:border-indigo-500/20 hover:text-indigo-300 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Load Sample Phishing Email
                  </button>
                </motion.div>
              </motion.div>
            ) : activeTab === "inbox" ? (
              <motion.div key="inbox" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <ErrorBoundary fallbackLabel="Inbox Scanner">
                  <InboxScanner />
                </ErrorBoundary>
              </motion.div>
            ) : (
              <motion.div key="watchdog" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <ErrorBoundary fallbackLabel="Email Watchdog">
                  <EmailWatchdog />
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-2 mt-8 mb-10"
          >
            {[
              "Header Analysis", "URL Scanning", "Homograph Detection", "Brand Impersonation",
              "VirusTotal", "Screenshot Preview", "SPF/DKIM/DMARC", "AI Forensics", "IMAP Inbox",
              "PDF Scanner", "Image Vision", "QR Detection",
            ].map((feature) => (
              <span key={feature} className="px-3 py-1 rounded-full text-[11px] text-white/25 border border-white/[0.04] bg-white/[0.01]">
                {feature}
              </span>
            ))}
          </motion.div>

          {/* ── Threat Timeline ──────────────────────────── */}
          <ErrorBoundary fallbackLabel="Threat Timeline">
            <div className="mb-8">
              <ThreatTimeline onSelectReport={handleSelectReport} />
            </div>
          </ErrorBoundary>

          {/* ── Report Section ───────────────────────────── */}
          <div ref={reportRef}>
            <AnimatePresence>
              {isLoading && !reportData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-4xl mx-auto space-y-4 mb-12"
                >
                  {/* Skeleton loader */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-32 h-32 rounded-full bg-white/[0.03] animate-pulse" />
                      <div className="flex-1 space-y-3 w-full">
                        <div className="h-7 bg-white/[0.03] rounded-lg w-2/3 animate-pulse" />
                        <div className="h-4 bg-white/[0.03] rounded w-1/2 animate-pulse" />
                        <div className="h-4 bg-white/[0.03] rounded w-full animate-pulse" />
                        <div className="h-4 bg-white/[0.03] rounded w-4/5 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-16 h-5 bg-white/[0.03] rounded-full animate-pulse" />
                        <div className="w-10 h-4 bg-white/[0.03] rounded animate-pulse" />
                      </div>
                      <div className="h-4 bg-white/[0.03] rounded w-3/4 animate-pulse mb-2" />
                      <div className="h-3 bg-white/[0.03] rounded w-1/2 animate-pulse" />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {reportData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="text-xs text-white/20 font-medium uppercase tracking-wider">Forensic Report</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>

                  <ErrorBoundary fallbackLabel="Forensic Report">
                    {/* eslint-disable-next-line */}
                    <ForensicReport data={reportData as any} />
                  </ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.04] mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-white/15">© {new Date().getFullYear()} PhishFilter — Built for Hackathon</p>
          <p className="text-xs text-white/15">Grok AI · VirusTotal · Firecrawl · Locus</p>
        </div>
      </footer>
    </main>
  );
}
