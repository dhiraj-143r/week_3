/**
 * POST /api/inbox-summary
 *
 * Fetches emails from the last N days, runs AI analysis on each,
 * and returns a consolidated summary report.
 */

import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { analyzeEmail } from "@/lib/grok";

const IMAP_HOSTS: Record<string, { host: string; port: number }> = {
  gmail: { host: "imap.gmail.com", port: 993 },
  outlook: { host: "outlook.office365.com", port: 993 },
  yahoo: { host: "imap.mail.yahoo.com", port: 993 },
};

interface EmailSummary {
  uid: number;
  subject: string;
  from: string;
  date: string;
  verdict: string;
  score: number;
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, provider = "gmail", days = 2 } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const imapConfig = IMAP_HOSTS[provider] || IMAP_HOSTS.gmail;

    // Calculate date range
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const client = new ImapFlow({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: true,
      auth: { user: email, pass: password },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    const emails: EmailSummary[] = [];

    try {
      // Search for emails since the date
      const uids = await client.search(
        { since: sinceDate },
        { uid: true }
      );

      if (!uids || uids.length === 0) {
        lock.release();
        await client.logout();
        return NextResponse.json({
          success: true,
          days,
          totalEmails: 0,
          emails: [],
          stats: { safe: 0, suspicious: 0, highRisk: 0, avgScore: 0 },
          topSenders: [],
          timeline: [],
        });
      }

      // Limit to last 50 emails to avoid timeout
      const uidList = uids.slice(-50);
      console.log(`[Summary] Found ${uids.length} emails in last ${days} days, analyzing ${uidList.length}`);

      // Fetch all emails
      const fetchedMails: Array<{
        uid: number;
        subject: string;
        from: string;
        date: string;
        rawContent: string;
      }> = [];

      for await (const msg of client.fetch(uidList, {
        uid: true,
        envelope: true,
        source: true,
      })) {
        const subject = msg.envelope?.subject || "(No Subject)";
        const fromAddr = msg.envelope?.from?.[0];
        const from = fromAddr
          ? `${fromAddr.name || ""} <${fromAddr.address || ""}>`.trim()
          : "Unknown";
        const date = msg.envelope?.date?.toISOString() || new Date().toISOString();
        const rawContent = msg.source?.toString() || "";

        fetchedMails.push({ uid: msg.uid, subject, from, date, rawContent });
      }

      lock.release();
      await client.logout();

      // Analyze each email (batch with concurrency limit)
      const BATCH_SIZE = 5;
      for (let i = 0; i < fetchedMails.length; i += BATCH_SIZE) {
        const batch = fetchedMails.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (mail) => {
            try {
              const analysis = await analyzeEmail(mail.rawContent, null, null, "");
              return {
                uid: mail.uid,
                subject: mail.subject,
                from: mail.from,
                date: mail.date,
                verdict: analysis.verdict,
                score: analysis.overallScore,
                summary: analysis.summary,
              };
            } catch (err) {
              console.error(`[Summary] Failed to analyze UID ${mail.uid}:`, (err as Error).message);
              return {
                uid: mail.uid,
                subject: mail.subject,
                from: mail.from,
                date: mail.date,
                verdict: "ERROR",
                score: 0,
                summary: "Analysis failed",
              };
            }
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            emails.push(r.value);
          }
        }
      }
    } catch (err) {
      lock.release();
      await client.logout();
      throw err;
    }

    // ── Build stats ────────────────────────────────────────────────────
    const safe = emails.filter((e) => e.verdict === "SAFE").length;
    const suspicious = emails.filter((e) => e.verdict === "MEDIUM_RISK").length;
    const highRisk = emails.filter((e) => e.verdict === "HIGH_RISK").length;
    const avgScore = emails.length > 0
      ? Math.round(emails.reduce((sum, e) => sum + e.score, 0) / emails.length)
      : 0;

    // Top senders
    const senderMap = new Map<string, { count: number; maxScore: number }>();
    for (const e of emails) {
      const addr = e.from.match(/<(.+?)>/)?.[1] || e.from;
      const existing = senderMap.get(addr) || { count: 0, maxScore: 0 };
      senderMap.set(addr, {
        count: existing.count + 1,
        maxScore: Math.max(existing.maxScore, e.score),
      });
    }
    const topSenders = Array.from(senderMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([address, data]) => ({ address, ...data }));

    // Timeline (group by date)
    const timelineMap = new Map<string, { total: number; risky: number }>();
    for (const e of emails) {
      const dateKey = new Date(e.date).toLocaleDateString();
      const existing = timelineMap.get(dateKey) || { total: 0, risky: 0 };
      timelineMap.set(dateKey, {
        total: existing.total + 1,
        risky: existing.risky + (e.verdict !== "SAFE" ? 1 : 0),
      });
    }
    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      success: true,
      days,
      totalEmails: emails.length,
      totalInbox: emails.length,
      emails: emails.sort((a, b) => b.score - a.score),
      stats: { safe, suspicious, highRisk, avgScore },
      topSenders,
      timeline,
    });
  } catch (err) {
    console.error("[Summary] Error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to generate summary" },
      { status: 500 }
    );
  }
}
