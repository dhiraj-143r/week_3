import { NextRequest, NextResponse } from "next/server";
import { sandboxScanUrl } from "@/lib/sandbox";

/* ═══════════════════════════════════════════════════════════════════════
 * /api/sandbox — Safe Link Sandbox
 *
 * Accepts a URL, follows redirects server-side, and returns:
 *   - redirect chain
 *   - final destination
 *   - VirusTotal-style score
 *   - verdict
 *   - server location (via ipinfo)
 * ═══════════════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url: inputUrl } = body;

    if (!inputUrl || typeof inputUrl !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    let normalizedUrl = inputUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const result = await sandboxScanUrl(normalizedUrl);

    return NextResponse.json({
      ...result,
      screenshotUrl: null, // Would be populated by a real screenshot service
    });
  } catch (error) {
    console.error("Sandbox error:", error);
    return NextResponse.json({ error: "Failed to analyze URL" }, { status: 500 });
  }
}
