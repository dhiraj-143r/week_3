"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

/* ════════════════════════════════════════════════════════════════
   PHISHFILTER — SCANNING LOADER PAGE
   A dramatic, security-themed full-screen loading experience.
   ════════════════════════════════════════════════════════════════ */

const SCAN_STAGES = [
  { label: "Parsing email headers...", icon: "📧", duration: 2200 },
  { label: "Checking SPF / DKIM / DMARC records...", icon: "🔐", duration: 2400 },
  { label: "Scanning embedded URLs via VirusTotal...", icon: "🔗", duration: 3000 },
  { label: "Analyzing sender reputation...", icon: "🕵️", duration: 1800 },
  { label: "Running AI forensic analysis...", icon: "🧠", duration: 2500 },
  { label: "Detecting homograph attacks...", icon: "🔤", duration: 1500 },
  { label: "Compiling forensic report...", icon: "📋", duration: 1800 },
];

export default function ScanLoadingPage() {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasFiredRef = useRef(false);

  /* ── Canvas Particle Field ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 450;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ── Stage progression & API call ── */
  useEffect(() => {
    // Guard against React StrictMode double-firing
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    // Advance stages gradually while waiting
    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < SCAN_STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 2200);

    // Smooth progress bar
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        // Cap at 92% until scan is actually complete
        if (prev >= 92) return 92;
        return prev + 0.5;
      });
    }, 80);

    // Fire the actual API call
    const emailContent = sessionStorage.getItem("phishfilter_email_to_scan");
    const userEmail = sessionStorage.getItem("phishfilter_notify_email") || "";
    const userPhone = sessionStorage.getItem("phishfilter_notify_phone") || "";
    if (emailContent) {
      // Only remove AFTER successfully reading
      sessionStorage.removeItem("phishfilter_email_to_scan");
      sessionStorage.removeItem("phishfilter_notify_email");
      sessionStorage.removeItem("phishfilter_notify_phone");
      
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailContent, userEmail, userPhone }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) throw new Error(data.error || "Analysis failed");
          sessionStorage.setItem("phishfilter_report", JSON.stringify(data));
          setScanComplete(true);
        })
        .catch((err) => {
          console.error("[Scan] Error:", err);
          setScanError(err.message || "Scan failed. Please try again.");
        });
    } else {
      // No email to scan — check if report already exists
      const existing = sessionStorage.getItem("phishfilter_report");
      if (existing) {
        setScanComplete(true);
      } else {
        setScanError("No email content found. Please go back and paste an email.");
      }
    }

    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
    };
  }, []);

  /* ── When scan completes, animate to 100% and redirect ── */
  useEffect(() => {
    if (!scanComplete) return;
    // Rapid fill to 100%
    const fill = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(fill);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    setCurrentStage(SCAN_STAGES.length - 1);

    const redirect = setTimeout(() => {
      router.push("/scan/report");
    }, 1500);

    return () => {
      clearInterval(fill);
      clearTimeout(redirect);
    };
  }, [scanComplete, router]);

  /* ── Error redirect ── */
  useEffect(() => {
    if (!scanError) return;
    const timeout = setTimeout(() => {
      router.push("/scan");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [scanError, router]);

  const stage = SCAN_STAGES[currentStage];
  const displayLabel = scanError ? scanError : stage.label;
  const displayIcon = scanError ? "❌" : stage.icon;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        body { margin: 0; background: #0a0a0a; overflow: hidden; }

        .loader-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; filter: blur(0px); opacity: 0.7; }
        .loader-vignette { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 30%, #0a0a0a 100%); }

        .loader-page {
          position: fixed; inset: 0; z-index: 1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
        }

        /* ── Shield Animation ── */
        .shield-container {
          position: relative; width: 120px; height: 120px;
          margin-bottom: 48px;
        }

        .shield-svg {
          width: 120px; height: 120px;
          filter: drop-shadow(0 0 20px rgba(220, 220, 230, 0.15));
        }

        .shield-path {
          fill: none; stroke: rgba(220, 220, 230, 0.8); stroke-width: 1.5;
          stroke-dasharray: 200; stroke-dashoffset: 200;
          animation: shieldDraw 2s ease forwards, shieldPulse 3s ease-in-out 2s infinite;
        }

        .shield-check {
          fill: none; stroke: rgba(220, 220, 230, 0.9); stroke-width: 2;
          stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 30; stroke-dashoffset: 30;
          animation: checkDraw 0.6s ease 1.8s forwards;
        }

        @keyframes shieldDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes shieldPulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(220, 220, 230, 0.1)); }
          50% { filter: drop-shadow(0 0 24px rgba(220, 220, 230, 0.3)); }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }

        /* Rotating scan ring */
        .scan-ring {
          position: absolute; inset: -20px; border-radius: 50%;
          border: 1px solid rgba(220, 220, 230, 0.08);
          border-top-color: rgba(220, 220, 230, 0.5);
          animation: ringRotate 2s linear infinite;
        }
        .scan-ring-2 {
          position: absolute; inset: -35px; border-radius: 50%;
          border: 1px solid rgba(220, 220, 230, 0.04);
          border-bottom-color: rgba(220, 220, 230, 0.25);
          animation: ringRotate 3.5s linear infinite reverse;
        }

        @keyframes ringRotate {
          to { transform: rotate(360deg); }
        }

        /* ── Text ── */
        .loader-brand {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic; font-weight: 400;
          font-size: 2rem; letter-spacing: -0.02em;
          margin-bottom: 8px;
          opacity: 0; animation: fadeUp 0.6s ease 0.3s forwards;
        }
        .loader-brand span:first-child { color: rgba(220,220,230,0.9); }
        .loader-brand span:last-child { color: rgba(255,255,255,0.5); font-weight: 300; }

        .loader-stage {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.95rem; color: rgba(255,255,255,0.5);
          margin-bottom: 40px; min-height: 28px;
          opacity: 0; animation: fadeUp 0.5s ease 0.6s forwards;
        }
        .stage-icon { font-size: 1.1rem; transition: transform 0.3s ease; }
        .stage-label {
          transition: opacity 0.3s ease;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.82rem; letter-spacing: 0.02em;
        }

        /* ── Progress Bar ── */
        .progress-container {
          width: 380px; max-width: 80vw;
          opacity: 0; animation: fadeUp 0.5s ease 0.9s forwards;
        }
        .progress-track {
          height: 3px; background: rgba(255,255,255,0.06);
          border-radius: 4px; overflow: hidden; position: relative;
        }
        .progress-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, rgba(220,220,230,0.3), rgba(220,220,230,0.8));
          transition: width 0.3s ease;
          box-shadow: 0 0 12px rgba(220,220,230,0.2);
          position: relative;
        }
        .progress-fill::after {
          content: ''; position: absolute; right: 0; top: -2px;
          width: 7px; height: 7px; border-radius: 50%;
          background: rgba(220,220,230,0.9);
          box-shadow: 0 0 12px rgba(220,220,230,0.5);
        }
        .progress-info {
          display: flex; justify-content: space-between;
          margin-top: 12px; font-size: 0.72rem;
          color: rgba(255,255,255,0.25);
          font-family: 'SF Mono', 'Fira Code', monospace;
          letter-spacing: 0.04em;
        }

        /* ── Scan Lines Effect ── */
        .scan-lines {
          position: fixed; inset: 0; z-index: 2; pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent 0px, transparent 2px,
            rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px
          );
        }

        /* ── Data Stream (left side decoration) ── */
        .data-stream {
          position: fixed; left: 60px; top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; gap: 6px;
          opacity: 0.15; z-index: 1;
        }
        .data-line {
          height: 1px; background: rgba(220,220,230,0.6);
          animation: dataFlicker 2s ease infinite;
          border-radius: 1px;
        }

        .data-stream-right {
          position: fixed; right: 60px; top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; gap: 6px;
          opacity: 0.15; z-index: 1;
        }

        @keyframes dataFlicker {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Complete state */
        .loader-complete .shield-path { stroke: rgba(34,197,94,0.8); }
        .loader-complete .shield-check { stroke: rgba(34,197,94,0.9); }
        .loader-complete .scan-ring { border-top-color: rgba(34,197,94,0.5); }
        .loader-complete .scan-ring-2 { border-bottom-color: rgba(34,197,94,0.25); }
        .loader-complete .progress-fill {
          background: linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.8));
          box-shadow: 0 0 12px rgba(34,197,94,0.2);
        }
        .loader-complete .progress-fill::after {
          background: rgba(34,197,94,0.9);
          box-shadow: 0 0 12px rgba(34,197,94,0.5);
        }

        @media (max-width: 768px) {
          .data-stream, .data-stream-right { display: none; }
          .progress-container { width: 280px; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
        }
      `}} />

      <canvas ref={canvasRef} className="loader-canvas" />
      <div className="loader-vignette" />
      <div className="scan-lines" />

      {/* Data stream decorations */}
      <div className="data-stream">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="data-line"
            style={{
              width: `${Math.random() * 60 + 20}px`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      <div className="data-stream-right">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="data-line"
            style={{
              width: `${Math.random() * 60 + 20}px`,
              animationDelay: `${i * 0.18 + 0.5}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className={`loader-page ${scanComplete ? 'loader-complete' : ''}`}>

        {/* Shield with scan rings */}
        <div className="shield-container">
          <div className="scan-ring" />
          <div className="scan-ring-2" />
          <svg className="shield-svg" viewBox="0 0 24 24">
            <path
              className="shield-path"
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            />
            <path
              className="shield-check"
              d="M9 12l2 2 4-4"
            />
          </svg>
        </div>

        {/* Brand */}
        <div className="loader-brand">
          <span>Phish</span><span>Filter</span>
        </div>

        {/* Current stage */}
        <div className="loader-stage">
          <span className="stage-icon" key={scanError ? 'error' : currentStage}>{displayIcon}</span>
          <span className="stage-label" style={scanError ? { color: 'rgba(239,68,68,0.8)' } : {}}>{displayLabel}</span>
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-info">
            <span>STAGE {currentStage + 1} OF {SCAN_STAGES.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

      </div>
    </>
  );
}
