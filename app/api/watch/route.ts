/**
 * POST /api/watch
 *
 * Real-time email watchdog. Polls IMAP inbox for new emails,
 * runs AI analysis, and sends WhatsApp alerts automatically.
 *
 * Actions:
 *   { action: "check", email, password, provider, phone, lastUid }
 *     → Checks for new emails since lastUid, analyzes them, sends WhatsApp alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchEmails, ImapConfig } from "@/lib/imap";
import { analyzeEmail } from "@/lib/grok";
import { parseEmailHeaders } from "@/lib/parser";
import axios from "axios";
import nodemailer from "nodemailer";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WA_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

// Server-side cache: never notify for the same email UID twice
const notifiedUids = new Set<number>();
const emailedUids = new Set<number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, provider, phone, reportEmail, lastUid = 0, processedUids = [] } = body;
    const processedSet = new Set<number>(processedUids);

    if (action !== "check") {
      return NextResponse.json({ error: "Invalid action. Use: check" }, { status: 400 });
    }

    if (!email || !password || !provider) {
      return NextResponse.json({ error: "email, password, and provider required" }, { status: 400 });
    }

    const config: ImapConfig = { email, password, provider };

    // Fetch latest 10 emails
    const emails = await fetchEmails(config, 10);

    // Filter to only new emails (UIDs > lastUid AND not already processed)
    const newEmails = lastUid > 0
      ? emails.filter((e) => e.uid > lastUid && !processedSet.has(e.uid))
      : [];

    // Find the highest UID (for next poll)
    const latestUid = emails.length > 0 ? Math.max(...emails.map((e) => e.uid)) : lastUid;

    // If this is the first check (lastUid === 0), just return the latest UID without scanning
    if (lastUid === 0) {
      console.log(`[Watch] Initial check — ${emails.length} emails in inbox, latest UID: ${latestUid}`);
      return NextResponse.json({
        success: true,
        latestUid,
        newCount: 0,
        results: [],
        message: "Watchdog started. Monitoring for new emails...",
      });
    }

    // No new emails
    if (newEmails.length === 0) {
      return NextResponse.json({
        success: true,
        latestUid,
        newCount: 0,
        results: [],
      });
    }

    console.log(`[Watch] ${newEmails.length} new email(s) detected!`);

    // Analyze each new email and send WhatsApp alerts
    const results = [];

    for (const mail of newEmails) {
      try {
        // Parse headers
        const parsed = parseEmailHeaders(mail.rawContent);

        // Run AI analysis
        const analysis = await analyzeEmail(mail.rawContent, null, null, "");

        const result = {
          uid: mail.uid,
          subject: mail.subject,
          from: mail.from,
          date: mail.date,
          verdict: analysis.verdict,
          score: analysis.overallScore,
          summary: analysis.summary,
          whatsappSent: false,
          emailSent: false,
        };

        // Send WhatsApp alert (only if not already notified for this UID)
        if (phone && TWILIO_SID && TWILIO_TOKEN && TWILIO_WA_NUMBER && !notifiedUids.has(mail.uid)) {
          try {
            notifiedUids.add(mail.uid); // Mark BEFORE sending to prevent race conditions
            await sendWatchAlert(phone, mail, analysis);
            result.whatsappSent = true;
          } catch (waErr: unknown) {
            const e = waErr as { message?: string };
            console.error(`[Watch] WhatsApp failed:`, e.message);
          }
        }

        // Send email report (only if not already emailed for this UID)
        if (reportEmail && SMTP_EMAIL && SMTP_PASSWORD && !emailedUids.has(mail.uid)) {
          try {
            emailedUids.add(mail.uid);
            await sendWatchEmailReport(reportEmail, mail, analysis);
            result.emailSent = true;
          } catch (emErr: unknown) {
            const e = emErr as { message?: string };
            console.error(`[Watch] Email report failed:`, e.message);
          }
        }

        results.push(result);

        console.log(
          `[Watch] ${mail.subject.slice(0, 40)}... → ${analysis.verdict} (${analysis.overallScore})` +
          (result.whatsappSent ? " ✓ WhatsApp" : "") +
          (result.emailSent ? " ✓ Email" : "")
        );
      } catch (err: unknown) {
        const e = err as { message?: string };
        console.error(`[Watch] Failed to analyze email ${mail.uid}:`, e.message);
        results.push({
          uid: mail.uid,
          subject: mail.subject,
          from: mail.from,
          date: mail.date,
          verdict: "ERROR",
          score: 0,
          summary: e.message || "Analysis failed",
          whatsappSent: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      latestUid,
      newCount: results.length,
      results,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Watch] Error:", err.message);
    return NextResponse.json({ error: err.message || "Watch check failed" }, { status: 500 });
  }
}

// ── WhatsApp Alert for Watchdog ────────────────────────────────────────

interface WatchAnalysis {
  verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
  overallScore: number;
  signals: Array<{ check: string; status: string; detail: string }>;
  summary: string;
}

interface WatchEmail {
  subject: string;
  from: string;
  date: string;
  hasAttachments: boolean;
}

async function sendWatchAlert(
  phone: string,
  email: WatchEmail,
  analysis: WatchAnalysis
): Promise<void> {
  const verdictEmoji: Record<string, string> = {
    HIGH_RISK: "🔴",
    MEDIUM_RISK: "🟡",
    SAFE: "🟢",
  };

  const verdictLabel: Record<string, string> = {
    HIGH_RISK: "⚠️ HIGH RISK",
    MEDIUM_RISK: "⚡ SUSPICIOUS",
    SAFE: "✅ SAFE",
  };

  const topSignals = analysis.signals
    .filter((s) => s.status !== "PASS")
    .slice(0, 3)
    .map((s) => `${s.status === "FAIL" ? "✗" : "⚠"} ${s.detail}`)
    .join("\n");

  const message = `${verdictEmoji[analysis.verdict] || "🔵"} *New Email Alert — PhishFilter*

📩 *From:* ${email.from}
📋 *Subject:* ${email.subject}
📅 *Date:* ${new Date(email.date).toLocaleString()}
${email.hasAttachments ? "📎 Has Attachments" : ""}

*Verdict:* ${verdictLabel[analysis.verdict] || analysis.verdict}
*Risk Score:* ${analysis.overallScore}/100

${topSignals ? `*Signals:*\n${topSignals}` : ""}

${analysis.summary}

Stay safe 🛡️`;

  let formattedPhone = phone.replace(/\s+/g, "").replace(/-/g, "");
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = formattedPhone.startsWith("91") ? `+${formattedPhone}` : `+91${formattedPhone}`;
  }

  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    new URLSearchParams({
      From: `whatsapp:${TWILIO_WA_NUMBER}`,
      To: `whatsapp:${formattedPhone}`,
      Body: message,
    }).toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: { username: TWILIO_SID!, password: TWILIO_TOKEN! },
      timeout: 10000,
    }
  );

  console.log(`[Watch] WhatsApp alert sent to ${formattedPhone}`);
}

// ── Email Report for Watchdog ──────────────────────────────────────────

async function sendWatchEmailReport(
  toEmail: string,
  email: WatchEmail,
  analysis: WatchAnalysis
): Promise<void> {
  const verdictColor: Record<string, string> = {
    HIGH_RISK: "#ef4444",
    MEDIUM_RISK: "#f59e0b",
    SAFE: "#22c55e",
  };

  const verdictLabel: Record<string, string> = {
    HIGH_RISK: "⚠️ HIGH RISK",
    MEDIUM_RISK: "⚡ SUSPICIOUS",
    SAFE: "✅ SAFE",
  };

  const color = verdictColor[analysis.verdict] || "#6366f1";
  const label = verdictLabel[analysis.verdict] || analysis.verdict;

  const signalsHtml = analysis.signals
    .filter((s) => s.status !== "PASS")
    .slice(0, 5)
    .map((s) => `
      <div style="margin-bottom:8px;padding:10px 12px;border-left:3px solid ${
        s.status === "FAIL" ? "#ef4444" : "#f59e0b"
      };background:#f9fafb;border-radius:0 6px 6px 0;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">
          ${s.status === "FAIL" ? "✗" : "⚠"} ${s.check}
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${s.detail}</p>
      </div>
    `)
    .join("");

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:${color};padding:28px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
        ${label}
      </h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
        PhishFilter Watchdog — New Email Detected
      </p>
    </div>

    <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
      <table style="width:100%;font-size:13px;color:#374151;">
        <tr>
          <td style="padding:4px 0;font-weight:600;width:80px;">From:</td>
          <td style="padding:4px 0;">${email.from}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:600;">Subject:</td>
          <td style="padding:4px 0;">${email.subject}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:600;">Date:</td>
          <td style="padding:4px 0;">${new Date(email.date).toLocaleString()}</td>
        </tr>
        ${email.hasAttachments ? `<tr><td style="padding:4px 0;font-weight:600;">📎</td><td style="padding:4px 0;">Has Attachments</td></tr>` : ""}
      </table>
    </div>

    <div style="padding:20px 24px;text-align:center;border-bottom:1px solid #e5e7eb;">
      <div style="display:inline-block;width:70px;height:70px;border-radius:50%;border:4px solid ${color};line-height:62px;font-size:24px;font-weight:700;color:${color};">
        ${analysis.overallScore}
      </div>
      <p style="margin:6px 0 0;color:#6b7280;font-size:12px;">Risk Score (0-100)</p>
    </div>

    <div style="padding:16px 24px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
      <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">${analysis.summary}</p>
    </div>

    ${signalsHtml ? `
    <div style="padding:16px 24px;">
      <h3 style="margin:0 0 10px;color:#111827;font-size:14px;font-weight:600;">Signals</h3>
      ${signalsHtml}
    </div>
    ` : ""}

    <div style="padding:16px 24px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">PhishFilter Watchdog — Automated Security Report</p>
    </div>
  </div>
</body>
</html>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"PhishFilter Watchdog" <${SMTP_EMAIL}>`,
    to: toEmail,
    subject: `[PhishFilter] ${label} — ${email.subject}`,
    html: htmlBody,
  });

  console.log(`[Watch] Email report sent to ${toEmail}`);
}
