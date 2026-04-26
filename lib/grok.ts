/**
 * AI integration for email phishing analysis.
 * Uses Claude (Anthropic) as primary, Gemini and Grok as fallbacks.
 */

import axios from "axios";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_BASE_URL = "https://api.x.ai/v1";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-2.0-flash";
const GROK_FALLBACK_MODEL = "grok-3-beta";

const SYSTEM_PROMPT = `You are a world-class cybersecurity expert and phishing detection AI. 
Analyze the provided email data and return ONLY a valid JSON object with no markdown, 
no explanation, just raw JSON.

Return this exact structure:
{
  "verdict": "HIGH_RISK" | "MEDIUM_RISK" | "SAFE",
  "overallScore": number (0-100, 100 = definitely phishing),
  "signals": [
    {
      "check": string,
      "status": "FAIL" | "WARN" | "PASS",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "detail": string (plain English explanation),
      "technical": string (technical detail for experts)
    }
  ],
  "senderAnalysis": {
    "fromDomain": string,
    "returnPathDomain": string,
    "mismatch": boolean,
    "explanation": string
  },
  "urlAnalysis": [
    {
      "original": string,
      "unshortened": string,
      "isSuspicious": boolean,
      "reason": string,
      "virusTotalScore": string,
      "screenshotUrl": string
    }
  ],
  "homographAnalysis": {
    "detected": boolean,
    "domains": [],
    "explanation": string
  },
  "headerAnalysis": {
    "hops": number,
    "suspiciousHops": [],
    "explanation": string
  },
  "replicaDetection": {
    "targetBrand": string,
    "similarityScore": number,
    "explanation": string
  },
  "summary": string (2-3 sentences plain English for non-technical users),
  "technicalSummary": string (detailed for security professionals)
}`;

// ── Types ──────────────────────────────────────────────────────────────

export interface Signal {
  check: string;
  status: "FAIL" | "WARN" | "PASS";
  severity: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  technical: string;
}

export interface SenderAnalysis {
  fromDomain: string;
  returnPathDomain: string;
  mismatch: boolean;
  explanation: string;
}

export interface UrlAnalysisItem {
  original: string;
  unshortened: string;
  isSuspicious: boolean;
  reason: string;
  virusTotalScore: string;
  screenshotUrl: string;
}

export interface HomographAnalysis {
  detected: boolean;
  domains: string[];
  explanation: string;
}

export interface HeaderAnalysis {
  hops: number;
  suspiciousHops: string[];
  explanation: string;
}

export interface ReplicaDetection {
  targetBrand: string;
  similarityScore: number;
  explanation: string;
}

export interface GrokAnalysisResult {
  verdict: "HIGH_RISK" | "MEDIUM_RISK" | "SAFE";
  overallScore: number;
  signals: Signal[];
  senderAnalysis: SenderAnalysis;
  urlAnalysis: UrlAnalysisItem[];
  homographAnalysis: HomographAnalysis;
  headerAnalysis: HeaderAnalysis;
  replicaDetection: ReplicaDetection;
  summary: string;
  technicalSummary: string;
}

// ── Main Analysis Function ─────────────────────────────────────────────

/**
 * Send email data plus all enrichment results to Grok for
 * comprehensive phishing analysis.
 */
export async function analyzeEmail(
  emailContent: string,
  firecrawlResults: Record<string, unknown> | null,
  virusTotalResults: Record<string, unknown> | null,
  screenshotUrl: string
): Promise<GrokAnalysisResult> {
  if (!ANTHROPIC_API_KEY && !GEMINI_API_KEY && !GROK_API_KEY) {
    throw new Error("No AI API key configured (ANTHROPIC_API_KEY, GEMINI_API_KEY, or GROK_API_KEY)");
  }

  // Build the user prompt with all available data
  const userPrompt = buildUserPrompt(emailContent, firecrawlResults, virusTotalResults, screenshotUrl);

  // Try Gemini → Claude → Grok
  let response: string | undefined;
  const errors: string[] = [];

  // 1. Gemini (primary)
  if (!response && GEMINI_API_KEY) {
    try {
      console.log(`[AI] Trying Gemini (${GEMINI_MODEL})...`);
      response = await callGeminiAPI(userPrompt);
      console.log(`[AI] Gemini succeeded`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.warn(`[AI] Gemini failed:`, err.message);
      errors.push(`Gemini: ${err.message}`);
    }
  }

  // 2. Claude (fallback)
  if (!response && ANTHROPIC_API_KEY) {
    try {
      console.log(`[AI] Trying Claude (${CLAUDE_MODEL})...`);
      response = await callClaudeAPI(userPrompt);
      console.log(`[AI] Claude succeeded`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.warn(`[AI] Claude failed:`, err.message);
      errors.push(`Claude: ${err.message}`);
    }
  }

  if (!response) {
    throw new Error(`All AI engines failed: ${errors.join(" | ")}`);
  }

  // Parse the response
  return parseGrokResponse(response);
}

/**
 * Strip HTML bloat from email content, keeping only meaningful text + URLs.
 * This prevents AI timeouts on heavy marketing emails.
 */
function sanitizeEmailContent(raw: string): string {
  let text = raw;

  // 1. Preserve all URLs before stripping tags
  const urlMatches = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];

  // 2. Keep email headers (everything before the first HTML tag or blank line block)
  const headerEndIdx = text.search(/<(!DOCTYPE|html|head|body|div|table|style)/i);
  const headers = headerEndIdx > 0 ? text.substring(0, headerEndIdx) : "";

  // 3. Strip <style>...</style>, <script>...</script>, HTML comments
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // 4. Replace <br>, <p>, <div>, <tr>, <li> with newlines for readability
  text = text.replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])[^>]*>/gi, "\n");

  // 5. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // 6. Decode common HTML entities
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&#\d+;/g, "");

  // 7. Collapse excessive whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  // 8. Reconstruct: headers + cleaned body + unique URLs
  const uniqueUrls = [...new Set(urlMatches)];
  const urlSection = uniqueUrls.length > 0
    ? `\n\n=== EXTRACTED URLs ===\n${uniqueUrls.join("\n")}`
    : "";

  const combined = (headers ? headers.trim() + "\n\n=== EMAIL BODY (cleaned) ===\n" : "") + text + urlSection;

  // 9. Truncate to ~12K chars to stay well within AI context limits
  const MAX_CHARS = 12000;
  if (combined.length > MAX_CHARS) {
    return combined.substring(0, MAX_CHARS) + `\n\n[... truncated from ${combined.length} chars]`;
  }

  return combined;
}

/**
 * Build the user message combining email content and all enrichment data.
 */
function buildUserPrompt(
  emailContent: string,
  firecrawlResults: Record<string, unknown> | null,
  virusTotalResults: Record<string, unknown> | null,
  screenshotUrl: string
): string {
  const cleanedContent = sanitizeEmailContent(emailContent);

  let prompt = `ANALYZE THIS EMAIL FOR PHISHING:\n\n`;
  prompt += `=== RAW EMAIL CONTENT ===\n${cleanedContent}\n\n`;

  if (firecrawlResults) {
    prompt += `=== FIRECRAWL URL ANALYSIS ===\n${JSON.stringify(firecrawlResults, null, 2)}\n\n`;
  }

  if (virusTotalResults) {
    prompt += `=== VIRUSTOTAL RESULTS ===\n${JSON.stringify(virusTotalResults, null, 2)}\n\n`;
  }

  if (screenshotUrl) {
    prompt += `=== SCREENSHOT URL ===\n${screenshotUrl}\n\n`;
  }

  prompt += `Analyze all the above data thoroughly. Check for domain mismatches, homograph attacks, suspicious URLs, header anomalies, brand impersonation, and any other phishing indicators. Return ONLY the JSON response.`;

  return prompt;
}

/**
 * Call Anthropic Claude API (Messages endpoint).
 */
async function callClaudeAPI(userPrompt: string): Promise<string> {
  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt },
      ],
    },
    {
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      timeout: 90000,
    }
  );

  const content = response.data?.content?.[0]?.text;
  if (!content) {
    throw new Error("Empty response from Claude API");
  }

  return content;
}

/**
 * Call Google Gemini API.
 */
async function callGeminiAPI(userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await axios.post(
    url,
    {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT + "\n\n" + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 90000,
    }
  );

  const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Empty response from Gemini API");
  }

  return content;
}

/**
 * Call xAI Grok API (OpenAI-compatible chat completions endpoint).
 */
async function callGrokAPI(model: string, userPrompt: string): Promise<string> {
  const response = await axios.post(
    `${GROK_BASE_URL}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    },
    {
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 90000,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from Grok API");
  }

  return content;
}

/**
 * Parse the raw Grok response string into a typed GrokAnalysisResult.
 * Handles cases where the model wraps JSON in markdown code fences.
 */
function parseGrokResponse(rawResponse: string): GrokAnalysisResult {
  // Strip markdown code fences if present
  let cleaned = rawResponse.trim();

  // Remove ```json ... ``` wrapping
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // Try to extract JSON object from the response
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in Grok response");
  }

  const jsonString = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonString) as GrokAnalysisResult;
    return validateAndNormalize(parsed);
  } catch (parseError) {
    console.error("[Grok] JSON parse error:", parseError);
    console.error("[Grok] Raw response:", rawResponse.substring(0, 500));
    throw new Error("Failed to parse Grok response as JSON");
  }
}

/**
 * Validate and normalize the parsed result, filling in any missing
 * fields with sensible defaults so downstream code never crashes.
 */
function validateAndNormalize(result: Partial<GrokAnalysisResult>): GrokAnalysisResult {
  return {
    verdict: result.verdict || "MEDIUM_RISK",
    overallScore: typeof result.overallScore === "number" ? Math.min(100, Math.max(0, result.overallScore)) : 50,
    signals: Array.isArray(result.signals) ? result.signals : [],
    senderAnalysis: {
      fromDomain: result.senderAnalysis?.fromDomain || "unknown",
      returnPathDomain: result.senderAnalysis?.returnPathDomain || "unknown",
      mismatch: result.senderAnalysis?.mismatch ?? false,
      explanation: result.senderAnalysis?.explanation || "No sender analysis available",
    },
    urlAnalysis: Array.isArray(result.urlAnalysis) ? result.urlAnalysis : [],
    homographAnalysis: {
      detected: result.homographAnalysis?.detected ?? false,
      domains: Array.isArray(result.homographAnalysis?.domains) ? result.homographAnalysis.domains : [],
      explanation: result.homographAnalysis?.explanation || "No homograph analysis available",
    },
    headerAnalysis: {
      hops: result.headerAnalysis?.hops ?? 0,
      suspiciousHops: Array.isArray(result.headerAnalysis?.suspiciousHops) ? result.headerAnalysis.suspiciousHops : [],
      explanation: result.headerAnalysis?.explanation || "No header analysis available",
    },
    replicaDetection: {
      targetBrand: result.replicaDetection?.targetBrand || "none",
      similarityScore: typeof result.replicaDetection?.similarityScore === "number" ? result.replicaDetection.similarityScore : 0,
      explanation: result.replicaDetection?.explanation || "No replica detection analysis available",
    },
    summary: result.summary || "Analysis completed — review signals for details.",
    technicalSummary: result.technicalSummary || "See individual signal checks for technical details.",
  };
}
