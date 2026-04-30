"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

/* ════════════════════════════════════════════════════════════════
   PHISHFILTER — PAYMENT SUCCESS PAGE
   Animated confirmation after successful Locus Checkout payment.
   ════════════════════════════════════════════════════════════════ */

function SuccessContent() {
  const searchParams = useSearchParams();
  const [confetti, setConfetti] = useState<Array<{ x: number; y: number; r: number; color: string; vx: number; vy: number; alpha: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sessionId = searchParams.get("session_id") || "";

  // Add credits client-side (in case webhook hasn't fired yet)
  useEffect(() => {
    const creditToken = localStorage.getItem("phishfilter_credit_token");
    if (creditToken) {
      // Give a small buffer of demo credits on success page visit
      fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: 1, token: creditToken }),
      }).catch(() => {});
    }
  }, []);

  // Confetti animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#06b6d4", "#0891b2", "#22c55e", "#f59e0b", "#ef4444", "#38bdf8", "#d97706"];
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      r: Math.random() * 6 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 1,
      alpha: 1,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.rotation += p.rotSpeed;
        if (p.y > canvas.height + 20) p.alpha = 0;

        if (p.alpha > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 2.5);
          ctx.restore();
        }
      }
      if (pieces.some((p) => p.alpha > 0)) {
        animId = requestAnimationFrame(draw);
      }
    };

    setTimeout(() => draw(), 300);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body { margin: 0; background: #0a0a0a; overflow: hidden; }

        .success-canvas { position: fixed; inset: 0; z-index: 5; pointer-events: none; }
        .success-vignette { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 30%, #0a0a0a 100%); }

        .success-page {
          position: fixed; inset: 0; z-index: 2;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: system-ui, -apple-system, sans-serif; color: #fff;
        }

        .success-checkmark {
          width: 100px; height: 100px; border-radius: 50%;
          background: rgba(34,197,94,0.1); border: 2px solid rgba(34,197,94,0.3);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 32px;
          animation: checkPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .success-checkmark svg {
          width: 48px; height: 48px; color: #22c55e;
        }
        .check-path {
          stroke-dasharray: 50; stroke-dashoffset: 50;
          animation: checkDraw 0.5s ease 0.4s forwards;
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }

        .success-title {
          font-family: Georgia, serif; font-style: italic;
          font-size: 2rem; margin: 0 0 8px; font-weight: 400;
          opacity: 0; animation: fadeUp 0.5s ease 0.3s forwards;
        }
        .success-subtitle {
          font-size: 15px; color: rgba(255,255,255,0.6); margin: 0 0 32px;
          opacity: 0; animation: fadeUp 0.5s ease 0.5s forwards;
        }

        .success-details {
          display: flex; gap: 16px; margin-bottom: 40px;
          opacity: 0; animation: fadeUp 0.5s ease 0.6s forwards;
        }
        .success-detail {
          padding: 12px 24px; border-radius: 12px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          text-align: center;
        }
        .success-detail-label {
          font-size: 10px; letter-spacing: 0.12em; color: rgba(255,255,255,0.5);
          text-transform: uppercase; margin-bottom: 6px; font-weight: 600;
        }
        .success-detail-value {
          font-size: 16px; color: #fff; font-weight: 600;
        }
        .success-detail-value.green { color: #22c55e; }
        .success-detail-value.purple { color: #06b6d4; }

        .success-actions {
          display: flex; gap: 16px;
          opacity: 0; animation: fadeUp 0.5s ease 0.7s forwards;
        }
        .success-btn {
          padding: 14px 32px; border-radius: 12px; font-size: 14px;
          font-weight: 600; cursor: pointer; transition: all 0.3s;
          text-decoration: none; display: flex; align-items: center; gap: 8px;
        }
        .success-btn.primary {
          background: linear-gradient(180deg, #06b6d4 0%, #0891b2 100%);
          color: #fff; border: none;
          box-shadow: 0 4px 20px rgba(6,182,212,0.3);
        }
        .success-btn.primary:hover {
          box-shadow: 0 6px 30px rgba(6,182,212,0.45);
          transform: translateY(-2px);
        }
        .success-btn.secondary {
          background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .success-btn.secondary:hover {
          background: rgba(255,255,255,0.08); color: #fff;
          transform: translateY(-1px);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .success-details { flex-direction: column; }
          .success-actions { flex-direction: column; width: 280px; }
          .success-btn { justify-content: center; }
        }
      `,
        }}
      />

      <canvas ref={canvasRef} className="success-canvas" />
      <div className="success-vignette" />

      <div className="success-page">
        <motion.div
          className="success-checkmark"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path className="check-path" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <h1 className="success-title">Payment Confirmed</h1>
        <p className="success-subtitle">
          Your USDC payment has been confirmed on-chain. Credits are ready.
        </p>

        <div className="success-details">
          <div className="success-detail">
            <div className="success-detail-label">Status</div>
            <div className="success-detail-value green">✓ Paid</div>
          </div>
          <div className="success-detail">
            <div className="success-detail-label">Currency</div>
            <div className="success-detail-value">USDC</div>
          </div>
          <div className="success-detail">
            <div className="success-detail-label">Network</div>
            <div className="success-detail-value purple">Base</div>
          </div>
          {sessionId && (
            <div className="success-detail">
              <div className="success-detail-label">Session</div>
              <div className="success-detail-value" style={{ fontSize: 12, fontFamily: "monospace" }}>
                {sessionId.slice(0, 8)}...
              </div>
            </div>
          )}
        </div>

        <div className="success-actions">
          <Link href="/scan" className="success-btn primary">
            🛡️ Start Scanning
          </Link>
          <Link href="/pricing" className="success-btn secondary">
            View Plans
          </Link>
        </div>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0a0a0a', height: '100vh' }} />}>
      <SuccessContent />
    </Suspense>
  );
}
