/**
 * GET /api/watch-live
 *
 * Real-time IMAP IDLE watchdog using Server-Sent Events (SSE).
 * Keeps a persistent connection to the mail server — NO polling.
 * Instantly detects new emails and sends WhatsApp + Email alerts.
 */

import { NextRequest } from "next/server";
import { ImapFlow } from "imapflow";
import { analyzeEmail } from "@/lib/grok";
import axios from "axios";
import nodemailer from "nodemailer";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WA_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

// IMAP server configs
const IMAP_HOSTS: Record<string, { host: string; port: number }> = {
  gmail: { host: "imap.gmail.com", port: 993 },
  outlook: { host: "outlook.office365.com", port: 993 },
  yahoo: { host: "imap.mail.yahoo.com", port: 993 },
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") || "";
  const password = url.searchParams.get("password") || "";
  const provider = url.searchParams.get("provider") || "gmail";
  const phone = url.searchParams.get("phone") || "";
  const reportEmail = url.searchParams.get("reportEmail") || "";

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "email and password required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const imapConfig = IMAP_HOSTS[provider] || IMAP_HOSTS.gmail;
  const processedUids = new Set<number>();

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let client: ImapFlow | null = null;

      try {
        client = new ImapFlow({
          host: imapConfig.host,
          port: imapConfig.port,
          secure: true,
          auth: { user: email, pass: password },
          logger: false,
        });

        await client.connect();
        send("status", { type: "connected", message: "Connected to mail server" });

        const lock = await client.getMailboxLock("INBOX");

        try {
          // Get current message count as baseline
          const mailbox = client.mailbox;
          let lastSeq = (mailbox && typeof mailbox === "object" && "exists" in mailbox) ? mailbox.exists : 0;

          send("status", {
            type: "watching",
            message: `Watching inbox (${lastSeq} existing emails). Waiting for new emails...`,
            existingCount: lastSeq,
          });

          // Listen for new messages via IDLE
          client.on("exists", async (data: { path: string; count: number; prevCount: number }) => {
            const newCount = data.count;
            const prevCount = data.prevCount;

            if (newCount <= prevCount) return;

            send("status", { type: "new_email", message: `${newCount - prevCount} new email(s) detected!` });

            // Fetch new messages
            try {
              for (let seq = prevCount + 1; seq <= newCount; seq++) {
                try {
                  const msg = await client!.fetchOne(`${seq}`, {
                    uid: true,
                    envelope: true,
                    source: true,
                  });

                  if (!msg || processedUids.has(msg.uid)) continue;
                  processedUids.add(msg.uid);

                  const rawContent = msg.source?.toString() || "";
                  const subject = msg.envelope?.subject || "(No Subject)";
                  const from = msg.envelope?.from?.[0]
                    ? `${msg.envelope.from[0].name || ""} <${msg.envelope.from[0].address || ""}>`
                    : "Unknown";
                  const date = msg.envelope?.date?.toISOString() || new Date().toISOString();

                  send("status", { type: "analyzing", message: `Analyzing: ${subject}` });

                  // Run AI analysis
                  const analysis = await analyzeEmail(rawContent, null, null, "");

                  const result = {
                    uid: msg.uid,
                    subject,
                    from,
                    date,
                    verdict: analysis.verdict,
                    score: analysis.overallScore,
                    summary: analysis.summary,
                    whatsappSent: false,
                    emailSent: false,
                  };

                  // Send WhatsApp
                  if (phone && TWILIO_SID && TWILIO_TOKEN && TWILIO_WA_NUMBER) {
                    try {
                      await sendWhatsApp(phone, { subject, from, date, hasAttachments: false }, analysis);
                      result.whatsappSent = true;
                    } catch (e) {
                      console.error("[IDLE] WhatsApp failed:", (e as Error).message);
                    }
                  }

                  // Send Email Report
                  if (reportEmail && SMTP_EMAIL && SMTP_PASSWORD) {
                    try {
                      await sendEmailReport(reportEmail, { subject, from, date, hasAttachments: false }, analysis);
                      result.emailSent = true;
                    } catch (e) {
                      console.error("[IDLE] Email report failed:", (e as Error).message);
                    }
                  }

                  send("alert", result);
                  console.log(`[IDLE] ${subject.slice(0, 40)}... → ${analysis.verdict} (${analysis.overallScore})`);
                } catch (fetchErr) {
                  console.error(`[IDLE] Failed to fetch seq ${seq}:`, (fetchErr as Error).message);
                }
              }
            } catch (err) {
              console.error("[IDLE] Processing error:", (err as Error).message);
              send("error", { message: (err as Error).message });
            }
          });

          // Keep alive — IDLE automatically waits for server push
          // This loop keeps the connection alive until client disconnects
          while (true) {
            try {
              await client.idle();
            } catch (idleErr) {
              // idle() throws when connection drops
              console.log("[IDLE] Connection interrupted:", (idleErr as Error).message);
              send("error", { message: "Connection lost. Reconnecting..." });
              break;
            }
          }
        } finally {
          lock.release();
        }
      } catch (err) {
        send("error", { message: (err as Error).message || "Connection failed" });
        console.error("[IDLE] Fatal error:", (err as Error).message);
      } finally {
        if (client) {
          try {
            await client.logout();
          } catch {}
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── WhatsApp ───────────────────────────────────────────────────────────

interface EmailInfo {
  subject: string;
  from: string;
  date: string;
  hasAttachments: boolean;
}

interface AnalysisResult {
  verdict: string;
  overallScore: number;
  signals: Array<{ check: string; status: string; detail: string }>;
  summary: string;
}

async function sendWhatsApp(phone: string, email: EmailInfo, analysis: AnalysisResult) {
  const emoji: Record<string, string> = { HIGH_RISK: "🔴", MEDIUM_RISK: "🟡", SAFE: "🟢" };
  const label: Record<string, string> = { HIGH_RISK: "⚠️ HIGH RISK", MEDIUM_RISK: "⚡ SUSPICIOUS", SAFE: "✅ SAFE" };

  const topSignals = analysis.signals
    .filter((s) => s.status !== "PASS")
    .slice(0, 3)
    .map((s) => `${s.status === "FAIL" ? "✗" : "⚠"} ${s.detail}`)
    .join("\n");

  const message = `${emoji[analysis.verdict] || "🔵"} *PhishFilter — Instant Alert*

📩 *From:* ${email.from}
📋 *Subject:* ${email.subject}

*Verdict:* ${label[analysis.verdict] || analysis.verdict}
*Risk Score:* ${analysis.overallScore}/100

${topSignals ? `*Signals:*\n${topSignals}` : ""}

${analysis.summary}

🛡️ Stay safe`;

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
}

// ── Email Report ───────────────────────────────────────────────────────

async function sendEmailReport(toEmail: string, email: EmailInfo, analysis: AnalysisResult) {
  const color: Record<string, string> = { HIGH_RISK: "#ef4444", MEDIUM_RISK: "#f59e0b", SAFE: "#22c55e" };
  const label: Record<string, string> = { HIGH_RISK: "⚠️ HIGH RISK", MEDIUM_RISK: "⚡ SUSPICIOUS", SAFE: "✅ SAFE" };

  const signalsHtml = analysis.signals
    .filter((s) => s.status !== "PASS")
    .slice(0, 5)
    .map((s) => `<div style="margin-bottom:8px;padding:10px;border-left:3px solid ${s.status === "FAIL" ? "#ef4444" : "#f59e0b"};background:#f9fafb;border-radius:0 6px 6px 0;"><p style="margin:0;font-size:13px;font-weight:600;">${s.status === "FAIL" ? "✗" : "⚠"} ${s.check}</p><p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${s.detail}</p></div>`)
    .join("");

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
<div style="background:${color[analysis.verdict] || "#6366f1"};padding:28px 24px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:22px;">${label[analysis.verdict] || analysis.verdict}</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">PhishFilter — Instant Detection</p></div>
<div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
<p style="margin:0;font-size:13px;"><b>From:</b> ${email.from}</p>
<p style="margin:4px 0;font-size:13px;"><b>Subject:</b> ${email.subject}</p>
<p style="margin:0;font-size:13px;"><b>Date:</b> ${new Date(email.date).toLocaleString()}</p></div>
<div style="padding:20px 24px;text-align:center;border-bottom:1px solid #e5e7eb;">
<div style="display:inline-block;width:70px;height:70px;border-radius:50%;border:4px solid ${color[analysis.verdict]};line-height:62px;font-size:24px;font-weight:700;color:${color[analysis.verdict]};">${analysis.overallScore}</div>
<p style="margin:6px 0 0;color:#6b7280;font-size:12px;">Risk Score</p></div>
<div style="padding:16px 24px;background:#f9fafb;"><p style="margin:0;font-size:13px;line-height:1.6;">${analysis.summary}</p></div>
${signalsHtml ? `<div style="padding:16px 24px;">${signalsHtml}</div>` : ""}
<div style="padding:12px 24px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;color:#9ca3af;">PhishFilter — Automated Security Report</p></div>
</div></body></html>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"PhishFilter" <${SMTP_EMAIL}>`,
    to: toEmail,
    subject: `[PhishFilter] ${label[analysis.verdict]} — ${email.subject}`,
    html,
  });
}
