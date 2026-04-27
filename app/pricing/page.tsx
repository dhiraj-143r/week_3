"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

/* ════════════════════════════════════════════════════════════════
   PHISHFILTER — PRICING PAGE
   Premium dark UI with glassmorphism pricing cards, particle
   field, and Locus Checkout integration.
   ════════════════════════════════════════════════════════════════ */

interface PlanData {
  id: string;
  name: string;
  price: string;
  credits: number;
  description: string;
  features: string[];
  popular?: boolean;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [creditInfo, setCreditInfo] = useState<{
    credits: number;
    isPro: boolean;
    freeScansRemaining: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch plans and credit info
  useEffect(() => {
    fetch("/api/checkout/create")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => {});

    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => setCreditInfo(d))
      .catch(() => {});
  }, []);

  // Particle field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const COUNT = 350;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.4,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.4 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
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
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handlePurchase = async (planId: string) => {
    setLoadingPlan(planId);
    const t = toast.loading("Creating checkout session...");

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Failed to create session");

      toast.success("Redirecting to Locus Checkout...", { id: t });

      // Store credit token for later
      if (data.creditToken) {
        localStorage.setItem("phishfilter_credit_token", data.creditToken);
      }

      // Redirect to Locus Checkout
      setTimeout(() => {
        window.location.href = data.checkoutUrl;
      }, 500);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Checkout failed", { id: t });
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body { margin: 0; background: #0a0a0a; }

        .pricing-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.7; }
        .pricing-vignette { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 30%, #0a0a0a 100%); }

        .pricing-nav {
          height: 56px; background: rgba(10,10,10,0.85); backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0 48px; display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 10;
        }
        .pricing-logo { text-decoration: none; font-size: 18px; display: flex; gap: 4px; }
        .pricing-logo-p { font-family: Georgia, serif; font-style: italic; color: #fff; }
        .pricing-logo-f { font-weight: 700; color: rgba(255,255,255,0.5); }
        .pricing-nav-links { display: flex; align-items: center; gap: 24px; }
        .pricing-nav-links a {
          font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; transition: 0.2s;
        }
        .pricing-nav-links a:hover { color: rgba(255,255,255,0.8); }

        .credit-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 8px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
          font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 500;
        }
        .credit-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
        .credit-badge.pro { border-color: rgba(65,1,246,0.3); background: rgba(65,1,246,0.1); }
        .credit-badge.pro .dot { background: #5934FF; }

        .pricing-container {
          max-width: 1200px; margin: 0 auto; padding: 80px 40px 100px;
          position: relative; z-index: 2;
        }

        .pricing-header { text-align: center; margin-bottom: 64px; }
        .pricing-label {
          font-size: 11px; letter-spacing: 0.2em; color: rgba(255,255,255,0.3);
          text-transform: uppercase; margin-bottom: 16px; font-weight: 600;
        }
        .pricing-title {
          font-family: Georgia, 'Playfair Display', serif; font-style: italic;
          font-size: clamp(2rem, 5vw, 3.5rem); color: #fff; margin: 0 0 16px;
          font-weight: 400; line-height: 1.15;
        }
        .pricing-subtitle {
          font-size: 15px; color: rgba(255,255,255,0.4); max-width: 520px; margin: 0 auto;
          line-height: 1.7;
        }
        .pricing-free-note {
          display: inline-flex; align-items: center; gap: 8px;
          margin-top: 20px; padding: 8px 20px; border-radius: 20px;
          background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.15);
          font-size: 13px; color: rgba(34,197,94,0.8); font-weight: 500;
        }

        .pricing-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 24px; align-items: stretch;
        }

        .plan-card {
          position: relative;
          background: rgba(17,17,17,0.7); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 40px 32px;
          display: flex; flex-direction: column;
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .plan-card:hover {
          transform: translateY(-6px);
          border-color: rgba(255,255,255,0.12);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(65,1,246,0.05);
        }
        .plan-card.popular {
          border-color: rgba(65,1,246,0.3);
          box-shadow: 0 0 40px rgba(65,1,246,0.08);
        }
        .plan-card.popular:hover {
          border-color: rgba(65,1,246,0.5);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 60px rgba(65,1,246,0.12);
        }
        .plan-card.popular::before {
          content: '';
          position: absolute; inset: -1px; border-radius: 20px;
          background: linear-gradient(135deg, rgba(65,1,246,0.2), transparent 60%);
          z-index: -1;
        }

        .popular-badge {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          padding: 4px 16px; border-radius: 12px;
          background: linear-gradient(180deg, #5934FF 0%, #4101F6 100%);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
          color: #fff; text-transform: uppercase; white-space: nowrap;
        }

        .plan-name {
          font-size: 18px; font-weight: 600; color: #fff; margin: 0 0 6px;
        }
        .plan-desc {
          font-size: 13px; color: rgba(255,255,255,0.35); margin: 0 0 28px;
        }
        .plan-price-row {
          display: flex; align-items: baseline; gap: 6px; margin-bottom: 32px;
        }
        .plan-currency {
          font-size: 16px; color: rgba(255,255,255,0.4); font-weight: 500;
        }
        .plan-amount {
          font-size: 48px; font-weight: 700; color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
          letter-spacing: -0.03em; line-height: 1;
        }
        .plan-period {
          font-size: 14px; color: rgba(255,255,255,0.25); font-weight: 400;
        }

        .plan-features {
          list-style: none; padding: 0; margin: 0 0 32px;
          flex: 1;
        }
        .plan-features li {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 13px; color: rgba(255,255,255,0.5);
          padding: 8px 0; line-height: 1.5;
        }
        .plan-features li .check {
          flex-shrink: 0; width: 16px; height: 16px; margin-top: 1px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: rgba(34,197,94,0.12); color: #22c55e; font-size: 9px;
        }
        .popular .plan-features li .check {
          background: rgba(65,1,246,0.15); color: #5934FF;
        }

        .plan-btn {
          width: 100%; padding: 14px 0; border-radius: 12px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.3s ease; border: none; letter-spacing: 0.02em;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .plan-btn.default {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
        }
        .plan-btn.default:hover {
          background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);
          color: #fff; transform: translateY(-1px);
        }
        .plan-btn.primary {
          background: linear-gradient(180deg, #5934FF 0%, #4101F6 100%);
          color: #fff; box-shadow: 0 4px 20px rgba(65,1,246,0.3);
        }
        .plan-btn.primary:hover {
          box-shadow: 0 6px 30px rgba(65,1,246,0.45);
          transform: translateY(-2px);
        }
        .plan-btn:disabled {
          opacity: 0.6; cursor: not-allowed; transform: none !important;
        }

        .plan-btn .spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pricing-footer {
          text-align: center; margin-top: 64px;
        }
        .powered-by {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 10px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          font-size: 12px; color: rgba(255,255,255,0.3);
        }
        .powered-by .locus-logo {
          font-weight: 700; color: #5934FF; letter-spacing: 0.05em;
        }
        .usdc-badge {
          display: inline-flex; align-items: center; gap: 6px;
          margin-left: 12px; padding: 4px 10px; border-radius: 6px;
          background: rgba(38,132,255,0.08); border: 1px solid rgba(38,132,255,0.15);
          font-size: 11px; color: rgba(38,132,255,0.7); font-weight: 600;
        }

        .pricing-trust {
          display: flex; justify-content: center; gap: 32px;
          margin-top: 24px; flex-wrap: wrap;
        }
        .trust-item {
          font-size: 12px; color: rgba(255,255,255,0.2);
          display: flex; align-items: center; gap: 6px;
        }

        @media (max-width: 900px) {
          .pricing-grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; }
          .pricing-container { padding: 48px 24px 80px; }
          .pricing-nav { padding: 0 24px; }
        }
      `,
        }}
      />

      <canvas ref={canvasRef} className="pricing-canvas" />
      <div className="pricing-vignette" />

      {/* NAV */}
      <nav className="pricing-nav">
        <Link href="/" className="pricing-logo">
          <span className="pricing-logo-p">Phish</span>
          <span className="pricing-logo-f">Filter</span>
        </Link>
        <div className="pricing-nav-links">
          <Link href="/scan">Scanner</Link>
          <Link href="/#how">How it works</Link>
          {creditInfo && (
            <div className={`credit-badge ${creditInfo.isPro ? "pro" : ""}`}>
              <span className="dot" />
              {creditInfo.isPro
                ? "Pro Active"
                : creditInfo.credits > 0
                ? `${creditInfo.credits} credits`
                : `${creditInfo.freeScansRemaining} free scans`}
            </div>
          )}
        </div>
      </nav>

      {/* CONTENT */}
      <div className="pricing-container">
        <motion.div
          className="pricing-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="pricing-label">Pricing</div>
          <h1 className="pricing-title">
            Security that pays for itself.
          </h1>
          <p className="pricing-subtitle">
            AI-powered phishing detection with VirusTotal, Grok analysis, and
            forensic reporting. Pay per scan with USDC — no subscriptions, no
            accounts.
          </p>
          <div className="pricing-free-note">
            <span>✓</span> 3 free scans every day — no wallet needed
          </div>
        </motion.div>

        <div className="pricing-grid">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              className={`plan-card ${plan.popular ? "popular" : ""}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
            >
              {plan.popular && (
                <div className="popular-badge">Most Popular</div>
              )}
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-desc">{plan.description}</p>
              <div className="plan-price-row">
                <span className="plan-currency">$</span>
                <span className="plan-amount">
                  {plan.price.split(".")[0]}
                </span>
                <span className="plan-period">
                  .{plan.price.split(".")[1]} USDC
                  {plan.credits === -1 ? " /mo" : ""}
                </span>
              </div>
              <ul className="plan-features">
                {plan.features.map((f, fi) => (
                  <li key={fi}>
                    <span className="check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`plan-btn ${plan.popular ? "primary" : "default"}`}
                onClick={() => handlePurchase(plan.id)}
                disabled={loadingPlan === plan.id}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <div className="spinner" />
                    Creating session...
                  </>
                ) : (
                  <>Pay with USDC</>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="pricing-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="powered-by">
            Payments powered by{" "}
            <span className="locus-logo">LOCUS</span>
            <span className="usdc-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="700">$</text>
              </svg>
              USDC on Base
            </span>
          </div>
          <div className="pricing-trust">
            <span className="trust-item">🔒 Non-custodial payments</span>
            <span className="trust-item">⚡ Instant on-chain confirmation</span>
            <span className="trust-item">🤖 Agent-compatible</span>
            <span className="trust-item">🧾 On-chain receipt</span>
          </div>
        </motion.div>
      </div>
    </>
  );
}
