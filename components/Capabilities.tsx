"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/* ── Card data ────────────────────────────────────────────── */
const CARDS = [
  { icon: "🔬", title: "AI Forensics", desc: "Grok-powered deep analysis" },
  { icon: "🔗", title: "URL Scanner", desc: "VirusTotal + Firecrawl" },
  { icon: "🛡️", title: "SPF/DKIM/DMARC", desc: "Authentication checks" },
  { icon: "👁️", title: "Watchdog", desc: "IMAP IDLE real-time" },
  { icon: "📎", title: "Attachment Scan", desc: "PDF, image, QR analysis" },
  { icon: "🔤", title: "Homograph Detection", desc: "Unicode lookalike domains" },
  { icon: "📸", title: "Safe Preview", desc: "Screenshot without clicking" },
  { icon: "🎭", title: "Brand Impersonation", desc: "Replica site detection" },
  { icon: "🔊", title: "Voice Verdict", desc: "Sarvam AI audio summary" },
];

/* ══════════════════════════════════════════════════════════════
   MAIN SECTION
   ══════════════════════════════════════════════════════════════ */
export default function Capabilities() {
  const [activeIndex, setActiveIndex] = useState(0);
  const headlineRef = useRef<HTMLDivElement>(null);
  const [headlineVisible, setHeadlineVisible] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Headline observer
  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setHeadlineVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Autoplay functionality
  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CARDS.length);
    }, 3000);
  }, []);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  const handleCardClick = (index: number) => {
    setActiveIndex(index);
    // Restart autoplay timer on manual interaction
    startAutoplay();
  };

  const words = ["What", "powers", "the", "agent?"];

  return (
    <section id="capabilities" className="cap-section" suppressHydrationWarning>
      <style dangerouslySetInnerHTML={{ __html: `
        .cap-section {
          background: #0a0a0a;
          padding: 120px 0;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1;
        }

        /* ── Perspective Grid Background ── */
        .cap-grid-bg {
          position: absolute;
          inset: -50% -50% 0 -50%; /* Cover lower half and extend beyond sides */
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 60px 60px;
          background-position: center bottom;
          transform: perspective(600px) rotateX(70deg) translateZ(0);
          transform-origin: center center;
          animation: gridMove 3s linear infinite;
          z-index: -2;
          mask-image: radial-gradient(ellipse at center 40%, black 10%, transparent 60%);
          -webkit-mask-image: radial-gradient(ellipse at center 40%, black 10%, transparent 60%);
        }

        /* Ambient glow for the grid horizon */
        .cap-grid-glow {
          position: absolute;
          width: 100%;
          height: 300px;
          top: 40%;
          left: 0;
          background: radial-gradient(ellipse at center, rgba(220, 220, 230, 0.05) 0%, transparent 70%);
          z-index: -1;
          pointer-events: none;
        }

        @keyframes gridMove {
          0% { transform: perspective(600px) rotateX(70deg) translateY(0); }
          100% { transform: perspective(600px) rotateX(70deg) translateY(60px); }
        }

        .slider-container {
          position: relative;
          width: 100%;
          max-width: 1200px;
          height: 320px;
          display: flex;
          justify-content: center;
          align-items: center;
          perspective: 1000px;
          margin-top: 40px;
        }

        .slider-card {
          position: absolute;
          width: 320px;
          height: 200px;
          border-radius: 16px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
          cursor: pointer;
          user-select: none;
        }

        .slider-card.active {
          background: #161616;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.05);
          z-index: 10;
        }

        .slider-card.inactive {
          background: #0d0d0d;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
        }

        .slider-icon {
          font-size: 32px;
          margin-bottom: 16px;
          transition: transform 0.3s ease;
        }
        
        .slider-card.active .slider-icon {
          transform: scale(1.1);
        }

        .slider-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 600;
          font-size: 1.25rem;
          color: #f5f5f5;
          margin: 0 0 8px;
        }

        .slider-desc {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #888;
          margin: 0;
          line-height: 1.5;
        }

        .slider-card.inactive .slider-title {
          color: #888;
        }
        
        .slider-card.inactive .slider-desc {
          color: #555;
        }
      `}} />

      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 2, textAlign: "center" }}>
        {/* Section label */}
        <p style={{
          color: "#666", fontSize: "0.75rem", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase" as const,
          marginBottom: 20,
          opacity: headlineVisible ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}>
          CAPABILITIES
        </p>

        {/* Headline — staggered word drops */}
        <div ref={headlineRef} style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic", fontWeight: 400,
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            lineHeight: 1.15, letterSpacing: "-0.025em",
            color: "#f5f5f5",
            display: "flex", flexWrap: "wrap", gap: "0 14px",
            margin: 0,
            justifyContent: "center"
          }}>
            {words.map((word, i) => (
              <span key={i} style={{
                display: "inline-block",
                opacity: headlineVisible ? 1 : 0,
                transform: headlineVisible ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.2}s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.2}s`,
              }}>
                {word}
              </span>
            ))}
          </h2>
        </div>

        {/* Subtitle */}
        <p style={{
          color: "#a3a3a3", fontSize: "1.05rem",
          lineHeight: 1.7, maxWidth: 600, margin: "0 auto 48px auto",
          opacity: headlineVisible ? 1 : 0,
          transform: headlineVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.6s ease 0.8s, transform 0.6s ease 0.8s",
        }}>
          9 security capabilities chained into one autonomous flow.
        </p>
      </div>

      {/* ── Slider Container ─────────────────────────────── */}
      <div 
        className="slider-container"
        onMouseEnter={stopAutoplay}
        onMouseLeave={startAutoplay}
      >
        {CARDS.map((card, i) => {
          // Calculate shortest distance in a circular array
          let diff = (i - activeIndex) % CARDS.length;
          if (diff > Math.floor(CARDS.length / 2)) diff -= CARDS.length;
          if (diff < -Math.floor(CARDS.length / 2)) diff += CARDS.length;

          const isActive = diff === 0;
          const absDiff = Math.abs(diff);

          // Only show cards within a certain range to keep the DOM clean and avoid weird stacking
          if (absDiff > 3) return null;

          // Transform logic
          const translateX = diff * 240; // Spacing between cards
          const scale = 1 - absDiff * 0.15; // 1, 0.85, 0.7, 0.55
          const opacity = absDiff === 0 ? 1 : absDiff === 1 ? 0.6 : absDiff === 2 ? 0.2 : 0;
          const zIndex = 10 - absDiff;

          return (
            <div
              key={card.title}
              className={`slider-card ${isActive ? "active" : "inactive"}`}
              onClick={() => handleCardClick(i)}
              style={{
                transform: `translateX(${translateX}px) scale(${scale})`,
                opacity: opacity,
                zIndex: zIndex,
                pointerEvents: opacity === 0 ? "none" : "auto"
              }}
            >
              <div className="slider-icon">{card.icon}</div>
              <h4 className="slider-title">{card.title}</h4>
              <p className="slider-desc">{card.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Slider dots indicator */}
      <div style={{ display: "flex", gap: 8, marginTop: 32, zIndex: 10 }}>
        {CARDS.map((_, i) => (
          <button
            key={i}
            onClick={() => handleCardClick(i)}
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i === activeIndex ? "#fff" : "rgba(255,255,255,0.2)",
              border: "none", padding: 0, cursor: "pointer",
              transition: "background 0.3s ease, transform 0.3s ease",
              transform: i === activeIndex ? "scale(1.2)" : "scale(1)",
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
