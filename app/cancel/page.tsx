"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

/* ════════════════════════════════════════════════════════════════
   PHISHFILTER — PAYMENT CANCELLED PAGE
   Gentle messaging when user cancels checkout.
   ════════════════════════════════════════════════════════════════ */

export default function CancelPage() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body { margin: 0; background: #0a0a0a; overflow: hidden; }

        .cancel-page {
          position: fixed; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: system-ui, -apple-system, sans-serif; color: #fff;
        }
        .cancel-vignette { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 30%, #0a0a0a 100%); }

        .cancel-icon {
          width: 80px; height: 80px; border-radius: 50%;
          background: rgba(234,179,8,0.08); border: 2px solid rgba(234,179,8,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 36px; margin-bottom: 28px;
        }

        .cancel-title {
          font-family: Georgia, serif; font-style: italic;
          font-size: 1.8rem; margin: 0 0 8px; font-weight: 400;
        }
        .cancel-subtitle {
          font-size: 14px; color: rgba(255,255,255,0.35); margin: 0 0 12px;
          text-align: center; max-width: 400px; line-height: 1.7;
        }
        .cancel-free-note {
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: 36px; padding: 8px 18px; border-radius: 16px;
          background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.12);
          font-size: 12px; color: rgba(34,197,94,0.7);
        }

        .cancel-actions { display: flex; gap: 16px; }
        .cancel-btn {
          padding: 12px 28px; border-radius: 12px; font-size: 14px;
          font-weight: 600; cursor: pointer; transition: all 0.3s;
          text-decoration: none; display: flex; align-items: center; gap: 8px;
        }
        .cancel-btn.primary {
          background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .cancel-btn.primary:hover {
          background: rgba(255,255,255,0.1); color: #fff;
          transform: translateY(-1px);
        }
        .cancel-btn.ghost {
          background: transparent; color: rgba(255,255,255,0.3);
          border: none;
        }
        .cancel-btn.ghost:hover {
          color: rgba(255,255,255,0.6);
        }
      `,
        }}
      />

      <div className="cancel-vignette" />
      <div className="cancel-page">
        <motion.div
          className="cancel-icon"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          ↩
        </motion.div>

        <motion.h1
          className="cancel-title"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          No worries.
        </motion.h1>
        <motion.p
          className="cancel-subtitle"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          Your checkout was cancelled. No charges were made.
          You can always come back when you&apos;re ready.
        </motion.p>
        <motion.div
          className="cancel-free-note"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          ✓ You still have 3 free scans every day
        </motion.div>

        <motion.div
          className="cancel-actions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/scan" className="cancel-btn primary">
            🛡️ Scan for free
          </Link>
          <Link href="/pricing" className="cancel-btn ghost">
            View plans →
          </Link>
        </motion.div>
      </div>
    </>
  );
}
