"use client";

import React from "react";
import { motion } from "framer-motion";

interface ScreenshotPreviewProps {
  url: string;
  screenshotUrl?: string;
  isSuspicious?: boolean;
}

export default function ScreenshotPreview({ url, screenshotUrl, isSuspicious }: ScreenshotPreviewProps) {
  if (!screenshotUrl) {
    return (
      <div className="rounded-xl border border-white/5 bg-card p-6 flex flex-col items-center justify-center min-h-[180px]">
        <svg className="w-10 h-10 text-white/10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        <p className="text-white/30 text-sm">No preview available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/5 bg-card overflow-hidden"
    >
      {/* Warning bar */}
      {isSuspicious && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.335 3.532 19 5.072 19z" />
          </svg>
          <span className="text-red-400 text-xs font-medium">Safe Preview — Original site may be dangerous</span>
        </div>
      )}

      {/* Screenshot image */}
      <div className="relative group h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          alt={`Screenshot of ${url}`}
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* URL bar */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isSuspicious ? "bg-red-500" : "bg-emerald-500"}`} />
        <p className="text-white/40 text-xs font-mono truncate flex-1">{url}</p>
      </div>
    </motion.div>
  );
}
