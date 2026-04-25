/**
 * POST /api/notify
 *
 * Sends post-analysis notifications via email (AgentMail) and
 * WhatsApp. Called after the main analyze pipeline completes.
 *
 * Accepts: { report, userEmail, userPhone, verdict }
 * Returns: { emailSent, whatsappSent }
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import nodemailer from "nodemailer";

const LOCUS_API_KEY = process.env.LOCUS_API_KEY;
const LOCUS_BASE_URL = "https://api.locus.sh/v1";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// SMTP config for sending email reports
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

// ── Types ──────────────────────────────────────────────────────────────

interface Signal {
  check: string;
  status: "FAIL" | "WARN" | "PASS";
  severity: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  technical: string;
}

interface NotifyRequest {
  report: {
    analysis: {
      verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
      overallScore: number;
      signals: Signal[];
      urlAnalysis: Array<{
        original: string;
        isSuspicious: boolean;
        virusTotalScore: string;
      }>;
      summary: string;
    };
  };
  userEmail?: string;
  userPhone?: string;
  verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
}

// ── Verdict Config ─────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  HIGH_RISK: {
    emoji: "🔴",
    label: "HIGH RISK",
    subject: "⚠️ HIGH RISK Email Detected",
    color: "#ef4444",
    bgColor: "#fef2f2",
  },
  MEDIUM_RISK: {
    emoji: "🟡",
    label: "MEDIUM RISK",
    subject: "⚠️ Suspicious Email Detected",
    color: "#f59e0b",
    bgColor: "#fffbeb",
  },
  SAFE: {
    emoji: "🟢",
    label: "SAFE",
    subject: "✅ Email Appears Safe",
    color: "#22c55e",
    bgColor: "#f0fdf4",
  },
};

// ── Email Report (AgentMail via Locus) ─────────────────────────────────

async function sendEmailReport(
  userEmail: string,
  report: NotifyRequest["report"]
): Promise<boolean> {
  if (!userEmail) return false;

  const { analysis } = report;
  const config = VERDICT_CONFIG[analysis.verdict];

  // Get top 3 most critical signals (FAIL first, then WARN)
  const criticalSignals = [...analysis.signals]
    .sort((a, b) => {
      const order = { FAIL: 0, WARN: 1, PASS: 2 };
      return order[a.status] - order[b.status];
    })
    .slice(0, 3);

  // Suspicious URLs
  const suspiciousUrls = (analysis.urlAnalysis || []).filter((u) => u.isSuspicious);

  // Build HTML email
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    
    <!-- Verdict Banner -->
    <div style="background:${config.color};padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
        ${config.emoji} ${config.label}
      </h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
        PhishFilter AI Analysis Complete
      </p>
    </div>

    <!-- Score -->
    <div style="padding:24px;text-align:center;border-bottom:1px solid #e5e7eb;">
      <div style="display:inline-block;width:80px;height:80px;border-radius:50%;border:4px solid ${config.color};line-height:72px;font-size:28px;font-weight:700;color:${config.color};">
        ${analysis.overallScore}
      </div>
      <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">Risk Score (0-100)</p>
    </div>

    <!-- Summary -->
    <div style="padding:20px 24px;background:${config.bgColor};border-bottom:1px solid #e5e7eb;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        ${analysis.summary}
      </p>
    </div>

    <!-- Top Critical Signals -->
    <div style="padding:20px 24px;">
      <h3 style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">
        Top Signals
      </h3>
      ${criticalSignals
        .map(
          (s) => `
        <div style="margin-bottom:10px;padding:10px 12px;border-left:3px solid ${
          s.status === "FAIL" ? "#ef4444" : s.status === "WARN" ? "#f59e0b" : "#22c55e"
        };background:#f9fafb;border-radius:0 6px 6px 0;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">
            ${s.status === "FAIL" ? "✗" : s.status === "WARN" ? "⚠" : "✓"} ${s.check}
          </p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${s.detail}</p>
        </div>
      `
        )
        .join("")}
    </div>

    <!-- Signals Table -->
    <div style="padding:0 24px 20px;">
      <h3 style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">
        All Signals
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:500;">Check</th>
            <th style="padding:8px 10px;text-align:center;color:#6b7280;font-weight:500;">Status</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:500;">Detail</th>
          </tr>
        </thead>
        <tbody>
          ${analysis.signals
            .map(
              (s) => `
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:8px 10px;color:#374151;font-weight:500;">${s.check}</td>
              <td style="padding:8px 10px;text-align:center;">
                <span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;color:#fff;background:${
                  s.status === "FAIL" ? "#ef4444" : s.status === "WARN" ? "#f59e0b" : "#22c55e"
                };">${s.status}</span>
              </td>
              <td style="padding:8px 10px;color:#6b7280;">${s.detail}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    ${
      suspiciousUrls.length > 0
        ? `
    <!-- Suspicious URLs -->
    <div style="padding:0 24px 20px;">
      <h3 style="margin:0 0 12px;color:#ef4444;font-size:15px;font-weight:600;">
        ⚠ Suspicious URLs Found
      </h3>
      ${suspiciousUrls
        .map(
          (u) => `
        <div style="margin-bottom:6px;padding:8px 12px;background:#fef2f2;border-radius:6px;border:1px solid #fecaca;">
          <p style="margin:0;font-size:12px;font-family:monospace;color:#991b1b;word-break:break-all;">${u.original}</p>
          ${u.virusTotalScore ? `<p style="margin:4px 0 0;font-size:11px;color:#b91c1c;">VirusTotal: ${u.virusTotalScore}</p>` : ""}
        </div>
      `
        )
        .join("")}
    </div>
    `
        : ""
    }

    <!-- CTA -->
    <div style="padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        View Full Report
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        Analyzed by PhishFilter — AI Phishing Detection
      </p>
      <p style="margin:4px 0 0;font-size:10px;color:#d1d5db;">
        This is an automated security analysis report.
      </p>
    </div>
  </div>
</body>
</html>`;

  // Try Gmail SMTP first (most reliable)
  if (SMTP_EMAIL && SMTP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: SMTP_EMAIL,
          pass: SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"PhishFilter" <${SMTP_EMAIL}>`,
        to: userEmail,
        subject: `[PhishFilter] ${config.subject}`,
        html: htmlBody,
      });

      console.log(`[Notify] Email sent to ${userEmail} via Gmail SMTP`);
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(`[Notify] Gmail SMTP failed:`, err.message);
    }
  }

  // Fallback: Locus AgentMail
  if (LOCUS_API_KEY) {
    try {
      await axios.post(
        `${LOCUS_BASE_URL}/agentmail/send`,
        {
          to: userEmail,
          subject: `[PhishFilter] ${config.subject}`,
          html: htmlBody,
          from: "phishfilter@agentmail.app",
        },
        {
          headers: {
            Authorization: `Bearer ${LOCUS_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      console.log(`[Notify] Email sent to ${userEmail} via Locus AgentMail`);
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(`[Notify] Locus email send failed:`, err.message);
    }
  }

  console.error(`[Notify] No email provider available. Set SMTP_EMAIL + SMTP_PASSWORD in .env.local`);
  return false;
}

// ── WhatsApp Alert (Twilio) ────────────────────────────────────────────

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WA_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

async function sendWhatsAppAlert(
  userPhone: string,
  report: NotifyRequest["report"]
): Promise<boolean> {
  if (!userPhone || !TWILIO_SID || !TWILIO_TOKEN || !TWILIO_WA_NUMBER) return false;

  const { analysis } = report;
  const config = VERDICT_CONFIG[analysis.verdict];

  // Get top 3 critical signals for the message
  const topSignals = [...analysis.signals]
    .filter((s) => s.status !== "PASS")
    .slice(0, 3)
    .map((s) => `${s.status === "FAIL" ? "✗" : "⚠"} ${s.check}: ${s.detail}`)
    .join("\n");

  const message = `${config.emoji} *PhishFilter Alert*

*Verdict:* ${config.label}
*Score:* ${analysis.overallScore}/100

*Top signals:*
${topSignals || "No critical signals detected"}

${analysis.summary}

Full report: ${APP_URL}

Stay safe 🛡️`;

  // Format phone number for Twilio WhatsApp
  let formattedPhone = userPhone.replace(/\s+/g, "").replace(/-/g, "");
  if (!formattedPhone.startsWith("+")) {
    // Assume Indian number if no country code
    formattedPhone = formattedPhone.startsWith("91") ? `+${formattedPhone}` : `+91${formattedPhone}`;
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;

    await axios.post(
      twilioUrl,
      new URLSearchParams({
        From: `whatsapp:${TWILIO_WA_NUMBER}`,
        To: `whatsapp:${formattedPhone}`,
        Body: message,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: TWILIO_SID, password: TWILIO_TOKEN },
        timeout: 10000,
      }
    );
    console.log(`[Notify] WhatsApp sent to ${formattedPhone} via Twilio`);
    return true;
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown } };
    console.error(`[Notify] WhatsApp send failed:`, err.message, err.response?.data);
    return false;
  }
}

// ── Route Handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: NotifyRequest = await request.json();
    const { report, userEmail, userPhone } = body;

    if (!report) {
      return NextResponse.json({ error: "Report data is required" }, { status: 400 });
    }

    // Run both notifications in parallel — each fails silently
    const [emailSent, whatsappSent] = await Promise.all([
      userEmail ? sendEmailReport(userEmail, report) : Promise.resolve(false),
      userPhone ? sendWhatsAppAlert(userPhone, report) : Promise.resolve(false),
    ]);

    return NextResponse.json({
      success: true,
      emailSent,
      whatsappSent,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Notify] Route error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Notification failed", emailSent: false, whatsappSent: false },
      { status: 500 }
    );
  }
}
