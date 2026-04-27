import { NextRequest, NextResponse } from "next/server";
import { getCreditToken, canScan, consumeCredit, getCredits } from "@/lib/credits";
import { parseEmailHeaders } from "@/lib/parser";
import { analyzeEmail } from "@/lib/grok";

/* ════════════════════════════════════════════════════════════════
   PHISHFILTER — AGENT SCAN ENDPOINT
   Streamlined API for AI agents to submit emails for analysis.
   Returns structured, machine-readable threat reports.
   
   Authentication: x-credit-token header (from purchase flow)
   Payment: HTTP 402 with purchase instructions when no credits
   ════════════════════════════════════════════════════════════════ */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ── 1. Parse request ──
    const body = await request.json();
    const { emailContent } = body;

    if (!emailContent || typeof emailContent !== "string") {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "emailContent is required and must be a string",
          example: { emailContent: "From: sender@example.com\nSubject: ...\n\nEmail body..." },
        },
        { status: 400 }
      );
    }

    // ── 2. Credit check ──
    const creditToken = getCreditToken(request.headers);
    const credits = getCredits(creditToken);

    if (!canScan(creditToken)) {
      return NextResponse.json(
        {
          error: "NO_CREDITS",
          message: "Insufficient scan credits. Purchase more to continue.",
          credits: {
            remaining: credits.credits,
            freeScansRemaining: credits.freeScansRemaining,
            isPro: credits.isPro,
          },
          purchase: {
            endpoint: `${APP_URL}/api/agent/purchase`,
            method: "POST",
            body: { planId: "single_scan" },
            availablePlans: ["single_scan", "scan_pack_15", "pro_monthly"],
            currency: "USDC",
          },
          x402: {
            paymentRequired: true,
            paymentUrl: `${APP_URL}/api/agent/purchase`,
          },
        },
        { status: 402 }
      );
    }

    // Deduct credit
    const deducted = consumeCredit(creditToken);
    if (!deducted) {
      return NextResponse.json(
        { error: "CREDIT_ERROR", message: "Failed to deduct credit" },
        { status: 500 }
      );
    }

    // ── 3. Parse email ──
    const parsed = parseEmailHeaders(emailContent);

    // ── 4. AI Analysis (Grok) ──
    let analysis: Awaited<ReturnType<typeof analyzeEmail>> | null = null;
    try {
      analysis = await analyzeEmail(
        emailContent,
        null, // firecrawl results (skipped for agent speed)
        null, // virustotal results (skipped for agent speed)
        ""   // screenshot url
      );
    } catch (err) {
      console.error("[Agent Scan] Grok analysis failed:", err);
      analysis = null;
    }

    const updatedCredits = getCredits(creditToken);
    const elapsed = Date.now() - startTime;

    // Map verdict to agent-friendly format
    const verdictMap: Record<string, string> = {
      HIGH_RISK: "DANGEROUS",
      MEDIUM_RISK: "SUSPICIOUS",
      SAFE: "SAFE",
    };

    // ── 5. Structured response ──
    return NextResponse.json({
      success: true,
      scan: {
        id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        durationMs: elapsed,
      },
      email: {
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        date: parsed.date,
        urlsFound: parsed.urls.length,
        ipsFound: parsed.ipAddresses.length,
        hops: parsed.receivedHops.length,
      },
      authentication: {
        spf: parsed.spf,
        dkim: parsed.dkim,
        dmarc: parsed.dmarc,
      },
      threat: analysis
        ? {
            score: analysis.overallScore ?? 0,
            verdict: verdictMap[analysis.verdict] ?? analysis.verdict,
            summary: analysis.summary ?? "Analysis unavailable",
          }
        : {
            score: 0,
            verdict: "ANALYSIS_UNAVAILABLE",
            summary: "AI analysis was unavailable. Email parsed successfully.",
          },
      indicators: {
        urls: parsed.urls.slice(0, 10),
        ipAddresses: parsed.ipAddresses.slice(0, 10),
        signals: analysis?.signals?.map((s) => ({
          check: s.check,
          status: s.status,
          severity: s.severity,
          detail: s.detail,
        })) ?? [],
      },
      credits: {
        remaining: updatedCredits.credits,
        freeScansRemaining: updatedCredits.freeScansRemaining,
        isPro: updatedCredits.isPro,
        totalUsed: updatedCredits.totalUsed,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("[Agent Scan] Error:", e);
    return NextResponse.json(
      { error: "SCAN_FAILED", message: e.message || "Analysis pipeline error" },
      { status: 500 }
    );
  }
}

// GET — endpoint documentation
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/agent/scan",
    method: "POST",
    description: "Submit an email for AI-powered phishing analysis",
    authentication: {
      type: "header",
      header: "x-credit-token",
      description: "Credit token from purchase flow. Free tier available (3/day).",
    },
    requestBody: {
      emailContent: "string — raw email content including headers and body",
    },
    responseSchema: {
      success: "boolean",
      scan: { id: "string", timestamp: "ISO 8601", durationMs: "number" },
      email: { from: "string", to: "string", subject: "string", urlsFound: "number" },
      authentication: { spf: "string", dkim: "string", dmarc: "string" },
      threat: { score: "0-100", verdict: "SAFE|SUSPICIOUS|DANGEROUS", summary: "string" },
      credits: { remaining: "number", freeScansRemaining: "number" },
    },
    errorCodes: {
      "400": "Invalid request — missing emailContent",
      "402": "No credits — includes purchase instructions",
      "500": "Analysis pipeline error",
    },
    example: {
      curl: `curl -X POST ${APP_URL}/api/agent/scan -H "Content-Type: application/json" -H "x-credit-token: YOUR_TOKEN" -d '{"emailContent": "From: test@example.com\\nSubject: Test\\n\\nHello"}'`,
    },
  });
}
