/**
 * POST /api/inbox
 *
 * IMAP-based inbox scanner.
 *
 * Actions:
 *   { action: "test", email, password, provider }      → Test connection
 *   { action: "fetch", email, password, provider, count } → Fetch emails
 *   { action: "scan", email, password, provider, count }  → Fetch + analyze all
 */

import { NextRequest, NextResponse } from "next/server";
import { testConnection, fetchEmails, ImapConfig } from "@/lib/imap";
import { analyzeEmail } from "@/lib/grok";
import { parseEmailHeaders } from "@/lib/parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, provider, count = 5 } = body;

    if (!email || !password || !provider) {
      return NextResponse.json(
        { error: "email, password, and provider are required" },
        { status: 400 }
      );
    }

    const config: ImapConfig = { email, password, provider };

    // ── Action: Test Connection ──────────────────────────────────────
    if (action === "test") {
      const result = await testConnection(config);
      return NextResponse.json(result);
    }

    // ── Action: Fetch Emails (no analysis) ──────────────────────────
    if (action === "fetch") {
      const emails = await fetchEmails(config, Math.min(count, 20));
      return NextResponse.json({
        success: true,
        count: emails.length,
        emails: emails.map((e) => ({
          uid: e.uid,
          subject: e.subject,
          from: e.from,
          date: e.date,
          snippet: e.snippet,
          hasAttachments: e.hasAttachments,
        })),
      });
    }

    // ── Action: Fetch + Scan All ─────────────────────────────────────
    if (action === "scan") {
      const emails = await fetchEmails(config, Math.min(count, 10));

      console.log(`[Inbox] Scanning ${emails.length} emails...`);

      const results = [];

      for (const email of emails) {
        try {
          // Parse the raw email
          const parsed = parseEmailHeaders(email.rawContent);

          // Run AI analysis (simplified — no URL enrichment for speed)
          const analysis = await analyzeEmail(
            email.rawContent,
            null, // skip firecrawl for inbox scan speed
            null, // skip virustotal for inbox scan speed
            ""
          );

          // Scan attachments if present
          let attachmentResults: Array<{
            filename: string;
            type: string;
            size: number;
            verdict: string;
            score: number;
            summary: string;
          }> = [];

          if (email.attachments.length > 0) {
            const { scanAttachment } = await import("@/lib/attachment-scanner");

            for (const att of email.attachments) {
              try {
                console.log(`[Inbox] Scanning attachment: ${att.filename} (${att.contentType})`);
                const attResult = await scanAttachment(att.content, att.filename, att.contentType);
                attachmentResults.push({
                  filename: att.filename,
                  type: att.contentType,
                  size: att.size,
                  verdict: attResult.verdict,
                  score: attResult.score,
                  summary: attResult.summary,
                });
              } catch (attErr: unknown) {
                const e = attErr as { message?: string };
                console.error(`[Inbox] Attachment scan failed for ${att.filename}:`, e.message);
                attachmentResults.push({
                  filename: att.filename,
                  type: att.contentType,
                  size: att.size,
                  verdict: "ERROR",
                  score: 0,
                  summary: `Scan failed: ${e.message}`,
                });
              }
            }
          }

          // Elevate verdict if any attachment is HIGH_RISK
          let finalVerdict = analysis.verdict;
          const highRiskAttachment = attachmentResults.find((a) => a.verdict === "HIGH_RISK");
          if (highRiskAttachment && finalVerdict === "SAFE") {
            finalVerdict = "MEDIUM_RISK";
          }

          results.push({
            uid: email.uid,
            subject: email.subject,
            from: email.from,
            date: email.date,
            snippet: email.snippet,
            hasAttachments: email.hasAttachments,
            attachmentCount: email.attachments.length,
            attachmentResults,
            verdict: finalVerdict,
            score: analysis.overallScore,
            signalCount: analysis.signals?.length || 0,
            topSignals: analysis.signals?.slice(0, 3).map((s) => ({
              check: s.check,
              status: s.status,
              detail: s.detail,
            })),
            summary: analysis.summary,
            fullAnalysis: analysis,
            parsed: {
              from: parsed.from,
              subject: parsed.subject,
              spf: parsed.spf,
              dkim: parsed.dkim,
              dmarc: parsed.dmarc,
            },
          });

          console.log(
            `[Inbox] ${email.subject.slice(0, 40)}... → ${finalVerdict} (${analysis.overallScore})` +
            (attachmentResults.length > 0 ? ` [${attachmentResults.length} attachments scanned]` : "")
          );
        } catch (err: unknown) {
          const error = err as { message?: string };
          console.error(`[Inbox] Failed to analyze email ${email.uid}:`, error.message);
          results.push({
            uid: email.uid,
            subject: email.subject,
            from: email.from,
            date: email.date,
            snippet: email.snippet,
            hasAttachments: email.hasAttachments,
            verdict: "ERROR",
            score: 0,
            error: error.message,
          });
        }
      }

      return NextResponse.json({
        success: true,
        totalScanned: results.length,
        summary: {
          highRisk: results.filter((r) => r.verdict === "HIGH_RISK").length,
          mediumRisk: results.filter((r) => r.verdict === "MEDIUM_RISK").length,
          safe: results.filter((r) => r.verdict === "SAFE").length,
          errors: results.filter((r) => r.verdict === "ERROR").length,
        },
        results,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use: test, fetch, or scan" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Inbox] Route error:", err.message);
    return NextResponse.json(
      { error: err.message || "Inbox scan failed" },
      { status: 500 }
    );
  }
}
