"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────

interface WatchResult {
  uid: number;
  subject: string;
  from: string;
  date: string;
  verdict: string;
  score: number;
  summary: string;
  whatsappSent: boolean;
  emailSent: boolean;
}


const VERDICT_STYLES: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  HIGH_RISK: { bg: "bg-red-500/15", text: "text-red-400", icon: "🔴", label: "High Risk" },
  MEDIUM_RISK: { bg: "bg-amber-500/15", text: "text-amber-400", icon: "🟡", label: "Suspicious" },
  SAFE: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: "🟢", label: "Safe" },
  ERROR: { bg: "bg-gray-500/15", text: "text-gray-400", icon: "⚠️", label: "Error" },
};

// ── Component ──────────────────────────────────────────────────────────

export default function EmailWatchdog() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [provider, setProvider] = useState<"gmail" | "outlook" | "yahoo">("gmail");
  const [phone, setPhone] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [isWatching, setIsWatching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [alerts, setAlerts] = useState<WatchResult[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ── Start watching (SSE / IMAP IDLE) ─────────────────────────────────
  const startWatching = useCallback(() => {
    if (!email || !password || !phone) return;
    setIsConnecting(true);
    setError(null);
    setAlerts([]);
    setNewCount(0);
    setStatusMsg("Connecting...");

    const params = new URLSearchParams({
      email,
      password,
      provider,
      phone,
      reportEmail,
    });

    const es = new EventSource(`/api/watch-live?${params.toString()}`);
    eventSourceRef.current = es;

    es.addEventListener("status", (e) => {
      const data = JSON.parse(e.data);
      setStatusMsg(data.message);
      setError(null);
      // Transition from connecting loader → live view after brief delay
      if (!isWatching) {
        setTimeout(() => {
          setIsConnecting(false);
          setIsWatching(true);
        }, 2500);
      }
    });

    es.addEventListener("alert", (e) => {
      const data: WatchResult = JSON.parse(e.data);
      setAlerts((prev) => [data, ...prev].slice(0, 50));
      setNewCount((c) => c + 1);
    });

    es.addEventListener("error", (e) => {
      // SSE error — could be connection drop
      if (es.readyState === EventSource.CLOSED) {
        setIsWatching(false);
        setIsConnecting(false);
        setStatusMsg(null);
      } else {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setError(data.message);
        } catch {
          setError("Connection interrupted");
        }
      }
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setIsWatching(false);
        setIsConnecting(false);
        setStatusMsg(null);
      }
    };
  }, [email, password, provider, phone, reportEmail]);

  // ── Stop watching ────────────────────────────────────────────────────
  const stopWatching = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsWatching(false);
    setIsConnecting(false);
    setStatusMsg(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <AnimatePresence mode="wait">
        {/* ── Connecting Loader ── */}
        {isConnecting && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center text-center py-20 lg:py-32"
          >
            {/* Radar Animation */}
            <div className="relative w-[140px] h-[140px] flex items-center justify-center mb-8">
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="rgba(220,220,230,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-[rgba(220,220,230,0.2)]"
                  animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
                />
              ))}
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
              className="text-2xl text-white mb-3"
            >
              Establishing connection...
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-white/40 max-w-md"
            >
              Connecting to your inbox via IMAP IDLE for real-time monitoring. Alerts will fire instantly.
            </motion.p>

            {/* Animated Tags */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex gap-2 mt-6 flex-wrap justify-center"
            >
              <span className="feature-tag tag-green">Live</span>
              <span className="feature-tag">IMAP IDLE</span>
              <span className="feature-tag">WhatsApp</span>
              <span className="feature-tag">Email Reports</span>
            </motion.div>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mt-8">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/20"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Normal UI (form + live feed) ── */}
        {!isConnecting && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`${isWatching ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch" : "flex justify-center"}`}
          >
      {/* ── Config Card ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border border-white/[0.06] bg-[#111111] p-5 sm:p-6 min-h-[500px] flex flex-col justify-between ${!isWatching ? "w-full max-w-xl" : ""}`}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isWatching ? "bg-emerald-500/15" : "bg-orange-500/15"
          }`}>
            <motion.span
              animate={isWatching ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-lg"
            >
              {isWatching ? "👁️" : "🔔"}
            </motion.span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Real-Time Watchdog
              {isWatching && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </h3>
            <p className="text-sm text-white/40">
              {isWatching
                ? "Instant detection — no polling, no delays"
                : "Connect once → instant WhatsApp + Email alerts on every new email"}
            </p>
          </div>
        </div>

        {/* Provider */}
        <div className="flex gap-2 mb-4">
          {(["gmail", "outlook", "yahoo"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              disabled={isWatching}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                ${provider === p
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.05]"
                } disabled:opacity-50`}
            >
              {p === "gmail" ? "📧 Gmail" : p === "outlook" ? "📬 Outlook" : "📩 Yahoo"}
            </button>
          ))}
        </div>

        {/* Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isWatching}
            placeholder="your@gmail.com"
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                       text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40
                       disabled:opacity-50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isWatching}
            placeholder="App Password"
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                       text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40
                       disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[10px] text-white/30 mb-1 uppercase tracking-wider">WhatsApp Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isWatching}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                         text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40
                         disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-white/30 mb-1 uppercase tracking-wider">Send Report To Email</label>
            <input
              type="email"
              value={reportEmail}
              onChange={(e) => setReportEmail(e.target.value)}
              disabled={isWatching}
              placeholder="report@example.com"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                         text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40
                         disabled:opacity-50"
            />
          </div>
        </div>

        {/* Start/Stop + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusMsg && (
              <div className="flex items-center gap-1.5">
                {isWatching && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <span className="text-xs text-white/30">{statusMsg}</span>
              </div>
            )}
            {newCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/15 text-indigo-400 font-bold">
                {newCount} detected
              </span>
            )}
          </div>
          <button
            onClick={isWatching ? stopWatching : startWatching}
            disabled={!isWatching && (!email || !password || !phone)}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2
              ${isWatching
                ? "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20"
              } disabled:opacity-30`}
          >
            {isWatching ? (
              <>⏹ Stop Watching</>
            ) : (
              <>⚡ Start Watching</>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            ❌ {error}
          </motion.div>
        )}
      </motion.div>

      {/* ── Live Alert Feed ──────────────────────────────────── */}
      {isWatching && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs text-white/30 uppercase tracking-wider font-medium">
              Live Alert Feed
            </h4>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400/60">IMAP IDLE — Instant</span>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center"
              >
                <span className="text-xl">⚡</span>
              </motion.div>
              <p className="text-xs text-white/20">Connected — waiting for new emails...</p>
              <p className="text-[10px] text-white/10 mt-1">Alerts will appear instantly when an email arrives</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {alerts.map((alert, i) => {
                  const style = VERDICT_STYLES[alert.verdict] || VERDICT_STYLES.SAFE;
                  return (
                    <motion.div
                      key={alert.uid}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-xl border p-4 ${style.bg} border-white/[0.06]`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 font-medium truncate">{alert.subject}</p>
                          <p className="text-xs text-white/30 mt-0.5">
                            {alert.from} · {new Date(alert.date).toLocaleString()}
                          </p>
                          <p className="text-xs text-white/40 mt-1 line-clamp-2">{alert.summary}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                          {alert.whatsappSent && (
                            <span className="text-[9px] text-emerald-400/50">✓ WhatsApp sent</span>
                          )}
                          {alert.emailSent && (
                            <span className="text-[9px] text-indigo-400/50">✓ Email sent</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
      </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
