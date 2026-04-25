/**
 * Attachment Scanner — Analyzes PDF and image attachments for phishing.
 *
 * Pipeline:
 *   PDF  → extract text + URLs → VirusTotal + Claude AI analysis
 *   Image → Claude Vision (brand impersonation, QR codes, fake login pages)
 *   Both → extract URLs → run through existing enrichment pipeline
 */

import axios from "axios";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = "claude-sonnet-4-6";

// ── Types ──────────────────────────────────────────────────────────────

export interface AttachmentResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
  score: number;
  summary: string;
  signals: AttachmentSignal[];
  extractedUrls: string[];
  extractedText?: string;
  qrCodeUrls?: string[];
  visionAnalysis?: string;
}

export interface AttachmentSignal {
  check: string;
  status: "FAIL" | "WARN" | "PASS";
  severity: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
}

// ── Main Scanner ───────────────────────────────────────────────────────

export async function scanAttachment(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<AttachmentResult> {
  const fileSize = fileBuffer.length;
  const fileType = mimeType;

  console.log(`[Attachment] Scanning ${fileName} (${mimeType}, ${(fileSize / 1024).toFixed(1)}KB)`);

  if (mimeType === "application/pdf") {
    return scanPDF(fileBuffer, fileName, fileSize);
  } else if (mimeType.startsWith("image/")) {
    return scanImage(fileBuffer, fileName, fileSize, mimeType);
  } else if (mimeType === "text/html" || fileName.endsWith(".html") || fileName.endsWith(".htm")) {
    return scanHTML(fileBuffer, fileName, fileSize);
  } else {
    return {
      fileName,
      fileType,
      fileSize,
      verdict: "MEDIUM_RISK",
      score: 50,
      summary: `Unsupported file type: ${mimeType}. Unable to perform deep analysis.`,
      signals: [{
        check: "Unsupported Format",
        status: "WARN",
        severity: "MEDIUM",
        detail: `File type ${mimeType} is not fully supported for scanning.`,
      }],
      extractedUrls: [],
    };
  }
}

// ── PDF Scanner ────────────────────────────────────────────────────────

async function scanPDF(
  buffer: Buffer,
  fileName: string,
  fileSize: number
): Promise<AttachmentResult> {
  const signals: AttachmentSignal[] = [];
  let extractedText = "";
  let extractedUrls: string[] = [];

  // 1. Send PDF to Claude for full analysis (Claude reads PDFs natively)
  let visionAnalysis = "";
  if (ANTHROPIC_API_KEY) {
    try {
      const base64 = buffer.toString("base64");

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: base64 },
                },
                {
                  type: "text",
                  text: `You are a cybersecurity expert analyzing a PDF email attachment for phishing.

Analyze this PDF and return ONLY a JSON object:
{
  "verdict": "HIGH_RISK" | "MEDIUM_RISK" | "SAFE",
  "score": number (0-100),
  "extractedText": string (first 1000 chars of text content),
  "urls": [string] (all URLs found),
  "signals": [
    { "check": string, "status": "FAIL"|"WARN"|"PASS", "severity": "HIGH"|"MEDIUM"|"LOW", "detail": string }
  ],
  "summary": string (2-3 sentence security analysis)
}`,
                },
              ],
            },
          ],
        },
        {
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          timeout: 45000,
        }
      );

      const content = response.data?.content?.[0]?.text || "";
      const cleanJson = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      visionAnalysis = parsed.summary || "";
      extractedText = parsed.extractedText || "";
      extractedUrls = parsed.urls || extractUrlsFromText(extractedText);
      if (parsed.signals) signals.push(...parsed.signals);

      const score = parsed.score || 0;
      const verdict = parsed.verdict || (score >= 60 ? "HIGH_RISK" : score >= 30 ? "MEDIUM_RISK" : "SAFE");

      console.log(`[Attachment] Claude PDF analysis: ${verdict} (${score})`);

      return {
        fileName, fileType: "application/pdf", fileSize, verdict, score,
        summary: visionAnalysis, signals, extractedUrls,
        extractedText: extractedText.slice(0, 2000), visionAnalysis,
      };
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.warn("[Attachment] Claude PDF analysis failed:", err.message);
    }
  }

  // 2. Fallback: basic text extraction from raw buffer
  try {
    const rawText = buffer.toString("utf-8");
    // Extract readable ASCII text from PDF binary
    const textMatches = rawText.match(/[\x20-\x7E]{10,}/g) || [];
    extractedText = textMatches.join(" ").slice(0, 3000);
    extractedUrls = extractUrlsFromText(extractedText);
  } catch {
    // ignore
  }

  // 3. Text-based pattern matching (fallback)
  const textLower = extractedText.toLowerCase();

  // Urgency language
  const urgencyTerms = ["urgent", "immediately", "suspended", "verify your", "within 24", "act now", "expire", "unauthorized", "confirm your identity"];
  const foundUrgency = urgencyTerms.filter((t) => textLower.includes(t));
  if (foundUrgency.length >= 2) {
    signals.push({
      check: "Urgency Language",
      status: "FAIL",
      severity: "HIGH",
      detail: `PDF contains multiple urgency phrases: ${foundUrgency.join(", ")}`,
    });
  } else if (foundUrgency.length === 1) {
    signals.push({
      check: "Urgency Language",
      status: "WARN",
      severity: "MEDIUM",
      detail: `PDF contains urgency phrase: "${foundUrgency[0]}"`,
    });
  }

  // Credential harvesting language
  const credTerms = ["password", "login", "username", "credential", "ssn", "social security", "bank account", "credit card", "cvv", "otp"];
  const foundCreds = credTerms.filter((t) => textLower.includes(t));
  if (foundCreds.length >= 2) {
    signals.push({
      check: "Credential Request",
      status: "FAIL",
      severity: "HIGH",
      detail: `PDF asks for sensitive information: ${foundCreds.join(", ")}`,
    });
  }

  // Financial language (invoice scams)
  const financeTerms = ["invoice", "payment due", "wire transfer", "bitcoin", "gift card", "western union", "account number"];
  const foundFinance = financeTerms.filter((t) => textLower.includes(t));
  if (foundFinance.length >= 2) {
    signals.push({
      check: "Financial Language",
      status: "WARN",
      severity: "MEDIUM",
      detail: `PDF contains financial terms: ${foundFinance.join(", ")}. Verify authenticity.`,
    });
  }

  // 3. Check extracted URLs
  if (extractedUrls.length > 0) {
    const suspiciousUrlCount = extractedUrls.filter(
      (u) => u.includes("bit.ly") || u.includes("tinyurl") || u.includes("t.co") || !u.includes("https")
    ).length;

    if (suspiciousUrlCount > 0) {
      signals.push({
        check: "Suspicious URLs in PDF",
        status: "FAIL",
        severity: "HIGH",
        detail: `Found ${suspiciousUrlCount} suspicious/shortened URLs in the PDF.`,
      });
    } else {
      signals.push({
        check: "URLs Found",
        status: "WARN",
        severity: "LOW",
        detail: `PDF contains ${extractedUrls.length} URLs. Review them for legitimacy.`,
      });
    }
  }

  // 5. Calculate score
  const failCount = signals.filter((s) => s.status === "FAIL").length;
  const warnCount = signals.filter((s) => s.status === "WARN").length;
  const score = Math.min(100, failCount * 25 + warnCount * 10 + (extractedUrls.length > 3 ? 15 : 0));

  const verdict = score >= 60 ? "HIGH_RISK" : score >= 30 ? "MEDIUM_RISK" : "SAFE";

  return {
    fileName,
    fileType: "application/pdf",
    fileSize,
    verdict,
    score,
    summary: visionAnalysis || generateSummary(fileName, verdict, signals),
    signals,
    extractedUrls,
    extractedText: extractedText.slice(0, 2000), // Limit stored text
    visionAnalysis,
  };
}

// ── Image Scanner ──────────────────────────────────────────────────────

async function scanImage(
  buffer: Buffer,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<AttachmentResult> {
  const signals: AttachmentSignal[] = [];
  const extractedUrls: string[] = [];
  let visionAnalysis = "";

  // 1. Claude Vision — analyze the image for phishing content
  if (ANTHROPIC_API_KEY) {
    try {
      const base64 = buffer.toString("base64");
      const mediaType = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: `You are a cybersecurity expert analyzing an email attachment image for phishing indicators.

Analyze this image and return ONLY a JSON object:
{
  "verdict": "HIGH_RISK" | "MEDIUM_RISK" | "SAFE",
  "score": number (0-100),
  "description": string (what you see in the image),
  "isLoginPage": boolean,
  "isFakeInvoice": boolean,
  "hasQRCode": boolean,
  "qrCodeUrl": string or null,
  "brandImpersonation": string or null (e.g., "PayPal", "Microsoft"),
  "urgencyTactics": boolean,
  "signals": [
    { "check": string, "status": "FAIL"|"WARN"|"PASS", "severity": "HIGH"|"MEDIUM"|"LOW", "detail": string }
  ],
  "summary": string (2-3 sentence analysis)
}`,
                },
              ],
            },
          ],
        },
        {
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const content = response.data?.content?.[0]?.text || "";
      console.log("[Attachment] Claude Vision response received");

      // Parse Claude's response
      try {
        const cleanJson = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        visionAnalysis = parsed.summary || parsed.description || "";

        // Add signals from vision analysis
        if (parsed.signals) {
          signals.push(...parsed.signals);
        }

        if (parsed.isLoginPage) {
          signals.push({
            check: "Fake Login Page",
            status: "FAIL",
            severity: "HIGH",
            detail: `Image appears to be a ${parsed.brandImpersonation ? parsed.brandImpersonation + " " : ""}login page — likely credential harvesting.`,
          });
        }

        if (parsed.hasQRCode) {
          signals.push({
            check: "QR Code Detected",
            status: "WARN",
            severity: "MEDIUM",
            detail: parsed.qrCodeUrl
              ? `QR code detected linking to: ${parsed.qrCodeUrl}`
              : "QR code detected in image. Could redirect to a phishing site.",
          });
          if (parsed.qrCodeUrl) extractedUrls.push(parsed.qrCodeUrl);
        }

        if (parsed.brandImpersonation) {
          signals.push({
            check: "Brand Impersonation",
            status: "FAIL",
            severity: "HIGH",
            detail: `Image appears to impersonate ${parsed.brandImpersonation}.`,
          });
        }

        if (parsed.isFakeInvoice) {
          signals.push({
            check: "Fake Invoice",
            status: "FAIL",
            severity: "HIGH",
            detail: "Image appears to be a fake invoice or payment document.",
          });
        }

        // Use Claude's score if available
        const score = parsed.score || 0;
        const verdict = parsed.verdict || (score >= 60 ? "HIGH_RISK" : score >= 30 ? "MEDIUM_RISK" : "SAFE");

        return {
          fileName,
          fileType: mimeType,
          fileSize,
          verdict,
          score,
          summary: visionAnalysis,
          signals,
          extractedUrls,
          visionAnalysis,
        };
      } catch {
        // If JSON parsing fails, use raw text
        visionAnalysis = content;
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("[Attachment] Claude Vision failed:", err.message);
    }
  }

  // Fallback if Claude Vision didn't work
  signals.push({
    check: "Image Analysis",
    status: "WARN",
    severity: "LOW",
    detail: "Basic image analysis performed. Visual content could not be fully verified.",
  });

  return {
    fileName,
    fileType: mimeType,
    fileSize,
    verdict: "MEDIUM_RISK",
    score: 40,
    summary: visionAnalysis || "Image attachment detected. Could not perform full visual analysis.",
    signals,
    extractedUrls,
    visionAnalysis,
  };
}

// ── HTML Attachment Scanner ────────────────────────────────────────────

async function scanHTML(
  buffer: Buffer,
  fileName: string,
  fileSize: number
): Promise<AttachmentResult> {
  const signals: AttachmentSignal[] = [];
  const htmlContent = buffer.toString("utf-8");
  const extractedUrls = extractUrlsFromText(htmlContent);

  // Check for form elements (credential harvesting)
  const hasForm = /<form/i.test(htmlContent);
  const hasPasswordInput = /type\s*=\s*["']password["']/i.test(htmlContent);
  const hasLoginTerms = /login|sign.?in|username|email/i.test(htmlContent);
  const hasExternalAction = /action\s*=\s*["']https?:\/\//i.test(htmlContent);

  if (hasForm && hasPasswordInput) {
    signals.push({
      check: "Credential Harvesting Form",
      status: "FAIL",
      severity: "HIGH",
      detail: "HTML file contains a login form with password field — classic phishing technique.",
    });
  }

  if (hasExternalAction) {
    signals.push({
      check: "External Form Submission",
      status: "FAIL",
      severity: "HIGH",
      detail: "Form submits data to an external server.",
    });
  }

  if (hasLoginTerms && !hasForm) {
    signals.push({
      check: "Login Page Content",
      status: "WARN",
      severity: "MEDIUM",
      detail: "HTML contains login-related content.",
    });
  }

  // Check for JavaScript (obfuscation, redirects)
  const hasScript = /<script/i.test(htmlContent);
  const hasObfuscation = /eval\(|unescape\(|atob\(|fromCharCode/i.test(htmlContent);

  if (hasObfuscation) {
    signals.push({
      check: "Obfuscated JavaScript",
      status: "FAIL",
      severity: "HIGH",
      detail: "HTML contains obfuscated JavaScript — commonly used to hide malicious redirects.",
    });
  } else if (hasScript) {
    signals.push({
      check: "JavaScript Detected",
      status: "WARN",
      severity: "MEDIUM",
      detail: "HTML contains JavaScript that could execute malicious actions.",
    });
  }

  // AI analysis
  let visionAnalysis = "";
  if (ANTHROPIC_API_KEY) {
    try {
      visionAnalysis = await analyzeWithClaudeText(htmlContent.slice(0, 3000), fileName, "HTML");
    } catch (e) {
      console.warn("[Attachment] Claude HTML analysis failed:", e);
    }
  }

  const failCount = signals.filter((s) => s.status === "FAIL").length;
  const warnCount = signals.filter((s) => s.status === "WARN").length;
  const score = Math.min(100, failCount * 30 + warnCount * 10);
  const verdict = score >= 60 ? "HIGH_RISK" : score >= 30 ? "MEDIUM_RISK" : "SAFE";

  return {
    fileName,
    fileType: "text/html",
    fileSize,
    verdict,
    score,
    summary: visionAnalysis || generateSummary(fileName, verdict, signals),
    signals,
    extractedUrls,
    extractedText: htmlContent.slice(0, 2000),
    visionAnalysis,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches)); // Deduplicate
}

async function analyzeWithClaudeText(content: string, fileName: string, fileType: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return "";

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system: "You are a cybersecurity expert. Analyze the provided content from an email attachment and give a brief 2-3 sentence verdict on whether it appears to be phishing/malicious. Be specific about what you found.",
      messages: [
        {
          role: "user",
          content: `Analyze this ${fileType} attachment named "${fileName}" for phishing indicators:\n\n${content.slice(0, 3000)}`,
        },
      ],
    },
    {
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return response.data?.content?.[0]?.text || "";
}

function generateSummary(fileName: string, verdict: string, signals: AttachmentSignal[]): string {
  const failSignals = signals.filter((s) => s.status === "FAIL");
  if (failSignals.length > 0) {
    return `The attachment "${fileName}" shows ${failSignals.length} critical phishing indicator(s): ${failSignals.map((s) => s.detail).join(". ")}`;
  }
  if (verdict === "MEDIUM_RISK") {
    return `The attachment "${fileName}" has some suspicious characteristics that warrant caution.`;
  }
  return `The attachment "${fileName}" appears to be safe based on automated analysis.`;
}
