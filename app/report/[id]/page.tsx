"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Signal {
  check: string;
  status: "FAIL" | "WARN" | "PASS";
  severity: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  technical: string;
}

interface ReportData {
  id: string;
  createdAt: string;
  data: {
    success: boolean;
    timestamp: string;
    analysis: {
      verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
      overallScore: number;
      signals: Signal[];
      summary: string;
      urlAnalysis?: Array<{
        original: string;
        isSuspicious: boolean;
        virusTotalScore: string;
      }>;
    };
    parsed: {
      from: string;
      subject: string;
      senderDomain: string;
      urls: string[];
      spf: string;
      dkim: string;
      dmarc: string;
    };
    enrichment?: {
      sandbox?: Array<{
        inputUrl: string;
        finalUrl: string;
        verdict: "SAFE" | "SUSPICIOUS" | "PHISHING";
        redirectChain: Array<{ url: string; status: number }>;
        virusTotal: { flagged: number; total: number };
        serverLocation: string;
      }>;
    };
  };
}

const VERDICT_CONFIG = {
  HIGH_RISK: { emoji: "🔴", label: "HIGH RISK — PHISHING DETECTED", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  MEDIUM_RISK: { emoji: "🟡", label: "MEDIUM RISK — SUSPICIOUS", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  SAFE: { emoji: "🟢", label: "SAFE — NO THREATS DETECTED", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
};

const STATUS_BADGE = {
  FAIL: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", icon: "✗" },
  WARN: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: "⚠" },
  PASS: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", icon: "✓" },
};

export default function SharedReportPage() {
  const params = useParams();
  const reportId = params?.id as string;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    fetch(`/api/report?id=${reportId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Report not found or expired");
        return res.json();
      })
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [reportId]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0a", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px", animation: "pulse 2s infinite" }}>🛡️</div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0a", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>Report Not Found</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "24px" }}>
            This report may have expired or the link is invalid.
          </p>
          <Link href="/scan" style={{
            display: "inline-block", padding: "10px 24px", borderRadius: "12px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
            textDecoration: "none", fontSize: "14px", fontWeight: 600
          }}>
            Run a New Scan
          </Link>
        </div>
      </div>
    );
  }

  const { analysis, parsed, enrichment } = report.data;
  const verdictConfig = VERDICT_CONFIG[analysis.verdict];

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", color: "#e5e5e5",
      fontFamily: "'Inter', system-ui, sans-serif", padding: "0"
    }}>
      {/* Header */}
      <header style={{
        padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🛡️</span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>PhishFilter</span>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>Report</span>
        </div>
        <Link href="/scan" style={{
          padding: "6px 16px", borderRadius: "8px", fontSize: "12px",
          background: "rgba(99,102,241,0.15)", color: "#818cf8",
          textDecoration: "none", fontWeight: 600
        }}>
          Run New Scan →
        </Link>
      </header>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 20px" }}>
        {/* Verdict Banner */}
        <div style={{
          borderRadius: "16px", padding: "32px", marginBottom: "24px",
          border: `1px solid ${verdictConfig.color}30`, background: verdictConfig.bg,
          textAlign: "center"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>{verdictConfig.emoji}</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: verdictConfig.color, margin: "0 0 8px" }}>
            {verdictConfig.label}
          </h1>
          <div style={{
            display: "inline-block", padding: "6px 20px", borderRadius: "99px",
            border: `2px solid ${verdictConfig.color}`, fontSize: "28px", fontWeight: 700,
            color: verdictConfig.color
          }}>
            {analysis.overallScore}/100
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "12px" }}>
            Analyzed on {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Email Info */}
        <div style={{
          borderRadius: "16px", padding: "20px", marginBottom: "16px",
          border: "1px solid rgba(255,255,255,0.06)", background: "#111"
        }}>
          <h3 style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            Email Details
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
            <div><span style={{ color: "rgba(255,255,255,0.3)" }}>From: </span><span style={{ color: "rgba(255,255,255,0.7)" }}>{parsed.from || "N/A"}</span></div>
            <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Domain: </span><span style={{ color: "rgba(255,255,255,0.7)" }}>{parsed.senderDomain || "N/A"}</span></div>
            <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "rgba(255,255,255,0.3)" }}>Subject: </span><span style={{ color: "rgba(255,255,255,0.7)" }}>{parsed.subject || "N/A"}</span></div>
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px" }}>
            <span style={{ color: parsed.spf?.includes("pass") ? "#22c55e" : "#ef4444" }}>SPF: {parsed.spf || "N/A"}</span>
            <span style={{ color: parsed.dkim?.includes("pass") ? "#22c55e" : "#ef4444" }}>DKIM: {parsed.dkim || "N/A"}</span>
            <span style={{ color: parsed.dmarc?.includes("pass") ? "#22c55e" : "#ef4444" }}>DMARC: {parsed.dmarc || "N/A"}</span>
          </div>
        </div>

        {/* Summary */}
        <div style={{
          borderRadius: "16px", padding: "20px", marginBottom: "16px",
          border: "1px solid rgba(255,255,255,0.06)", background: "#111"
        }}>
          <h3 style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Analysis Summary
          </h3>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6", margin: 0 }}>
            {analysis.summary}
          </p>
        </div>

        {/* Signals */}
        <div style={{
          borderRadius: "16px", padding: "20px", marginBottom: "16px",
          border: "1px solid rgba(255,255,255,0.06)", background: "#111"
        }}>
          <h3 style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            Security Signals ({analysis.signals?.length || 0})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {(analysis.signals || []).map((signal, i) => {
              const badge = STATUS_BADGE[signal.status];
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 14px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${badge.color}`
                }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "6px", fontSize: "10px",
                    fontWeight: 700, background: badge.bg, color: badge.color
                  }}>
                    {badge.icon} {signal.status}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{signal.check}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{signal.detail}</div>
                  </div>
                  <span style={{
                    fontSize: "10px", padding: "2px 6px", borderRadius: "4px",
                    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)"
                  }}>
                    {signal.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sandbox Link Results */}
        {enrichment?.sandbox && enrichment.sandbox.length > 0 && (
          <div style={{
            borderRadius: "16px", padding: "20px", marginBottom: "16px",
            border: "1px solid rgba(255,255,255,0.06)", background: "#111"
          }}>
            <h3 style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
              🔗 Link Sandbox Analysis ({enrichment.sandbox.length} URLs)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {enrichment.sandbox.map((link, i) => (
                <div key={i} style={{
                  padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", color: "rgba(255,255,255,0.5)", wordBreak: "break-all" as const }}>
                      {link.inputUrl}
                    </span>
                    <span style={{
                      padding: "3px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 700,
                      background: link.verdict === "SAFE" ? "rgba(34,197,94,0.15)" : link.verdict === "PHISHING" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                      color: link.verdict === "SAFE" ? "#22c55e" : link.verdict === "PHISHING" ? "#ef4444" : "#f59e0b"
                    }}>
                      {link.verdict}
                    </span>
                  </div>
                  {link.finalUrl !== link.inputUrl && (
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                      🎯 Final: <span style={{ color: "rgba(255,255,255,0.5)" }}>{link.finalUrl}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                    <span>VT: {link.virusTotal.flagged}/{link.virusTotal.total} flagged</span>
                    <span>📍 {link.serverLocation}</span>
                    <span>{link.redirectChain.length} hop(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: "16px" }}>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", margin: 0 }}>
            Report generated by PhishFilter — AI-Powered Phishing Detection
          </p>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.08)", margin: "4px 0 0" }}>
            Report ID: {reportId} • Expires in 7 days
          </p>
        </div>
      </main>
    </div>
  );
}
