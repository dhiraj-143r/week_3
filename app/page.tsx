"use client";

import React, { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import HowItWorks from "@/components/HowItWorks";
import Capabilities from "@/components/Capabilities";

/* ── Animation helpers ──────────────────────────────────── */
const ease = [0.16, 1, 0.3, 1] as const;

function AnimSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease, delay } } }} className={className}>
      {children}
    </motion.div>
  );
}

const PROBLEMS = [
  { title: "No more missed phishing emails.", desc: "Attackers craft emails that look identical to real ones. You can't tell the difference — but AI can. Header anomalies, domain spoofing, and homograph tricks get caught instantly." },
  { title: "No more second-guessing links.", desc: "Is that URL safe? The AI scans every link through VirusTotal, unshortens redirects, takes safe screenshots, and checks for look-alike domains — all in seconds." },
  { title: "No more manual monitoring.", desc: "Connect your inbox once. The IMAP IDLE watchdog detects threats the moment they arrive — WhatsApp + email alerts fire instantly, 24/7." },
];



export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const COUNT = 450;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
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

  return (
    <main style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Particle Field (Stars) */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", filter: "blur(0px)", opacity: 0.7 }} />

      {/* ═══ NAVBAR ═══ */}
      <nav className="nav">
        <div className="nav-inner">
          <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.1rem" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="serif-italic" style={{ fontSize: "1.15rem" }}>Phish</span>
            <span style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>Filter</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="#how" className="btn-ghost">How it works</a>
            <a href="#capabilities" className="btn-ghost">Features</a>
            <Link href="/pricing" className="btn-ghost" style={{ textDecoration: "none" }}>Pricing</Link>
            <a href="#agent-api" className="btn-ghost">API</a>
            <Link href="/scan" className="btn-primary" style={{ padding: "10px 20px", fontSize: "0.85rem", textDecoration: "none" }}>
              Start scanning
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO — Full-screen animated blob background ═══ */}
      <section
        className="hero-blob-section"
        suppressHydrationWarning
        onMouseMove={(e) => {
          const el = e.currentTarget;
          const cx = e.clientX / window.innerWidth - 0.5;
          const cy = e.clientY / window.innerHeight - 0.5;
          el.style.setProperty("--px", `${cx}`);
          el.style.setProperty("--py", `${cy}`);
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .hero-blob-section {
            position: relative;
            width: 100%;
            height: 100vh;
            min-height: 600px;
            background: #000000ff;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          /* ── Blobs ─────────────────────────────── */
          .hero-blob {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            will-change: transform;
            animation-direction: alternate;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
          }
          .hero-blob-1 {
            width: 700px; height: 700px;
            background: radial-gradient(circle, rgba(140, 140, 145, 0.35), transparent 70%);
            filter: blur(15px); opacity: 0.8;
            top: -15%; left: -10%;
            animation: blobDrift1 5s ease-in-out infinite alternate;
          }
          .hero-blob-2 {
            width: 550px; height: 550px;
            background: radial-gradient(circle, rgba(72, 72, 74, 0.3), transparent 70%);
            filter: blur(15px); opacity: 0.75;
            bottom: -10%; right: -8%;
            animation: blobDrift2 6s ease-in-out infinite alternate;
            animation-delay: -2s;
          }
          .hero-blob-3 {
            width: 450px; height: 450px;
            background: radial-gradient(circle, rgba(72, 72, 74, 0.25), transparent 70%);
            filter: blur(15px); opacity: 0.7;
            top: 30%; left: 35%;
            animation: blobDrift3 4s ease-in-out infinite alternate;
            animation-delay: -3s;
          }
          .hero-blob-4 {
            width: 350px; height: 350px;
            background: radial-gradient(circle, rgba(62, 62, 64, 0.35), transparent 70%);
            filter: blur(15px); opacity: 0.8;
            top: 5%; right: 10%;
            animation: blobDrift4 7s ease-in-out infinite alternate;
            animation-delay: -1s;
          }
          .hero-blob-5 {
            width: 500px; height: 500px;
            background: radial-gradient(circle, rgba(68, 68, 70, 0.28), transparent 70%);
            filter: blur(20px); opacity: 0.7;
            bottom: 15%; left: -5%;
            animation: blobDrift5 5s ease-in-out infinite alternate;
            animation-delay: -1.5s;
          }
          .hero-blob-6 {
            width: 380px; height: 380px;
            background: radial-gradient(circle, rgba(64, 64, 65, 0.25), transparent 70%);
            filter: blur(15px); opacity: 0.65;
            top: -5%; right: 30%;
            animation: blobDrift6 4.5s ease-in-out infinite alternate;
            animation-delay: -3s;
          }
          .hero-blob-7 {
            width: 300px; height: 300px;
            background: radial-gradient(circle, rgba(62, 62, 64, 0.32), transparent 70%);
            filter: blur(15px); opacity: 0.75;
            bottom: 5%; right: 25%;
            animation: blobDrift7 6s ease-in-out infinite alternate;
            animation-delay: -0.5s;
          }

          @keyframes blobDrift1 {
            0%   { transform: translate(0, 0) scale(1); }
            100% { transform: translate(60px, 80px) scale(1.1); }
          }
          @keyframes blobDrift2 {
            0%   { transform: translate(0, 0) scale(1); }
            100% { transform: translate(-80px, -60px) scale(1.2); }
          }
          @keyframes blobDrift3 {
            0%   { transform: translate(0, 0) scale(1); }
            100% { transform: translate(40px, -70px) scale(0.9); }
          }
          @keyframes blobDrift4 {
            0%   { transform: translate(0, 0) scale(1); }
            100% { transform: translate(-50px, 90px) scale(1.15); }
          }
          @keyframes blobDrift5 {
            0%   { transform: translate(0, 0) scale(1); }
            100% { transform: translate(70px, -50px) scale(1.08); }
          }
          @keyframes blobDrift6 {
            0%   { transform: translate(0, 0) scale(1); }
            100% { transform: translate(-40px, 60px) scale(1.12); }
          }
          @keyframes blobDrift7 {
            0%   { transform: translate(0, 0) scale(1); }
            100% { transform: translate(55px, 40px) scale(0.92); }
          }

          /* ── Entrance animations ──────────────── */
          @keyframes heroFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes heroSlideUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes heroScaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes waveDraw {
            from { stroke-dashoffset: 200; }
            to   { stroke-dashoffset: 0; }
          }

          .hero-label {
            opacity: 0;
            animation: heroFadeIn 0.6s ease forwards;
            animation-delay: 0.2s;
          }
          .hero-wave {
            opacity: 0;
            animation: heroFadeIn 0.4s ease forwards;
            animation-delay: 0.35s;
          }
          .hero-wave path {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
            animation: waveDraw 0.8s ease forwards;
            animation-delay: 0.4s;
          }
          .hero-headline {
            opacity: 0;
            animation: heroSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            animation-delay: 0.6s;
          }
          .hero-subtitle {
            opacity: 0;
            animation: heroFadeIn 0.5s ease forwards;
            animation-delay: 1s;
          }
          .hero-cta {
            opacity: 0;
            animation: heroScaleIn 0.4s ease forwards;
            animation-delay: 1.2s;
          }

          /* ── Bottom bar ───────────────────────── */
          .hero-bottom-bar {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 40px;
            z-index: 3;
          }
          .hero-bottom-bar span {
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 0.8rem;
            color: rgba(255,255,255,0.5);
            letter-spacing: 0.03em;
          }

          /* ── Responsive ───────────────────────── */
          @media (max-width: 768px) {
            .hero-blob-1 { width: 420px; height: 420px; }
            .hero-blob-2 { width: 330px; height: 330px; }
            .hero-blob-3 { width: 270px; height: 270px; }
            .hero-blob-4 { width: 210px; height: 210px; }
            .hero-blob-5 { width: 300px; height: 300px; }
            .hero-blob-6 { width: 230px; height: 230px; }
            .hero-blob-7 { width: 180px; height: 180px; }
            .hero-bottom-bar { padding: 16px 20px; }
            .hero-bottom-bar span { font-size: 0.7rem; }
          }
        `}} />


        {/* Centered content */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 800, padding: "0 24px" }}>
          {/* Label */}
          <p className="hero-label" style={{
            fontSize: "0.7rem", fontWeight: 600,
            letterSpacing: "0.15em", textTransform: "uppercase" as const,
            color: "rgba(255,255,255,0.4)", marginBottom: 20,
          }}>
            PHISHFILTER · AI SECURITY AGENT
          </p>

          {/* Wavy SVG line */}
          <svg className="hero-wave" width="80" height="30" viewBox="0 0 80 30" fill="none" style={{ display: "block", margin: "0 auto 24px" }}>
            <path
              d="M0 15 Q10 5 20 15 Q30 25 40 15 Q50 5 60 15 Q70 25 80 15"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Headline */}
          <h1 className="hero-headline" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic", fontWeight: 700,
            fontSize: "clamp(3rem, 8vw, 6rem)",
            lineHeight: 1.08, letterSpacing: "-0.03em",
            color: "#fff", margin: "0 0 16px",
          }}>
            Paste. Analyze.<br />Protect.
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle" style={{
            fontSize: "1.1rem", color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7, maxWidth: 500, margin: "0 auto",
          }}>
            Four steps. The AI does the forensics. You get the verdict.
          </p>

          {/* CTA */}
          <div className="hero-cta" style={{ marginTop: 40 }}>
            <Link
              href="/scan"
              style={{
                display: "inline-block",
                background: "#fff", color: "#000000ff",
                borderRadius: 999, padding: "14px 32px",
                fontSize: "1rem", fontWeight: 600,
                textDecoration: "none", border: "none",
                transition: "background 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#e0e0e0"; (e.target as HTMLElement).style.transform = "scale(1.04)"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#fff"; (e.target as HTMLElement).style.transform = "scale(1)"; }}
            >
              → Try it free
            </Link>
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="hero-bottom-bar">
          <span>12+ Security Checks</span>
          <span>Real-time Monitoring</span>
          <span>AI-Powered Verdicts</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#5934FF', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.06em' }}>LOCUS</span>
            Pay with USDC
          </span>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ THE PROBLEM — Aurora Borealis Background ═══ */}
      <section id="problems" className="section" style={{ position: "relative", overflow: "hidden", background: "#0a0a0a" }} suppressHydrationWarning>
        <style dangerouslySetInnerHTML={{ __html: `
          /* ── Aurora bands ──────────────────────── */
          .aurora-band {
            position: absolute;
            width: 160%;
            left: -30%;
            border-radius: 50%;
            pointer-events: none;
            mix-blend-mode: screen;
            z-index: 0;
          }
          .aurora-band-1 {
            background: rgba(0, 0, 0, 0.35);
            top: 5%; height: 220px;
            filter: blur(25px); opacity: 0.25;
            animation: aurora1 18s ease-in-out infinite alternate;
          }
          .aurora-band-2 {
            background: rgba(7, 7, 7, 0.3);
            top: 20%; height: 200px;
            filter: blur(25px); opacity: 0.22;
            animation: aurora2 22s ease-in-out infinite alternate;
            animation-delay: -5s;
          }
          .aurora-band-3 {
            background: rgba(0, 0, 0, 0.28);
            top: 38%; height: 260px;
            filter: blur(25px); opacity: 0.24;
            animation: aurora3 16s ease-in-out infinite alternate;
            animation-delay: -9s;
          }
          .aurora-band-4 {
            background: rgba(215,215,230,0.32);
            top: 55%; height: 180px;
            filter: blur(25px); opacity: 0.20;
            animation: aurora4 25s ease-in-out infinite alternate;
            animation-delay: -3s;
          }
          .aurora-band-5 {
            background: rgba(240,240,250,0.26);
            top: 70%; height: 240px;
            filter: blur(25px); opacity: 0.28;
            animation: aurora5 20s ease-in-out infinite alternate;
            animation-delay: -12s;
          }

          @keyframes aurora1 {
            0%   { transform: translateX(-5%) translateY(0) scaleY(1); opacity: 0.13; }
            33%  { transform: translateX(2%) translateY(-18px) scaleY(1.25); opacity: 0.17; }
            66%  { transform: translateX(6%) translateY(8px) scaleY(0.9); opacity: 0.11; }
            100% { transform: translateX(-3%) translateY(-10px) scaleY(1.1); opacity: 0.15; }
          }
          @keyframes aurora2 {
            0%   { transform: translateX(3%) translateY(0) scaleY(1); opacity: 0.14; }
            25%  { transform: translateX(-4%) translateY(-15px) scaleY(1.3); opacity: 0.18; }
            50%  { transform: translateX(7%) translateY(12px) scaleY(0.85); opacity: 0.10; }
            75%  { transform: translateX(-2%) translateY(-8px) scaleY(1.15); opacity: 0.16; }
            100% { transform: translateX(5%) translateY(5px) scaleY(1.05); opacity: 0.13; }
          }
          @keyframes aurora3 {
            0%   { transform: translateX(-3%) translateY(5px) scaleY(1); opacity: 0.16; }
            33%  { transform: translateX(5%) translateY(-20px) scaleY(1.2); opacity: 0.12; }
            66%  { transform: translateX(-6%) translateY(15px) scaleY(0.88); opacity: 0.18; }
            100% { transform: translateX(8%) translateY(-5px) scaleY(1.08); opacity: 0.14; }
          }
          @keyframes aurora4 {
            0%   { transform: translateX(4%) translateY(0) scaleY(1); opacity: 0.12; }
            20%  { transform: translateX(-5%) translateY(-12px) scaleY(1.28); opacity: 0.16; }
            50%  { transform: translateX(3%) translateY(10px) scaleY(0.9); opacity: 0.10; }
            80%  { transform: translateX(-7%) translateY(-15px) scaleY(1.18); opacity: 0.15; }
            100% { transform: translateX(2%) translateY(8px) scaleY(0.95); opacity: 0.13; }
          }
          @keyframes aurora5 {
            0%   { transform: translateX(-4%) translateY(8px) scaleY(1); opacity: 0.18; }
            25%  { transform: translateX(6%) translateY(-14px) scaleY(1.22); opacity: 0.13; }
            50%  { transform: translateX(-2%) translateY(18px) scaleY(0.85); opacity: 0.17; }
            75%  { transform: translateX(8%) translateY(-6px) scaleY(1.1); opacity: 0.11; }
            100% { transform: translateX(-5%) translateY(10px) scaleY(1.05); opacity: 0.16; }
          }

          /* ── Aurora overlay gradient ──────────── */
          .aurora-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to bottom,
              rgba(0,0,0,0.5) 0%,
              rgba(0,0,0,0.1) 40%,
              rgba(0,0,0,0.1) 60%,
              rgba(0,0,0,0.6) 100%
            );
            z-index: 1;
            pointer-events: none;
          }

          /* ── Frosted glass problem cards ──────── */
          .problem-card-aurora {
            background: rgba(255,255,255,0.04);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 0.5px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            padding: 28px;
            transition: background 0.3s ease, border-color 0.3s ease;
          }
          .problem-card-aurora:hover {
            background: rgba(255,255,255,0.07);
            border-color: rgba(255,255,255,0.15);
          }
          .problem-card-aurora h3 {
            font-family: 'Playfair Display', Georgia, serif;
            font-style: italic;
            font-weight: 400;
            font-size: 1.15rem;
            color: #fff;
            margin: 0 0 12px;
          }

          /* ── Mobile perf ──────────────────────── */
          @media (max-width: 768px) {
            .aurora-band { filter: blur(20px); }
            .aurora-band-1 { opacity: 0.10; }
            .aurora-band-2 { opacity: 0.10; }
            .aurora-band-3 { opacity: 0.11; }
            .aurora-band-4 { opacity: 0.08; }
            .aurora-band-5 { opacity: 0.13; }
          }
        `}} />

        {/* Aurora bands */}
        <div className="aurora-band aurora-band-1" />
        <div className="aurora-band aurora-band-2" />
        <div className="aurora-band aurora-band-3" />
        <div className="aurora-band aurora-band-4" />
        <div className="aurora-band aurora-band-5" />

        {/* Edge-darkening overlay */}
        <div className="aurora-overlay" />

        {/* Content — z-index 2 */}
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <AnimSection><p className="section-label" style={{ color: "rgba(255,255,255,0.45)" }}>THE PROBLEM</p></AnimSection>
          <AnimSection delay={0.1}>
            <h2 className="section-heading" style={{ maxWidth: 700, color: "#fff" }}>
              Phishing attacks succeed <span className="serif-italic">because you can&apos;t see them coming.</span>
            </h2>
          </AnimSection>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {PROBLEMS.map((p, i) => (
              <AnimSection key={i} delay={0.15 + i * 0.1}>
                <div className="problem-card-aurora">
                  <h3>{p.title}</h3>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ HOW IT WORKS (Animated) ═══ */}
      <HowItWorks />

      <div className="section-divider" />

      {/* ═══ CAPABILITIES (Animated) ═══ */}
      <Capabilities />

      <div className="section-divider" />

      {/* ═══ CTA FOOTER ═══ */}
      <section className="section" style={{ paddingBottom: 120 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <AnimSection>
            <h2 className="cta-heading" style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 20 }}>
              Your inbox, protected<br />autonomously.
            </h2>
          </AnimSection>
          <AnimSection delay={0.1}>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: 600, margin: "0 auto 36px", lineHeight: 1.7 }}>
              Paste an email for instant forensic analysis. Connect your inbox for real-time protection. Cancel anytime.
            </p>
          </AnimSection>
          <AnimSection delay={0.2}>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <Link href="/scan" className="btn-primary" style={{ padding: "16px 32px", textDecoration: "none" }}>
                Start scanning
              </Link>
              <Link href="/pricing" className="btn-secondary" style={{ padding: "16px 32px", textDecoration: "none" }}>View pricing</Link>
            </div>
          </AnimSection>

          {/* ═══ AGENT API SECTION ═══ */}
          <div id="agent-api" style={{ marginTop: 80, paddingTop: 48, borderTop: "1px solid var(--border)" }}>
            <AnimSection>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>For AI Agents & Developers</h3>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 500, margin: "0 auto 28px", lineHeight: 1.6 }}>
                PhishFilter is machine-readable. AI agents can discover, purchase credits, and scan emails — all programmatically via USDC.
              </p>
            </AnimSection>
            <AnimSection delay={0.1}>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12, maxWidth: 700, margin: "0 auto",
              }}>
                {[
                  { label: "Service Catalog", desc: "Capabilities & pricing", href: "/api/agent/services", icon: "📋" },
                  { label: "Agent Purchase", desc: "Buy credits with USDC", href: "/api/agent/purchase", icon: "💳" },
                  { label: "Agent Scan API", desc: "Submit emails for analysis", href: "/api/agent/scan", icon: "🔍" },
                  { label: "Skill File", desc: "Machine-readable descriptor", href: "/skill.md", icon: "📄" },
                  { label: "AI Plugin", desc: "OpenAI plugin manifest", href: "/.well-known/ai-plugin.json", icon: "🔌" },
                  { label: "OpenAPI Spec", desc: "Full API specification", href: "/.well-known/openapi.json", icon: "📐" },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 18px", borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      textDecoration: "none", color: "#fff",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(89,52,255,0.08)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(89,52,255,0.25)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{item.desc}</div>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>→</span>
                  </a>
                ))}
              </div>
            </AnimSection>
            <AnimSection delay={0.2}>
              <div style={{
                marginTop: 24, padding: "14px 20px", borderRadius: 10,
                background: "rgba(89,52,255,0.06)", border: "1px solid rgba(89,52,255,0.15)",
                maxWidth: 500, margin: "24px auto 0",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ color: "#5934FF", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>x402</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  Scan endpoint returns HTTP 402 with payment instructions when credits are exhausted
                </span>
              </div>
            </AnimSection>
          </div>

          {/* Footer bar */}
          <div style={{ marginTop: 80, paddingTop: 32, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="serif-italic" style={{ fontSize: "1rem" }}>Phish</span>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>Filter</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Grok AI · VirusTotal · Firecrawl · <span style={{ color: '#5934FF', fontWeight: 600 }}>Locus</span></span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
