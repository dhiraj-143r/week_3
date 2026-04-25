"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────

interface AttachmentSignal {
  check: string;
  status: "FAIL" | "WARN" | "PASS";
  severity: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
}

interface AttachmentResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
  score: number;
  summary: string;
  signals: AttachmentSignal[];
  extractedUrls: string[];
  extractedText?: string;
  visionAnalysis?: string;
}

// ── Verdict Styles ─────────────────────────────────────────────────────

const VERDICT_STYLES: Record<string, { bg: string; border: string; text: string; label: string; icon: string; ring: string }> = {
  HIGH_RISK: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "HIGH RISK", icon: "🔴", ring: "ring-red-500/30" },
  MEDIUM_RISK: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: "SUSPICIOUS", icon: "🟡", ring: "ring-amber-500/30" },
  SAFE: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "SAFE", icon: "🟢", ring: "ring-emerald-500/30" },
};

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "📄",
  "image/jpeg": "🖼️",
  "image/png": "🖼️",
  "image/gif": "🖼️",
  "image/webp": "🖼️",
  "text/html": "🌐",
};

// ── Component ──────────────────────────────────────────────────────────

export default function AttachmentScanner() {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<AttachmentResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Scan ─────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/scan-attachment", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Scan failed");
      }

      setResult(data.result);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Scan failed");
    } finally {
      setIsScanning(false);
    }
  }, [selectedFile]);

  // ── Reset ────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ── Upload Area ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 sm:p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Attachment Scanner</h3>
            <p className="text-sm text-white/40">Scan PDFs, images & HTML files for phishing</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all
            ${isDragging
              ? "border-indigo-500/50 bg-indigo-500/5"
              : selectedFile
                ? "border-white/10 bg-white/[0.02]"
                : "border-white/[0.08] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.02]"
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.html,.htm"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="w-32 h-32 object-contain rounded-lg border border-white/10" />
              )}
              {!previewUrl && (
                <span className="text-4xl">{FILE_ICONS[selectedFile.type] || "📎"}</span>
              )}
              <div>
                <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-white/30 mt-1">
                  {selectedFile.type} · {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="text-xs text-white/30 hover:text-white/50 mt-1 underline"
              >
                Choose different file
              </button>
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 text-white/15 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-white/40">
                <span className="text-indigo-400 font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-white/20 mt-2">PDF, Images (JPEG/PNG/GIF/WebP), HTML · Max 10MB</p>
            </>
          )}
        </div>

        {/* Scan button */}
        {selectedFile && !result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mt-5">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="px-8 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600
                         text-white hover:from-purple-500 hover:to-indigo-500 transition-all
                         disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-purple-500/20"
            >
              {isScanning ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing with AI...
                </>
              ) : (
                <>🔬 Scan Attachment</>
              )}
            </button>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            ❌ {error}
          </motion.div>
        )}
      </motion.div>

      {/* ── Scan Progress ────────────────────────────────────── */}
      {isScanning && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/70 font-medium">Analyzing attachment...</p>
              <div className="flex gap-3 mt-2 text-[10px] text-white/30">
                <span className="animate-pulse">📄 Extracting content</span>
                <span className="animate-pulse delay-75">🔗 Finding URLs</span>
                <span className="animate-pulse delay-150">🧠 AI analysis</span>
              </div>
              <div className="mt-3 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  initial={{ width: "5%" }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 15, ease: "linear" }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Results ──────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Verdict Card */}
            {(() => {
              const style = VERDICT_STYLES[result.verdict] || VERDICT_STYLES.SAFE;
              return (
                <div className={`rounded-2xl border ${style.border} ${style.bg} p-6 sm:p-8`}>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Score */}
                    <div className={`w-24 h-24 rounded-full ${style.bg} ring-4 ${style.ring} flex items-center justify-center flex-shrink-0`}>
                      <div className="text-center">
                        <p className={`text-3xl font-bold ${style.text}`}>{result.score}</p>
                        <p className="text-[9px] text-white/30 uppercase">Risk</p>
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                        <span className="text-lg">{style.icon}</span>
                        <h3 className={`text-xl font-bold ${style.text}`}>{style.label}</h3>
                      </div>
                      <p className="text-sm text-white/40 mb-1">
                        {FILE_ICONS[result.fileType] || "📎"} {result.fileName} · {(result.fileSize / 1024).toFixed(1)} KB
                      </p>
                      <p className="text-sm text-white/60 leading-relaxed">{result.summary}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Signals */}
            {result.signals.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
                <h4 className="text-xs text-white/30 uppercase tracking-wider mb-4 font-medium">Detection Signals</h4>
                <div className="space-y-2">
                  {result.signals.map((signal, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        signal.status === "FAIL"
                          ? "bg-red-500/5 border-red-500/10"
                          : signal.status === "WARN"
                            ? "bg-amber-500/5 border-amber-500/10"
                            : "bg-emerald-500/5 border-emerald-500/10"
                      }`}
                    >
                      <span className={`text-sm mt-0.5 ${
                        signal.status === "FAIL" ? "text-red-400" : signal.status === "WARN" ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        {signal.status === "FAIL" ? "✗" : signal.status === "WARN" ? "⚠" : "✓"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white/70">{signal.check}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                            signal.severity === "HIGH"
                              ? "bg-red-500/15 text-red-400"
                              : signal.severity === "MEDIUM"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-gray-500/15 text-gray-400"
                          }`}>
                            {signal.severity}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mt-1">{signal.detail}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted URLs */}
            {result.extractedUrls.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
                <h4 className="text-xs text-white/30 uppercase tracking-wider mb-3 font-medium">
                  Extracted URLs ({result.extractedUrls.length})
                </h4>
                <div className="space-y-1.5">
                  {result.extractedUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] text-white/20 font-mono w-5">{i + 1}.</span>
                      <p className="text-xs text-indigo-400/70 font-mono truncate flex-1">{url}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scan another button */}
            <div className="flex justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-white/[0.03] border border-white/[0.06]
                           text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-all"
              >
                Scan Another Attachment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
