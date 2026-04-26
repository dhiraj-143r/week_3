/**
 * POST /api/analyze
 *
 * Main email analysis pipeline. Orchestrates all enrichment tools
 * in parallel where possible, then feeds everything into Grok for
 * the final phishing verdict.
 *
 * Pipeline:
 *  1. Parse email → extract URLs, IPs, headers
 *  2. In parallel:
 *     a. Firecrawl all URLs (unshorten + scrape content)
 *     b. VirusTotal scan all URLs
 *     c. IPinfo lookup all header IPs
 *  3. Screenshot the first suspicious URL
 *  4. Feed all results into Grok analyzeEmail()
 *  5. Return full forensic report JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { parseEmailHeaders } from "@/lib/parser";
import { scrapeUrls } from "@/lib/firecrawl";
import { scanUrlsVirusTotal, getIpsInfo, getScreenshot } from "@/lib/locus";
import { analyzeEmail } from "@/lib/grok";
import { sandboxScanUrls, LinkAnalysis } from "@/lib/sandbox";

// ── Types ──────────────────────────────────────────────────────────────

interface AnalyzeRequest {
  emailContent: string;
  userEmail?: string;
  userPhone?: string;
}

interface PipelineTimings {
  parsing: number;
  firecrawl: number;
  virusTotal: number;
  ipInfo: number;
  screenshot: number;
  grokAnalysis: number;
  total: number;
}

// ── Timeout Utility ────────────────────────────────────────────────────

/**
 * Wrap a promise with a timeout. If the promise doesn't resolve
 * within the given milliseconds, reject with a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[Timeout] ${label} exceeded ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Safely run an async operation. If it throws, log the error
 * and return the fallback value instead.
 */
async function safeRun<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[Pipeline] ${label} failed:`, error);
    return fallback;
  }
}

// ── Route Handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const pipelineStart = Date.now();
  const timings: Partial<PipelineTimings> = {};

  try {
    // ── 1. Parse request ───────────────────────────────────────────
    const body: AnalyzeRequest = await request.json();
    const { emailContent } = body;

    if (!emailContent || typeof emailContent !== "string") {
      return NextResponse.json(
        { error: "emailContent is required and must be a string" },
        { status: 400 }
      );
    }

    if (emailContent.length > 500000) {
      return NextResponse.json(
        { error: "Email content exceeds maximum allowed size (500KB)" },
        { status: 413 }
      );
    }

    // ── 2. Parse email headers and body ────────────────────────────
    const parseStart = Date.now();
    const parsed = parseEmailHeaders(emailContent);
    timings.parsing = Date.now() - parseStart;

    console.log(`[Pipeline] Parsed email — ${parsed.urls.length} URLs, ${parsed.ipAddresses.length} IPs, ${parsed.receivedHops.length} hops`);

    // ── 3. Run enrichment tools in parallel ────────────────────────
    // Firecrawl, VirusTotal, and IPinfo can all run simultaneously
    const enrichmentStart = Date.now();

    const [firecrawlResults, virusTotalResults, ipInfoResults, sandboxResults] = await Promise.all([
      // 3a. Firecrawl all extracted URLs
      safeRun(
        () => withTimeout(scrapeUrls(parsed.urls), 20000, "Firecrawl"),
        {},
        "Firecrawl URL scraping"
      ),

      // 3b. VirusTotal scan all URLs
      safeRun(
        () => withTimeout(scanUrlsVirusTotal(parsed.urls), 15000, "VirusTotal"),
        {},
        "VirusTotal URL scanning"
      ),

      // 3c. IPinfo lookup all header IPs
      safeRun(
        () => withTimeout(getIpsInfo(parsed.ipAddresses), 10000, "IPinfo"),
        {},
        "IPinfo IP lookups"
      ),

      // 3d. Sandbox scan all URLs (redirect chain + analysis)
      safeRun(
        () => withTimeout(sandboxScanUrls(parsed.urls), 25000, "Sandbox"),
        [] as LinkAnalysis[],
        "Sandbox URL scanning"
      ),
    ]);

    timings.firecrawl = Date.now() - enrichmentStart;
    timings.virusTotal = Date.now() - enrichmentStart;
    timings.ipInfo = Date.now() - enrichmentStart;

    console.log(`[Pipeline] Enrichment complete — FC: ${Object.keys(firecrawlResults).length} URLs, VT: ${Object.keys(virusTotalResults).length} URLs, IP: ${Object.keys(ipInfoResults).length} IPs, Sandbox: ${sandboxResults.length} links`);

    // ── 4. Screenshot the first suspicious URL ─────────────────────
    const screenshotStart = Date.now();
    let screenshotUrl = "";

    // Find the first URL flagged as malicious by VirusTotal
    const suspiciousUrl = parsed.urls.find(
      (url) => virusTotalResults[url]?.isMalicious
    );

    // If no VT-flagged URL, just screenshot the first URL
    const urlToScreenshot = suspiciousUrl || parsed.urls[0];

    if (urlToScreenshot) {
      const screenshotResult = await safeRun(
        () => withTimeout(getScreenshot(urlToScreenshot), 15000, "Screenshot"),
        { screenshotUrl: "" },
        "Screenshot capture"
      );
      screenshotUrl = screenshotResult.screenshotUrl;
    }

    timings.screenshot = Date.now() - screenshotStart;

    // ── 5. Feed everything into Grok for analysis ──────────────────
    const grokStart = Date.now();

    // Combine all enrichment data for Grok
    const enrichmentPayload = {
      parsedEmail: {
        from: parsed.from,
        returnPath: parsed.returnPath,
        replyTo: parsed.replyTo,
        subject: parsed.subject,
        senderDomain: parsed.senderDomain,
        spf: parsed.spf,
        dkim: parsed.dkim,
        dmarc: parsed.dmarc,
        hops: parsed.receivedHops,
        ipAddresses: parsed.ipAddresses,
        urls: parsed.urls,
      },
      firecrawl: firecrawlResults,
      ipInfo: ipInfoResults,
    };

    const grokResult = await withTimeout(
      analyzeEmail(
        emailContent,
        enrichmentPayload as Record<string, unknown>,
        virusTotalResults as unknown as Record<string, unknown>,
        screenshotUrl
      ),
      90000,
      "AI Analysis"
    );

    timings.grokAnalysis = Date.now() - grokStart;
    timings.total = Date.now() - pipelineStart;

    console.log(`[Pipeline] Complete in ${timings.total}ms`);

    // ── 6. Build and return the full report ────────────────────────
    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      analysis: grokResult,
      enrichment: {
        firecrawl: firecrawlResults,
        virusTotal: virusTotalResults,
        ipInfo: ipInfoResults,
        screenshot: {
          url: urlToScreenshot || null,
          screenshotUrl: screenshotUrl || null,
        },
        sandbox: sandboxResults,
      },
      parsed: {
        from: parsed.from,
        returnPath: parsed.returnPath,
        replyTo: parsed.replyTo,
        subject: parsed.subject,
        senderDomain: parsed.senderDomain,
        urls: parsed.urls,
        ipAddresses: parsed.ipAddresses,
        hops: parsed.receivedHops,
        spf: parsed.spf,
        dkim: parsed.dkim,
        dmarc: parsed.dmarc,
      },
      timings,
    };

    // ── 7. Fire notifications in background (non-blocking) ──────────
    if (body.userEmail || body.userPhone) {
      fetch(`${request.nextUrl.origin}/api/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report,
          userEmail: body.userEmail,
          userPhone: body.userPhone,
          verdict: grokResult.verdict,
        }),
      }).catch((err) => console.error("[Pipeline] Notify fire-and-forget failed:", err));
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    const err = error as { message?: string };
    const totalTime = Date.now() - pipelineStart;

    console.error(`[Pipeline] Fatal error after ${totalTime}ms:`, err.message);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Analysis pipeline failed",
        timestamp: new Date().toISOString(),
        timings: { ...timings, total: totalTime },
      },
      { status: 500 }
    );
  }
}
