"use client";

import React, { useEffect, useRef, useState } from "react";

/* ── Step data ────────────────────────────────────────────── */
const STEPS = [
  {
    label: "01",
    title: "Drop in any suspicious email.",
    desc: "Raw headers, forwarded body, attachments — paste it all. Natural input. No forms.",
    animType: "paste" as const,
  },
  {
    label: "02",
    title: "12 AI checks run in parallel.",
    desc: "Grok AI analyzes content. VirusTotal scans URLs. SPF/DKIM/DMARC verified. Homograph detection.",
    animType: "analyze" as const,
  },
  {
    label: "03",
    title: "Get a forensic verdict.",
    desc: "Risk score, color-coded signals, URL analysis, sender reputation — everything to decide if it's real or fake.",
    animType: "review" as const,
  },
  {
    label: "04",
    title: "Real-time watchdog.",
    desc: "IMAP IDLE monitoring. Every new email scanned automatically. Instant WhatsApp and email alerts.",
    animType: "protect" as const,
  },
];

/* ══════════════════════════════════════════════════════════════
   CARD ANIMATIONS — one per step, rendered at top of each card
   ══════════════════════════════════════════════════════════════ */

/* ── Paste: Envelope drops into inbox slot ──────────────── */
function PasteAnim({ active }: { active: boolean }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Inbox slot */}
      <div style={{
        width: 80, height: 48, borderRadius: 10,
        border: "1.5px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.03)",
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Slot line */}
        <div style={{ width: 36, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.15)" }} />
        {/* Scan line sweep */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(79,143,255,0.5), transparent)",
          opacity: active ? 1 : 0,
          animation: active ? "scanSweep 2s ease-in-out infinite" : "none",
        }} />
      </div>
      {/* Envelope dropping in */}
      <div style={{
        position: "absolute",
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0) scale(1)" : "translateY(-30px) scale(0.8)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 7L13.03 12.7a1.94 1.94 0 01-2.06 0L2 7" />
        </svg>
      </div>
      {/* Floating particles */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "absolute",
          width: 3, height: 3, borderRadius: "50%",
          background: "rgba(79,143,255,0.5)",
          opacity: active ? 0.6 : 0,
          animation: active ? `floatParticle${i} 3s ease-in-out infinite ${i * 0.8}s` : "none",
        }} />
      ))}
    </div>
  );
}

/* ── Analyze: Concentric scanning rings ─────────────────── */
function AnalyzeAnim({ active }: { active: boolean }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Rings */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "absolute",
          width: 40 + i * 28, height: 40 + i * 28,
          borderRadius: "50%",
          border: `1.5px solid rgba(79,143,255,${active ? 0.25 - i * 0.06 : 0.05})`,
          opacity: active ? 1 : 0,
          transform: active ? "scale(1)" : "scale(0.6)",
          transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15}s`,
          animation: active ? `ringPulse 3s ease-in-out infinite ${i * 0.4}s` : "none",
        }} />
      ))}
      {/* Center icon */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: active ? "rgba(79,143,255,0.12)" : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${active ? "rgba(79,143,255,0.3)" : "rgba(255,255,255,0.08)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.6s ease",
        animation: active ? "centerGlow 2s ease-in-out infinite" : "none",
        zIndex: 2,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? "#4f8fff" : "rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.4s" }}>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>
    </div>
  );
}

/* ── Review: Animated risk score counter ────────────────── */
function ReviewAnim({ active, hovering }: { active: boolean; hovering: boolean }) {
  const [score, setScore] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!active) return;
    setSettled(false);
    const target = 87;
    const duration = 1500;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - p) * (1 - p);
      setScore(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
      else setSettled(true);
    };
    requestAnimationFrame(tick);
  }, [active]);

  useEffect(() => {
    if (!hovering || !settled) return;
    const flickerEnd = Date.now() + 800;
    const iv = setInterval(() => {
      if (Date.now() < flickerEnd) {
        setScore(Math.floor(Math.random() * 100));
      } else {
        clearInterval(iv);
        const from = Math.floor(Math.random() * 100);
        const settleStart = performance.now();
        const settle = (now: number) => {
          const p = Math.min((now - settleStart) / 400, 1);
          const eased = 1 - (1 - p) * (1 - p);
          setScore(Math.round(from + (87 - from) * eased));
          if (p < 1) requestAnimationFrame(settle);
        };
        requestAnimationFrame(settle);
      }
    }, 60);
    return () => clearInterval(iv);
  }, [hovering, settled]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      {/* Score number */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "2.8rem", fontWeight: 700,
          color: "#ff4f4f", lineHeight: 1, letterSpacing: "-0.03em",
          transition: hovering ? "none" : "color 0.3s",
        }}>
          {score}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", fontWeight: 600,
          letterSpacing: "0.12em", color: "#ff4f4f", marginTop: 6, opacity: 0.7,
        }}>
          RISK SCORE
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ flex: 1, maxWidth: 100 }}>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,79,79,0.1)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2, background: "#ff4f4f",
            width: `${score}%`,
            transition: hovering ? "width 0.06s linear" : "width 0.08s ease-out",
          }} />
        </div>
      </div>
    </div>
  );
}

/* ── Protect: Shield with pulse ─────────────────────────── */
function ProtectAnim({ active }: { active: boolean }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Pulse rings */}
      {[0, 1].map(i => (
        <div key={i} style={{
          position: "absolute",
          width: 56 + i * 24, height: 56 + i * 24,
          borderRadius: "50%",
          border: `1px solid rgba(34,197,94,${active ? 0.2 - i * 0.08 : 0.04})`,
          opacity: active ? 1 : 0,
          animation: active ? `shieldPulse 2.5s ease-in-out infinite ${i * 0.5}s` : "none",
          transition: "opacity 0.5s ease",
        }} />
      ))}
      {/* Shield icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: active ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
        border: `1.5px solid ${active ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.06)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.6s ease", zIndex: 2,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#22c55e" : "rgba(255,255,255,0.2)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.4s" }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      {/* Live dot */}
      {active && (
        <div style={{
          position: "absolute", top: 16, right: 20,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#22c55e",
            animation: "dotBlink 2s ease-in-out infinite",
          }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.55rem", color: "#22c55e", fontWeight: 600, letterSpacing: "0.1em" }}>LIVE</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP CARD — Uniform size, animation top, text bottom
   ══════════════════════════════════════════════════════════════ */
function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const renderAnim = () => {
    switch (step.animType) {
      case "paste": return <PasteAnim active={visible} />;
      case "analyze": return <AnalyzeAnim active={visible} />;
      case "review": return <ReviewAnim active={visible} hovering={hovering} />;
      case "protect": return <ProtectAnim active={visible} />;
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        background: hovering ? "var(--bg-card-hover, #1c1c1c)" : "var(--bg-card, #161616)",
        border: `1px solid ${hovering ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 16,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.12}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.12}s, background 0.3s ease, border-color 0.3s ease`,
        cursor: "default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Animation area (top) ────────────────── */}
      <div style={{
        height: 160,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        position: "relative",
        background: "rgba(255,255,255,0.01)",
      }}>
        {renderAnim()}
      </div>

      {/* ── Text content (bottom) ──────────────── */}
      <div style={{ padding: "24px 28px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Step number + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", fontWeight: 600,
            letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)",
          }}>
            {step.label}
          </span>
          <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: "italic", fontWeight: 500,
          fontSize: "1.2rem", lineHeight: 1.3,
          color: "var(--text-primary, #f5f5f5)",
          marginBottom: 10,
        }}>
          {step.title}
        </h3>

        {/* Description */}
        <p style={{
          color: "var(--text-secondary, #a3a3a3)",
          fontSize: "0.85rem", lineHeight: 1.65,
          margin: 0,
        }}>
          {step.desc}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN SECTION
   ══════════════════════════════════════════════════════════════ */
export default function HowItWorks() {
  const headlineRef = useRef<HTMLDivElement>(null);
  const [headlineVisible, setHeadlineVisible] = useState(false);

  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHeadlineVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const words = ["Paste.", "Analyze.", "Protect."];

  return (
    <section id="how" style={{ background: "#0a0a0a", padding: "120px 0" }} suppressHydrationWarning>
      {/* Keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanSweep {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(46px); }
        }
        @keyframes floatParticle0 {
          0%, 100% { transform: translate(-20px, -10px); opacity: 0; }
          50% { transform: translate(-30px, -25px); opacity: 0.6; }
        }
        @keyframes floatParticle1 {
          0%, 100% { transform: translate(20px, 5px); opacity: 0; }
          50% { transform: translate(35px, -15px); opacity: 0.5; }
        }
        @keyframes floatParticle2 {
          0%, 100% { transform: translate(-5px, 15px); opacity: 0; }
          50% { transform: translate(10px, -20px); opacity: 0.4; }
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
        @keyframes centerGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(79,143,255,0); }
          50% { box-shadow: 0 0 20px rgba(79,143,255,0.15); }
        }
        @keyframes shieldPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.12); opacity: 0.3; }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {/* Section label */}
        <p style={{
          color: "var(--text-muted, #666)", fontSize: "0.75rem", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase" as const,
          marginBottom: 20,
          opacity: headlineVisible ? 1 : 0, transition: "opacity 0.6s ease",
        }}>
          HOW IT WORKS
        </p>

        {/* Headline — staggered word drops */}
        <div ref={headlineRef} style={{ marginBottom: 16 }}>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic", fontWeight: 400,
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            lineHeight: 1.15, letterSpacing: "-0.025em",
            color: "#f5f5f5",
            display: "flex", flexWrap: "wrap", gap: "0 14px",
          }}>
            {words.map((word, i) => (
              <span key={i} style={{
                display: "inline-block",
                opacity: headlineVisible ? 1 : 0,
                transform: headlineVisible ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.3}s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.3}s`,
              }}>
                {word}
              </span>
            ))}
          </h2>
        </div>

        {/* Subtitle */}
        <p style={{
          color: "var(--text-secondary, #a3a3a3)", fontSize: "1.05rem",
          lineHeight: 1.7, maxWidth: 600, marginBottom: 48,
          opacity: headlineVisible ? 1 : 0,
          transform: headlineVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.6s ease 0.9s, transform 0.6s ease 0.9s",
        }}>
          Four steps. The AI does the forensics. You get the verdict.
        </p>

        {/* ── 2×2 Card Grid ─────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
        }}>
          {STEPS.map((step, i) => (
            <StepCard key={step.label} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
