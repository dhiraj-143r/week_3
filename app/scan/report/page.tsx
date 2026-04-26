"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PDFExport from "@/components/PDFExport";

export default function ReportPage() {
  const [reportData, setReportData] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("phishfilter_report");
      if (stored) setReportData(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load report data", e);
    }
  }, []);

  // ── Particle Field ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let mouse = { x: -999, y: -999 };
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener("mousemove", onMove);
    const COUNT = 250;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.3,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.8;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
        p.vx *= 0.98; p.vy *= 0.98;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,220,230,${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMove); };
  }, []);

  // ── No Data State ──
  if (!reportData) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <style dangerouslySetInnerHTML={{ __html: `body{background:#0a0a0a;margin:0;font-family:system-ui,-apple-system,sans-serif}` }} />
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2 style={{ color: "#fff", fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 24 }}>No report found</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Scan an email first to generate a forensic report.</p>
        <Link href="/scan" style={{ marginTop: 16, padding: "10px 24px", borderRadius: 9, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Go to Scanner</Link>
      </div>
    );
  }

  // ── Extract Data ──
  const analysis = reportData.analysis || {};
  const parsed = reportData.parsed || {};
  const verdict = analysis.verdict || "SAFE";
  const score = analysis.overallScore ?? 0;
  const verdictLabel = verdict === "HIGH_RISK" ? "PHISHING DETECTED" : verdict === "MEDIUM_RISK" ? "SUSPICIOUS EMAIL" : "EMAIL APPEARS SAFE";
  const verdictEmoji = verdict === "HIGH_RISK" ? "🚨" : verdict === "MEDIUM_RISK" ? "⚠️" : "✅";
  const verdictColor = verdict === "HIGH_RISK" ? "#ef4444" : verdict === "MEDIUM_RISK" ? "#f59e0b" : "#22c55e";
  const ringPct = ((100 - score) / 100) * 251.2;
  const timeTaken = reportData.timings?.total ? (reportData.timings.total / 1000).toFixed(1) : "—";
  const sender = analysis.senderAnalysis || {};
  
  const getAuthClass = (val: string) => !val || val === "N/A" || val === "none" ? "auth-na" : val.toLowerCase().includes("pass") ? "auth-pass" : "auth-fail";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", position: "relative", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        body { background: #0a0a0a; margin: 0; font-family: system-ui, -apple-system, sans-serif; }

        .particle-canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; filter: blur(1px); opacity: 0.85; }
        .rpt-vignette { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0; background: radial-gradient(ellipse at center, transparent 30%, #0a0a0a 100%); }

        .rpt-nav { height: 52px; background: rgba(10,10,10,0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 48px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
        .rpt-logo { text-decoration: none; font-size: 18px; display: flex; gap: 4px; }
        .rpt-logo-p { font-family: Georgia, serif; font-style: italic; color: #fff; }
        .rpt-logo-f { font-weight: 700; color: rgba(255,255,255,0.5); }
        .rpt-back { font-size: 12px; color: rgba(255,255,255,0.3); text-decoration: none; transition: 0.2s; }
        .rpt-back:hover { color: rgba(255,255,255,0.7); }
        .rpt-container { max-width: 1300px; margin: 0 auto; padding: 40px 80px 64px; position: relative; z-index: 2; display: grid; grid-template-columns: minmax(380px, 1fr) minmax(480px, 1.2fr); gap: 48px; align-items: start; }

        .verdict-card { background: rgba(17,17,17,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; display: flex; gap: 32px; align-items: flex-start; margin-bottom: 24px; position: relative; overflow: hidden; }
        .verdict-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--vc); }
        .ring-wrap { width: 90px; height: 90px; flex-shrink: 0; position: relative; }
        .ring-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .ring-score { font-size: 28px; font-weight: 700; line-height: 1; }
        .ring-sub { font-size: 8px; letter-spacing: 0.15em; color: rgba(255,255,255,0.35); margin-top: 4px; text-transform: uppercase; }
        .verdict-body h2 { margin: 0 0 6px; font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .vd-sub { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0 0 12px; }
        .vd-summary { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.7; margin: 0; }
        .auth-row { display: flex; gap: 16px; margin-top: 16px; align-items: center; flex-wrap: wrap; }
        .auth-label { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 600; }
        .auth-badge { font-size: 11px; padding: 3px 10px; border-radius: 6px; font-weight: 600; }
        .auth-pass { background: rgba(34,197,94,0.15); color: #22c55e; }
        .auth-fail { background: rgba(239,68,68,0.15); color: #ef4444; }
        .auth-na { background: rgba(234,179,8,0.15); color: #eab308; }
        .time-badge { margin-left: auto; font-size: 12px; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 4px; }

        .sender-card { background: rgba(17,17,17,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px 32px; margin-bottom: 32px; }
        .sender-title { font-size: 16px; font-weight: 600; margin: 0 0 20px; display: flex; align-items: center; gap: 10px; }
        .sender-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .sender-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; }
        .sender-box-label { font-size: 10px; letter-spacing: 0.12em; color: rgba(255,255,255,0.35); margin-bottom: 8px; text-transform: uppercase; font-weight: 600; }
        .sender-box-value { font-size: 15px; color: #fff; font-weight: 500; }
        .sender-box-value.muted { font-style: italic; color: rgba(255,255,255,0.3); font-size: 13px; }
        .sender-explanation { font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.7; margin: 0; }
        .mismatch-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; margin-bottom: 12px; }
        .mismatch-yes { background: rgba(239,68,68,0.12); color: #ef4444; }
        .mismatch-no { background: rgba(34,197,94,0.08); color: rgba(34,197,94,0.6); }

        .btn-row { display: flex; gap: 16px; margin-bottom: 32px; }
        .btn-row > * { width: 100%; }
        .btn-row button, .btn-row a { width: 100% !important; justify-content: center; height: 48px; border-radius: 12px; font-size: 14px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); transition: all 0.25s ease; cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .btn-row button:hover, .btn-row a:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); color: #fff; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(255,255,255,0.05); }
        
        /* ═══ LIVE DOCUMENT PREVIEW ═══ */
        .preview-card { background: rgba(17,17,17,0.9); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; height: calc(100vh - 148px); display: flex; flex-direction: column; position: sticky; top: 84px; }
        .preview-header { padding: 14px 20px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .preview-header-left { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }
        .preview-dots { display: flex; gap: 6px; }
        .preview-dots span { width: 10px; height: 10px; border-radius: 50%; }
        
        .doc-scroll { flex: 1; overflow-y: auto; padding: 32px; background: #0e0e0e; }
        .doc-scroll::-webkit-scrollbar { width: 8px; }
        .doc-scroll::-webkit-scrollbar-track { background: transparent; }
        .doc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .doc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        
        .doc-page { background: #fff; color: #111; padding: 48px; border-radius: 4px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); margin: 0 auto; min-height: 800px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
        .doc-page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 16px; margin-bottom: 32px; }
        .doc-page-logo { font-size: 18px; font-weight: 800; color: #333; margin: 0; }
        .doc-page-sublogo { font-size: 12px; color: #999; font-weight: 500; }
        
        .doc-verdict-box { background: var(--vc); border-radius: 8px; padding: 24px; text-align: center; color: #fff; margin-bottom: 32px; }
        .doc-verdict-box h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .doc-verdict-box p { margin: 0; font-size: 14px; font-weight: 600; opacity: 0.9; }
        
        .doc-meta { font-size: 13px; color: #444; line-height: 1.6; margin-bottom: 32px; border-left: 3px solid #e5e5e5; padding-left: 16px; }
        .doc-meta strong { color: #111; }
        
        .doc-section { margin-bottom: 32px; }
        .doc-section h2 { font-size: 16px; color: #333; margin: 0 0 12px; font-weight: 700; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; }
        .doc-section p { font-size: 13px; color: #333; line-height: 1.6; margin: 0 0 12px; }
        
        .doc-signals { list-style: none; padding: 0; margin: 0; }
        .doc-signal-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
        .doc-signal-status { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-top: 2px; }
        .doc-signal-content h4 { margin: 0 0 4px; font-size: 13px; color: #111; }
        .doc-signal-content p { margin: 0; font-size: 12px; color: #666; }

        @media (max-width: 1024px) {
          .rpt-container { grid-template-columns: 1fr; display: flex; flex-direction: column; }
          .preview-card { position: relative; top: 0; height: 800px; width: 100%; }
        }
        @media (max-width: 768px) {
          .rpt-container { padding: 24px; }
          .rpt-nav { padding: 0 24px; }
          .verdict-card { flex-direction: column; align-items: center; text-align: center; }
          .sender-grid { grid-template-columns: 1fr; }
          .doc-page { padding: 24px; }
        }
        @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }
      `}} />

      {/* ═══ PARTICLE CANVAS ═══ */}
      <canvas ref={canvasRef} className="particle-canvas" />
      <div className="rpt-vignette" />

      {/* ═══ NAVBAR ═══ */}
      <nav className="rpt-nav">
        <Link href="/" className="rpt-logo"><span className="rpt-logo-p">Phish</span><span className="rpt-logo-f">Filter</span></Link>
        <Link href="/scan" className="rpt-back">← Back to Scanner</Link>
      </nav>

      <div className="rpt-container">

        {/* ═══ LEFT COLUMN (CARDS) ═══ */}
        <div className="left-col">
          {/* VERDICT CARD */}
          <motion.div className="verdict-card" style={{ "--vc": verdictColor } as React.CSSProperties} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="ring-wrap">
              <svg viewBox="0 0 90 90" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="45" cy="45" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle cx="45" cy="45" r="40" fill="none" stroke={verdictColor} strokeWidth="5" strokeDasharray="251.2" strokeDashoffset={ringPct} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
              </svg>
              <div className="ring-label">
                <span className="ring-score" style={{ color: verdictColor }}>{score}</span>
                <span className="ring-sub">Risk Score</span>
              </div>
            </div>
            <div className="verdict-body">
              <h2 style={{ color: verdictColor }}>{verdictEmoji} {verdictLabel}</h2>
              <p className="vd-sub">{analysis.signals?.filter((s: any) => s.status !== "PASS").length || 0} issue(s) found</p>
              <p className="vd-summary">{analysis.summary || "No summary available."}</p>
              <div className="auth-row">
                <span className="auth-label">SPF</span>
                <span className={`auth-badge ${getAuthClass(parsed.spf)}`}>● {parsed.spf || "N/A"}</span>
                <span className="auth-label">DKIM</span>
                <span className={`auth-badge ${getAuthClass(parsed.dkim)}`}>● {parsed.dkim || "N/A"}</span>
                <span className="auth-label">DMARC</span>
                <span className={`auth-badge ${getAuthClass(parsed.dmarc)}`}>● {parsed.dmarc || "N/A"}</span>
                <span className="time-badge">⏱ {timeTaken}s</span>
              </div>
            </div>
          </motion.div>

          {/* SENDER ANALYSIS CARD */}
          <motion.div className="sender-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <h3 className="sender-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Sender Analysis
            </h3>
            <div className="sender-grid">
              <div className="sender-box">
                <div className="sender-box-label">From Domain</div>
                <div className="sender-box-value">{sender.fromDomain || parsed.senderDomain || "N/A"}</div>
              </div>
              <div className="sender-box">
                <div className="sender-box-label">Return-Path Domain</div>
                <div className={`sender-box-value ${!sender.returnPathDomain ? 'muted' : ''}`}>
                  {sender.returnPathDomain || "No headers found — paste full raw email source for header analysis"}
                </div>
              </div>
            </div>
            {sender.mismatch !== undefined && (
              <div className={`mismatch-badge ${sender.mismatch ? 'mismatch-yes' : 'mismatch-no'}`}>
                {sender.mismatch ? "⚠ Domain Mismatch Detected" : "✓ No domain mismatch"}
              </div>
            )}
            {sender.explanation && (
              <p className="sender-explanation">{sender.explanation}</p>
            )}
          </motion.div>

          {/* ACTION BUTTONS */}
          <motion.div className="btn-row" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <PDFExport reportData={reportData} />
          </motion.div>
        </div>

        {/* ═══ RIGHT COLUMN (LIVE DOCUMENT PREVIEW) ═══ */}
        <motion.div className="preview-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="preview-header">
            <div className="preview-header-left">
              <div className="preview-dots">
                <span style={{ background: "#ef4444" }} />
                <span style={{ background: "#eab308" }} />
                <span style={{ background: "#22c55e" }} />
              </div>
              📄 Forensic Report Document
            </div>
          </div>
          
          <div className="doc-scroll">
            <div className="doc-page">
              <div className="doc-page-header">
                <h1 className="doc-page-logo">PhishFilter</h1>
                <span className="doc-page-sublogo">AI-Powered Phishing Detection</span>
              </div>
              
              <div className="doc-verdict-box" style={{ "--vc": verdictColor } as React.CSSProperties}>
                <h1>{verdictLabel}</h1>
                <p>Risk Score: {score}/100</p>
              </div>
              
              <div className="doc-meta">
                <strong>Date:</strong> {new Date(reportData.timestamp).toLocaleString()}<br/>
                <strong>From:</strong> {parsed?.from || "N/A"}<br/>
                <strong>Subject:</strong> {parsed?.subject || "N/A"}<br/>
                <strong>Auth:</strong> SPF: {parsed?.spf || "N/A"} | DKIM: {parsed?.dkim || "N/A"} | DMARC: {parsed?.dmarc || "N/A"}
              </div>
              
              <div className="doc-section">
                <h2>Executive Summary</h2>
                <p>{analysis?.summary || "No summary available."}</p>
              </div>
              
              {analysis?.senderAnalysis && (
                <div className="doc-section">
                  <h2>Sender Analysis</h2>
                  <p><strong>From Domain:</strong> {analysis.senderAnalysis.fromDomain || "N/A"}</p>
                  <p><strong>Return-Path:</strong> {analysis.senderAnalysis.returnPathDomain || "N/A"}</p>
                  <p>{analysis.senderAnalysis.explanation}</p>
                </div>
              )}
              
              {analysis?.signals?.length > 0 && (
                <div className="doc-section">
                  <h2>Security Signals ({analysis.signals.length})</h2>
                  <ul className="doc-signals">
                    {analysis.signals.map((s: any, i: number) => {
                      const sc = s.status === "FAIL" ? "#ef4444" : s.status === "WARN" ? "#f59e0b" : "#22c55e";
                      const bg = s.status === "FAIL" ? "rgba(239,68,68,0.1)" : s.status === "WARN" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)";
                      return (
                        <li key={i} className="doc-signal-item">
                          <span className="doc-signal-status" style={{ color: sc, background: bg }}>{s.status}</span>
                          <div className="doc-signal-content">
                            <h4>{s.check}</h4>
                            <p>{s.detail}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {analysis?.technicalSummary && (
                <div className="doc-section">
                  <h2>Technical Summary</h2>
                  <p style={{ fontSize: "12px", color: "#666" }}>{analysis.technicalSummary}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
