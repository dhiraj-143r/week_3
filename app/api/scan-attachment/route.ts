/**
 * POST /api/scan-attachment
 *
 * Receives a file upload (PDF, Image, HTML) and scans it for phishing.
 * Uses multipart form data.
 *
 * Returns: AttachmentResult with verdict, signals, extracted URLs, and AI analysis.
 */

import { NextRequest, NextResponse } from "next/server";
import { scanAttachment } from "@/lib/attachment-scanner";

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/html",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const mimeType = file.type || "application/octet-stream";
    const isAllowed = ALLOWED_TYPES.some((t) => mimeType.startsWith(t.split("/")[0]) || mimeType === t);
    if (!isAllowed && !file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Supported: PDF, Images (JPEG/PNG/GIF/WebP), HTML` },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Attachment API] Scanning: ${file.name} (${mimeType}, ${(file.size / 1024).toFixed(1)}KB)`);

    // Run the scanner
    const result = await scanAttachment(buffer, file.name, mimeType);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Attachment API] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Attachment scan failed" },
      { status: 500 }
    );
  }
}
