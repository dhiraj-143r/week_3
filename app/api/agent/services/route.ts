import { NextRequest, NextResponse } from "next/server";
import { PRICING_PLANS } from "@/lib/locus-checkout";

/* ════════════════════════════════════════════════════════════════
   PHISHFILTER — AGENT SERVICE CATALOG
   Machine-readable endpoint for AI agent discovery.
   Agents can query this to understand what PhishFilter offers,
   how to purchase credits, and how to call the scan API.
   ════════════════════════════════════════════════════════════════ */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  const catalog = {
    // ── Service Identity ──
    service: {
      name: "PhishFilter",
      version: "1.0.0",
      description:
        "AI-powered email phishing detection and forensic analysis service. " +
        "Analyzes email headers (SPF/DKIM/DMARC), scans embedded URLs via VirusTotal (70+ engines), " +
        "detects homograph attacks, and produces Grok AI forensic reports with threat scores.",
      category: "security",
      tags: ["phishing", "email-security", "threat-detection", "forensics", "ai-analysis"],
      provider: "PhishFilter",
      website: APP_URL,
    },

    // ── Capabilities ──
    capabilities: [
      {
        id: "email_scan",
        name: "Email Phishing Scan",
        description: "Full forensic analysis of a raw email including headers, URLs, IP tracing, and AI verdict",
        input: "Raw email content (headers + body)",
        output: "Structured threat report with score, verdict, and detailed analysis",
        latency: "15-45 seconds",
        accuracy: "95%+ detection rate using multi-engine analysis",
      },
      {
        id: "url_scan",
        name: "URL Safety Check",
        description: "Scan individual URLs against VirusTotal's 70+ security engines",
        input: "URL string",
        output: "Threat classification, engine detection counts, reputation score",
      },
      {
        id: "header_analysis",
        name: "Email Header Analysis",
        description: "Parse and validate SPF, DKIM, and DMARC authentication records",
        input: "Raw email headers",
        output: "Authentication results, hop analysis, IP geolocation",
      },
    ],

    // ── Pricing (Locus Checkout / USDC) ──
    pricing: {
      currency: "USDC",
      network: "Base",
      paymentProvider: "Locus",
      freeTier: {
        scansPerDay: 3,
        description: "3 free scans per day, no wallet required",
      },
      plans: Object.values(PRICING_PLANS).map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: "USDC",
        credits: plan.credits === -1 ? "unlimited" : plan.credits,
        description: plan.description,
        features: plan.features,
        purchaseEndpoint: `${APP_URL}/api/agent/purchase`,
        purchasePayload: { planId: plan.id },
      })),
    },

    // ── API Endpoints for Agents ──
    api: {
      baseUrl: APP_URL,
      authentication: {
        type: "header",
        headerName: "x-credit-token",
        description: "Credit token received after purchase. Include in all scan requests.",
      },
      endpoints: [
        {
          method: "GET",
          path: "/api/agent/services",
          description: "This endpoint. Returns service catalog and pricing.",
          authentication: false,
        },
        {
          method: "POST",
          path: "/api/agent/purchase",
          description: "Create a Locus Checkout session to purchase scan credits with USDC.",
          authentication: false,
          requestBody: {
            planId: "string — one of: single_scan, scan_pack_15, pro_monthly",
            agentId: "string (optional) — your agent identifier for credit tracking",
          },
          responseBody: {
            success: "boolean",
            checkoutUrl: "string — redirect or programmatically complete the USDC payment",
            creditToken: "string — use this token in subsequent scan requests",
            sessionId: "string — Locus session ID",
          },
        },
        {
          method: "POST",
          path: "/api/agent/scan",
          description: "Submit an email for phishing analysis. Requires credits.",
          authentication: true,
          requestBody: {
            emailContent: "string — raw email content including headers",
          },
          responseBody: {
            success: "boolean",
            threatScore: "number 0-100",
            verdict: "string — SAFE | SUSPICIOUS | DANGEROUS",
            analysis: "object — detailed forensic report",
            creditsRemaining: "number",
          },
          errorCodes: {
            "402": "No credits remaining. Purchase more via /api/agent/purchase",
            "400": "Invalid request body",
            "500": "Analysis pipeline error",
          },
        },
        {
          method: "GET",
          path: "/api/credits",
          description: "Check your remaining scan credits.",
          authentication: true,
          headers: { "x-credit-token": "your-credit-token" },
        },
      ],
    },

    // ── Discovery ──
    discovery: {
      skillFile: `${APP_URL}/skill.md`,
      aiPlugin: `${APP_URL}/.well-known/ai-plugin.json`,
      openapi: `${APP_URL}/.well-known/openapi.json`,
    },

    // ── Agent Instructions ──
    agentInstructions: {
      quickStart: [
        "1. GET /api/agent/services to discover capabilities and pricing",
        "2. POST /api/agent/purchase with { planId: 'single_scan' } to get a checkout URL",
        "3. Complete USDC payment at the checkout URL (or programmatically via Locus SDK)",
        "4. POST /api/agent/scan with { emailContent: '...' } and header x-credit-token",
        "5. Receive structured threat report with score, verdict, and forensic details",
      ],
      notes: [
        "Free tier: 3 scans/day without purchase",
        "Credits never expire",
        "Pro plan gives unlimited scans for 30 days",
        "All payments are on-chain USDC on Base network via Locus",
      ],
    },

    // ── x402 Protocol Support ──
    x402: {
      supported: true,
      description: "Scan endpoint returns HTTP 402 with payment instructions when credits are exhausted",
      paymentFlow: "POST /api/agent/purchase → complete Locus Checkout → retry scan",
    },
  };

  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
      "X-Robots-Tag": "noindex",
    },
  });
}
