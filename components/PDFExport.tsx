"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { jsPDF } from "jspdf";

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
}

interface ReportData {
  timestamp: string;
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
    summary: string;
    technicalSummary: string;
  };
  parsed: {
    from: string;
    subject: string;
    senderDomain: string;
    urls: string[];
    ipAddresses: string[];
    spf: string;
    dkim: string;
    dmarc: string;
  };
}

interface PDFExportProps {
  reportData: ReportData;
}

// ── Color Config ───────────────────────────────────────────────────────

const VERDICT_COLORS: Record<string, { r: number; g: number; b: number }> = {
  HIGH_RISK: { r: 239, g: 68, b: 68 },
  MEDIUM_RISK: { r: 245, g: 158, b: 11 },
  SAFE: { r: 34, g: 197, b: 94 },
};

const STATUS_COLORS: Record<string, { r: number; g: number; b: number }> = {
  FAIL: { r: 239, g: 68, b: 68 },
  WARN: { r: 245, g: 158, b: 11 },
  PASS: { r: 34, g: 197, b: 94 },
};

// ── PDF Helper Functions ───────────────────────────────────────────────

function addPageHeader(doc: jsPDF, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Dark header bar
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, w, 18, "F");

  // Logo text
  doc.setFontSize(11);
  doc.setTextColor(99, 102, 241);
  doc.setFont("helvetica", "bold");
  doc.text("PhishFilter", 14, 12);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered Phishing Detection", 50, 12);

  // Page number footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Page ${pageNum} of ${totalPages}`, w / 2, h - 10, { align: "center" });

  // Footer line
  doc.setDrawColor(40, 40, 40);
  doc.line(14, h - 15, w - 14, h - 15);

  return 26; // content start Y
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(12);
  doc.setTextColor(99, 102, 241);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, y);
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.3);
  doc.line(14, y + 2, 196, y + 2);
  return y + 8;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "", maxWidth);
}

// ── Main PDF Generator ─────────────────────────────────────────────────

function generatePDF(data: ReportData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();
  const { analysis, parsed } = data;
  const verdictColor = VERDICT_COLORS[analysis.verdict];
  const totalPages = 4;

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 1 — Executive Summary
  // ═══════════════════════════════════════════════════════════════════

  let y = addPageHeader(doc, 1, totalPages);

  // Verdict banner
  doc.setFillColor(verdictColor.r, verdictColor.g, verdictColor.b);
  doc.roundedRect(14, y, w - 28, 28, 3, 3, "F");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  const verdictLabel =
    analysis.verdict === "HIGH_RISK" ? "PHISHING DETECTED" :
    analysis.verdict === "MEDIUM_RISK" ? "SUSPICIOUS EMAIL" : "EMAIL APPEARS SAFE";
  doc.text(verdictLabel, w / 2, y + 12, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Risk Score: ${analysis.overallScore}/100`, w / 2, y + 20, { align: "center" });
  y += 36;

  // Analysis details
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(data.timestamp).toLocaleString()}`, 14, y);
  doc.text(`From: ${parsed.from || "N/A"}`, 14, y + 5);
  doc.text(`Subject: ${parsed.subject || "N/A"}`, 14, y + 10);
  doc.text(`Domain: ${parsed.senderDomain || "N/A"}`, 14, y + 15);
  y += 24;

  // Auth results
  doc.text(`SPF: ${parsed.spf || "N/A"}   |   DKIM: ${parsed.dkim || "N/A"}   |   DMARC: ${parsed.dmarc || "N/A"}`, 14, y);
  y += 10;

  // Executive summary
  y = addSectionTitle(doc, "Executive Summary", y);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  const summaryLines = wrapText(doc, analysis.summary, 170);
  doc.text(summaryLines, 14, y);
  y += summaryLines.length * 5 + 8;

  // Sender analysis
  if (analysis.senderAnalysis) {
    y = addSectionTitle(doc, "Sender Analysis", y);
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`From Domain: ${analysis.senderAnalysis.fromDomain}`, 14, y);
    doc.text(`Return-Path: ${analysis.senderAnalysis.returnPathDomain}`, 14, y + 5);
    if (analysis.senderAnalysis.mismatch) {
      doc.setTextColor(239, 68, 68);
      doc.text("⚠ DOMAIN MISMATCH DETECTED", 14, y + 10);
      doc.setTextColor(60, 60, 60);
    }
    const senderExplLines = wrapText(doc, analysis.senderAnalysis.explanation, 170);
    doc.text(senderExplLines, 14, y + 16);
    y += 16 + senderExplLines.length * 4 + 6;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 2 — Security Signals
  // ═══════════════════════════════════════════════════════════════════

  doc.addPage();
  y = addPageHeader(doc, 2, totalPages);
  y = addSectionTitle(doc, `Security Signals (${analysis.signals.length})`, y);

  // Signals table header
  doc.setFillColor(30, 30, 30);
  doc.rect(14, y, w - 28, 7, "F");
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.setFont("helvetica", "bold");
  doc.text("Check", 16, y + 5);
  doc.text("Status", 80, y + 5);
  doc.text("Severity", 100, y + 5);
  doc.text("Detail", 120, y + 5);
  y += 9;

  // Signal rows
  analysis.signals.forEach((signal) => {
    if (y > 260) {
      doc.addPage();
      y = addPageHeader(doc, 2, totalPages);
      y += 4;
    }

    const statusColor = STATUS_COLORS[signal.status];
    const detailLines = wrapText(doc, signal.detail, 72);
    const rowHeight = Math.max(detailLines.length * 4 + 2, 8);

    // Colored left border
    doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
    doc.rect(14, y - 1, 1.5, rowHeight, "F");

    // Row background (alternate)
    doc.setFillColor(25, 25, 25);
    doc.rect(15.5, y - 1, w - 29.5, rowHeight, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(signal.check.substring(0, 30), 18, y + 3);

    doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
    doc.setFont("helvetica", "bold");
    doc.text(signal.status, 80, y + 3);

    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(signal.severity, 100, y + 3);

    doc.setTextColor(170, 170, 170);
    doc.text(detailLines, 120, y + 3);

    y += rowHeight + 1;
  });

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 3 — URL & Homograph Analysis
  // ═══════════════════════════════════════════════════════════════════

  doc.addPage();
  y = addPageHeader(doc, 3, totalPages);

  // URL Analysis
  if (analysis.urlAnalysis && analysis.urlAnalysis.length > 0) {
    y = addSectionTitle(doc, `URL Analysis (${analysis.urlAnalysis.length})`, y);

    // Table header
    doc.setFillColor(30, 30, 30);
    doc.rect(14, y, w - 28, 7, "F");
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "bold");
    doc.text("URL", 16, y + 5);
    doc.text("Status", 130, y + 5);
    doc.text("VT Score", 155, y + 5);
    y += 9;

    analysis.urlAnalysis.forEach((urlItem) => {
      if (y > 265) {
        doc.addPage();
        y = addPageHeader(doc, 3, totalPages);
        y += 4;
      }

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(170, 170, 170);
      const truncUrl = urlItem.original.length > 60 ? urlItem.original.substring(0, 57) + "..." : urlItem.original;
      doc.text(truncUrl, 16, y + 3);

      if (urlItem.isSuspicious) {
        doc.setTextColor(239, 68, 68);
        doc.text("SUSPICIOUS", 130, y + 3);
      } else {
        doc.setTextColor(34, 197, 94);
        doc.text("CLEAN", 130, y + 3);
      }

      doc.setTextColor(150, 150, 150);
      doc.text(urlItem.virusTotalScore || "N/A", 155, y + 3);

      if (urlItem.unshortened && urlItem.unshortened !== urlItem.original) {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(6);
        const truncFinal = urlItem.unshortened.length > 70 ? urlItem.unshortened.substring(0, 67) + "..." : urlItem.unshortened;
        doc.text(`→ ${truncFinal}`, 18, y + 7);
        y += 4;
      }

      y += 7;
    });
    y += 4;
  }

  // Homograph Analysis
  if (analysis.homographAnalysis) {
    y = addSectionTitle(doc, "Homograph Analysis", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    if (analysis.homographAnalysis.detected) {
      doc.setTextColor(239, 68, 68);
      doc.text("⚠ HOMOGRAPH ATTACK DETECTED", 14, y);
      y += 6;
      if (analysis.homographAnalysis.domains.length > 0) {
        doc.setTextColor(170, 170, 170);
        doc.text(`Affected domains: ${analysis.homographAnalysis.domains.join(", ")}`, 14, y);
        y += 5;
      }
    } else {
      doc.setTextColor(34, 197, 94);
      doc.text("No homograph attacks detected", 14, y);
      y += 6;
    }
    const homoLines = wrapText(doc, analysis.homographAnalysis.explanation, 170);
    doc.setTextColor(120, 120, 120);
    doc.text(homoLines, 14, y);
    y += homoLines.length * 4 + 8;
  }

  // Header Hop Analysis
  if (analysis.headerAnalysis) {
    y = addSectionTitle(doc, "Header Hop Analysis", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(170, 170, 170);
    doc.text(`Total hops: ${analysis.headerAnalysis.hops}`, 14, y);
    y += 5;

    if (analysis.headerAnalysis.suspiciousHops.length > 0) {
      doc.setTextColor(239, 68, 68);
      doc.text(`Suspicious hops: ${analysis.headerAnalysis.suspiciousHops.join(", ")}`, 14, y);
      y += 5;
    }

    const hopLines = wrapText(doc, analysis.headerAnalysis.explanation, 170);
    doc.setTextColor(120, 120, 120);
    doc.text(hopLines, 14, y);
    y += hopLines.length * 4 + 4;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 4 — Technical Summary & Raw Data
  // ═══════════════════════════════════════════════════════════════════

  doc.addPage();
  y = addPageHeader(doc, 4, totalPages);

  y = addSectionTitle(doc, "Technical Summary", y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  const techLines = wrapText(doc, analysis.technicalSummary, 170);
  doc.text(techLines, 14, y);
  y += techLines.length * 4 + 10;

  // Raw extracted data
  y = addSectionTitle(doc, "Raw Extracted Data", y);
  doc.setFontSize(7);
  doc.setFont("courier", "normal");
  doc.setTextColor(130, 130, 130);

  const rawData = [
    `From: ${parsed.from}`,
    `Subject: ${parsed.subject}`,
    `Sender Domain: ${parsed.senderDomain}`,
    `SPF: ${parsed.spf} | DKIM: ${parsed.dkim} | DMARC: ${parsed.dmarc}`,
    "",
    `URLs (${parsed.urls.length}):`,
    ...parsed.urls.map((u) => `  ${u}`),
    "",
    `IPs (${parsed.ipAddresses.length}):`,
    ...parsed.ipAddresses.map((ip) => `  ${ip}`),
  ];

  rawData.forEach((line) => {
    if (y > 270) {
      doc.addPage();
      y = addPageHeader(doc, 4, totalPages);
      y += 4;
    }
    doc.text(line.substring(0, 100), 14, y);
    y += 3.5;
  });

  y += 8;

  // Disclaimer
  if (y > 250) {
    doc.addPage();
    y = addPageHeader(doc, 4, totalPages);
    y += 4;
  }
  doc.setFillColor(25, 25, 25);
  doc.roundedRect(14, y, w - 28, 24, 2, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "italic");
  doc.text("DISCLAIMER", 16, y + 5);
  doc.setFont("helvetica", "normal");
  const disclaimerLines = wrapText(
    doc,
    "This report was generated by PhishFilter AI and is intended for informational purposes only. While our analysis uses multiple security tools and AI models, no automated system can guarantee 100% accuracy. Always use professional judgment when handling suspicious emails. PhishFilter is not liable for any actions taken based on this report.",
    w - 34
  );
  doc.text(disclaimerLines, 16, y + 10);

  return doc;
}

// ── Component ──────────────────────────────────────────────────────────

export default function PDFExport({ reportData }: PDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = useCallback(() => {
    setIsGenerating(true);

    // Use setTimeout to allow the UI to update before heavy PDF generation
    setTimeout(() => {
      try {
        const doc = generatePDF(reportData);
        const timestamp = new Date().toISOString().split("T")[0];
        doc.save(`phishfilter-report-${timestamp}.pdf`);
      } catch (error) {
        console.error("[PDFExport] Generation failed:", error);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  }, [reportData]);

  return (
    <motion.button
      id="export-pdf-btn"
      onClick={handleExport}
      disabled={isGenerating}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
                 bg-white/[0.04] border border-white/[0.08] text-white/60
                 hover:bg-white/[0.07] hover:text-white/80 transition-all
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isGenerating ? (
        <>
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </motion.svg>
          Generating PDF...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Forensic Report PDF
        </>
      )}
    </motion.button>
  );
}
