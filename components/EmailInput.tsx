"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EmailInputProps {
  onSubmit: (emailContent: string, userEmail?: string, userPhone?: string, files?: File[]) => void;
  isLoading: boolean;
  prefillContent?: string;
  onPrefillConsumed?: () => void;
}

const SCANNING_MESSAGES = [
  "Parsing email headers...",
  "Scanning URLs with VirusTotal...",
  "Checking for homograph attacks...",
  "Fetching safe previews...",
  "Analyzing sender reputation...",
  "Checking SPF / DKIM / DMARC...",
  "Generating forensic report...",
];

export default function EmailInput({ onSubmit, isLoading, prefillContent, onPrefillConsumed }: EmailInputProps) {
  const [emailContent, setEmailContent] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showOptional, setShowOptional] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle prefill from sample button
  React.useEffect(() => {
    if (prefillContent) {
      setEmailContent(prefillContent);
      onPrefillConsumed?.();
    }
  }, [prefillContent, onPrefillConsumed]);

  // Cycle through scanning messages during loading
  React.useEffect(() => {
    if (!isLoading) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % SCANNING_MESSAGES.length);
    }, 2200);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = useCallback(() => {
    if (!emailContent.trim() || isLoading) return;
    onSubmit(emailContent, userEmail || undefined, userPhone || undefined, attachedFiles.length > 0 ? attachedFiles : undefined);
  }, [emailContent, userEmail, userPhone, attachedFiles, isLoading, onSubmit]);

  const handleFileAdd = useCallback((files: FileList | null) => {
    if (!files) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp", "text/html"];
    const validFiles = Array.from(files).filter((f) => allowed.some((t) => f.type.startsWith(t.split("/")[0]) || f.type === t));
    setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Main card */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111111] overflow-hidden shadow-2xl shadow-black/50">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Email Analysis</h2>
              <p className="text-xs text-white/40">Paste raw email source including headers</p>
            </div>
          </div>
          <span className="text-xs text-white/20 font-mono">
            {emailContent.length.toLocaleString()} chars
          </span>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            id="email-input"
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste your suspicious email here — headers, body, everything..."
            disabled={isLoading}
            className="w-full min-h-[300px] p-6 bg-transparent text-white/90 text-sm font-mono 
                       placeholder:text-white/15 resize-y outline-none border-none
                       disabled:opacity-50 disabled:cursor-not-allowed
                       leading-relaxed"
            spellCheck={false}
          />

          {/* Scan overlay when loading */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#111111]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6"
              >
                {/* Scanning animation */}
                <div className="relative w-20 h-20">
                  {/* Outer ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 border-r-indigo-500/30"
                  />
                  {/* Middle ring */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-500 border-l-purple-500/30"
                  />
                  {/* Inner ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-2 border-transparent border-b-indigo-400 border-r-indigo-400/30"
                  />
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </motion.div>
                  </div>
                </div>

                {/* Status message */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-white/60 text-sm font-medium"
                  >
                    {SCANNING_MESSAGES[messageIndex]}
                  </motion.p>
                </AnimatePresence>

                {/* Progress bar */}
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: SCANNING_MESSAGES.length * 2.2, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Attachment area */}
        <div className="border-t border-white/[0.06] px-6 py-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-indigo-500/30", "bg-indigo-500/5"); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("border-indigo-500/30", "bg-indigo-500/5"); }}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-indigo-500/30", "bg-indigo-500/5"); handleFileAdd(e.dataTransfer.files); }}
            className="rounded-lg border border-dashed border-white/[0.08] px-4 py-2.5 cursor-pointer
                       hover:border-white/[0.15] hover:bg-white/[0.01] transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.html,.htm"
              onChange={(e) => handleFileAdd(e.target.files)}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-white/20 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-xs text-white/30">
                {attachedFiles.length === 0
                  ? "Attach suspicious PDFs, images, or HTML files (optional)"
                  : `${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""} attached`}
              </span>
            </div>
          </div>

          {/* Attached files list */}
          {attachedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachedFiles.map((file, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400">
                  {file.type === "application/pdf" ? "📄" : file.type.startsWith("image/") ? "🖼️" : "🌐"}
                  {file.name.length > 20 ? file.name.slice(0, 17) + "..." : file.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(i); }}
                    className="ml-0.5 text-purple-400/50 hover:text-purple-400 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Optional fields toggle */}
        <div className="border-t border-white/[0.06]">
          <button
            onClick={() => setShowOptional(!showOptional)}
            className="w-full px-6 py-3 flex items-center justify-between text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Optional: Get notified about results
            </span>
            <motion.svg
              animate={{ rotate: showOptional ? 180 : 0 }}
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {showOptional && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/30 mb-1.5">Email for report delivery</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 
                                 placeholder:text-white/15 outline-none focus:border-indigo-500/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/30 mb-1.5">WhatsApp for notification</label>
                    <input
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 
                                 placeholder:text-white/15 outline-none focus:border-indigo-500/30 transition-colors"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit bar */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <p className="text-xs text-white/20 hidden sm:block">
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[10px]">⌘</kbd>
            {" + "}
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[10px]">Enter</kbd>
            {" to scan"}
          </p>

          <button
            id="scan-email-btn"
            onClick={handleSubmit}
            disabled={!emailContent.trim() || isLoading}
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-semibold text-sm
                       bg-indigo-500 text-white shadow-lg shadow-indigo-500/25
                       hover:bg-indigo-400 hover:shadow-indigo-400/30
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-500
                       transition-all duration-200 active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            {isLoading ? "Scanning..." : "Scan Email"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
