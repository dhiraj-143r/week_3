"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────

interface Signal {
  check: string;
  status: "FAIL" | "WARN" | "PASS";
  detail: string;
}

interface VoiceVerdictProps {
  verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
  overallScore: number;
  signals: Signal[];
  summary: string;
  homographDomain?: string;
  targetBrand?: string;
  autoPlay?: boolean;
}

type Lang = "en" | "hi";

// ── Helpers ────────────────────────────────────────────────────────────

function buildVerdictText(props: VoiceVerdictProps, lang: Lang): string {
  const { verdict, overallScore, signals } = props;

  // Get top failing signals
  const failSignals = signals
    .filter((s) => s.status === "FAIL")
    .slice(0, 3);

  const warnSignals = signals
    .filter((s) => s.status === "WARN")
    .slice(0, 2);

  const topIssues = [...failSignals, ...warnSignals].slice(0, 3);

  if (lang === "hi") {
    return buildHindiText(verdict, overallScore, topIssues, props);
  }
  return buildEnglishText(verdict, overallScore, topIssues, props);
}

function buildEnglishText(
  verdict: string,
  score: number,
  issues: Signal[],
  props: VoiceVerdictProps
): string {
  let text = "";

  if (verdict === "HIGH_RISK") {
    text += "Warning. This email has been flagged as high risk with a score of " + score + " out of 100. ";
  } else if (verdict === "MEDIUM_RISK") {
    text += "Caution. This email has been flagged as suspicious with a score of " + score + " out of 100. ";
  } else {
    text += "This email appears safe with a risk score of " + score + " out of 100. ";
  }

  if (issues.length > 0) {
    text += "Our AI detected the following issues: ";
    issues.forEach((issue, i) => {
      text += issue.detail;
      if (i < issues.length - 1) text += ". ";
    });
    text += ". ";
  }

  if (props.homographDomain && props.targetBrand) {
    text += "A homograph attack was detected attempting to impersonate " + props.targetBrand + ". ";
  }

  if (verdict === "HIGH_RISK") {
    text += "Do not click any links in this email.";
  } else if (verdict === "MEDIUM_RISK") {
    text += "Exercise caution before interacting with this email.";
  } else {
    text += "No significant threats were detected.";
  }

  return text;
}

function buildHindiText(
  verdict: string,
  score: number,
  issues: Signal[],
  props: VoiceVerdictProps
): string {
  let text = "";

  if (verdict === "HIGH_RISK") {
    text += "चेतावनी। यह ईमेल उच्च जोखिम के रूप में चिह्नित किया गया है। जोखिम स्कोर " + score + " है। ";
  } else if (verdict === "MEDIUM_RISK") {
    text += "सावधान। यह ईमेल संदिग्ध के रूप में चिह्नित किया गया है। जोखिम स्कोर " + score + " है। ";
  } else {
    text += "यह ईमेल सुरक्षित प्रतीत होता है। जोखिम स्कोर " + score + " है। ";
  }

  if (issues.length > 0) {
    text += "हमारे AI ने निम्नलिखित समस्याएं पाई हैं: ";
    issues.forEach((issue, i) => {
      text += issue.detail;
      if (i < issues.length - 1) text += "। ";
    });
    text += "। ";
  }

  if (props.homographDomain && props.targetBrand) {
    text += props.targetBrand + " की नकल करने का होमोग्राफ हमला पाया गया। ";
  }

  if (verdict === "HIGH_RISK") {
    text += "इस ईमेल में किसी भी लिंक पर क्लिक न करें।";
  } else if (verdict === "MEDIUM_RISK") {
    text += "इस ईमेल से सावधान रहें।";
  } else {
    text += "कोई महत्वपूर्ण खतरा नहीं पाया गया।";
  }

  return text;
}

// ── Visualizer Bars ────────────────────────────────────────────────────

function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const NUM_BARS = 20;
  return (
    <div className="flex items-end gap-[2px] h-8 px-1">
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-indigo-500 to-purple-400"
          animate={
            isPlaying
              ? {
                  height: [4, 8 + Math.random() * 24, 6 + Math.random() * 16, 4],
                }
              : { height: 4 }
          }
          transition={
            isPlaying
              ? {
                  duration: 0.4 + Math.random() * 0.3,
                  repeat: Infinity,
                  repeatType: "mirror",
                  delay: i * 0.03,
                  ease: "easeInOut",
                }
              : { duration: 0.3 }
          }
          style={{ minHeight: 4 }}
        />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function VoiceVerdict({
  verdict,
  overallScore,
  signals,
  summary,
  homographDomain,
  targetBrand,
  autoPlay = true,
}: VoiceVerdictProps) {
  const [currentLang, setCurrentLang] = useState<Lang>("en");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioCache, setAudioCache] = useState<Record<Lang, string | null>>({ en: null, hi: null });
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoPlayed = useRef(false);

  // Generate audio from Sarvam TTS API
  const generateAudio = useCallback(
    async (lang: Lang): Promise<string | null> => {
      // Return cached version if available
      if (audioCache[lang]) return audioCache[lang];

      setIsLoading(true);
      setError(null);

      try {
        const text = buildVerdictText(
          { verdict, overallScore, signals, summary, homographDomain, targetBrand },
          lang
        );

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang }),
        });

        if (!response.ok) {
          throw new Error(`TTS failed: ${response.status}`);
        }

        const data = await response.json();
        const audioUrl = `data:audio/wav;base64,${data.audio}`;

        setAudioCache((prev) => ({ ...prev, [lang]: audioUrl }));
        return audioUrl;
      } catch (err: unknown) {
        const e = err as { message?: string };
        console.error("[VoiceVerdict] TTS error:", e.message);
        setError("Voice generation unavailable");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [verdict, overallScore, signals, summary, homographDomain, targetBrand, audioCache]
  );

  // Play audio for given language
  const playAudio = useCallback(
    async (lang: Lang) => {
      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setCurrentLang(lang);
      const audioUrl = await generateAudio(lang);
      if (!audioUrl) return;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setError("Playback failed");
      };

      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
    },
    [generateAudio]
  );

  // Stop playback
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  // Auto-play English on mount
  useEffect(() => {
    if (autoPlay && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      // Small delay so the component is visible first
      const timer = setTimeout(() => playAudio("en"), 1500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, playAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Speaker icon */}
        <button
          onClick={() => (isPlaying ? stopAudio() : playAudio(currentLang))}
          disabled={isLoading}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
            isPlaying
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {isLoading ? (
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
          ) : isPlaying ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.383 3.07C11.009 2.922 10.579 3 10.293 3.293L6 7.586H3a1 1 0 00-1 1v6.828a1 1 0 001 1h3l4.293 4.293a1 1 0 001.414 0c.187-.187.293-.442.293-.707V3.778c0-.265-.106-.52-.293-.707a.999.999 0 00-.324-.001zM14.657 7.757a1 1 0 011.414 0A5.98 5.98 0 0118 12a5.98 5.98 0 01-1.929 4.243 1 1 0 01-1.414-1.414A3.984 3.984 0 0016 12a3.984 3.984 0 00-1.343-2.829 1 1 0 010-1.414zm2.828-2.828a1 1 0 011.414 0A9.969 9.969 0 0122 12a9.969 9.969 0 01-3.101 7.071 1 1 0 01-1.414-1.414A7.972 7.972 0 0020 12a7.972 7.972 0 00-2.515-5.657 1 1 0 010-1.414z" />
            </svg>
          )}
        </button>

        {/* Visualizer */}
        <div className="flex-1 min-w-0">
          <AudioVisualizer isPlaying={isPlaying} />
        </div>

        {/* Language buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => playAudio("en")}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentLang === "en" && (isPlaying || isLoading)
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/60"
            }`}
          >
            English
          </button>
          <button
            onClick={() => playAudio("hi")}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentLang === "hi" && (isPlaying || isLoading)
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/60"
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3 overflow-hidden"
          >
            <p className="text-[11px] text-amber-400/60 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
