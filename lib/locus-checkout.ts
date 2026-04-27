/**
 * Locus Checkout integration for PhishFilter.
 * Creates checkout sessions via the Locus Beta API.
 *
 * Uses types from @withlocus/checkout-react for type safety.
 */

import axios from "axios";
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
} from "@withlocus/checkout-react";
import crypto from "crypto";

const LOCUS_API_KEY = process.env.LOCUS_API_KEY;
const LOCUS_BETA_API = "https://beta-api.paywithlocus.com/api";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ── Plan Definitions ──────────────────────────────────────────────────

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  credits: number; // -1 = unlimited
  description: string;
  features: string[];
  popular?: boolean;
}

export const PRICING_PLANS: Record<string, PricingPlan> = {
  single_scan: {
    id: "single_scan",
    name: "Single Deep Scan",
    price: "0.50",
    credits: 1,
    description: "One AI-powered phishing analysis",
    features: [
      "Grok AI deep analysis",
      "VirusTotal scan (70+ engines)",
      "Homograph attack detection",
      "SPF/DKIM/DMARC validation",
      "PDF forensic report",
    ],
  },
  scan_pack_15: {
    id: "scan_pack_15",
    name: "Scan Pack",
    price: "5.00",
    credits: 15,
    description: "15 deep scans — save 33%",
    popular: true,
    features: [
      "Everything in Single Scan",
      "15 deep scans",
      "33% savings vs single",
      "Priority scan queue",
      "Voice verdict (EN + HI)",
    ],
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro Monthly",
    price: "20.00",
    credits: -1,
    description: "Unlimited scans for 30 days",
    features: [
      "Everything in Scan Pack",
      "Unlimited deep scans",
      "Inbox IMAP monitoring",
      "Real-time Watchdog alerts",
      "WhatsApp + Email notifications",
      "Link Sandbox analysis",
    ],
  },
};

// ── Session Creation ──────────────────────────────────────────────────

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  amount: string;
  plan: PricingPlan;
}

/**
 * Create a Locus Checkout session for the given plan.
 * Returns a sessionId that can be used with <LocusCheckout />.
 *
 * Note: The beta API accepts amount, description, metadata,
 * successUrl, and cancelUrl. webhookUrl is not supported on beta.
 */
export async function createCheckoutSession(
  planId: string,
  userId: string = "anonymous"
): Promise<CheckoutSessionResult> {
  const plan = PRICING_PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  if (!LOCUS_API_KEY) {
    throw new Error("LOCUS_API_KEY is not configured");
  }

  // Beta API accepts: amount, description, metadata, successUrl, cancelUrl
  // It does NOT accept webhookUrl in beta environment
  const requestBody = {
    amount: plan.price,
    description: `PhishFilter — ${plan.name}`,
    successUrl: `${APP_URL}/success`,
    cancelUrl: `${APP_URL}/pricing`,
    metadata: {
      userId,
      planId: plan.id,
      credits: String(plan.credits),
      productName: "PhishFilter",
    },
  };

  const response = await axios.post<CreateCheckoutSessionResponse>(
    `${LOCUS_BETA_API}/checkout/sessions`,
    requestBody,
    {
      headers: {
        Authorization: `Bearer ${LOCUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  const data = response.data?.data;

  if (!data?.id) {
    throw new Error("Failed to create checkout session — no sessionId returned");
  }

  return {
    sessionId: data.id,
    checkoutUrl: data.checkoutUrl || `https://beta-checkout.paywithlocus.com/${data.id}`,
    amount: data.amount,
    plan,
  };
}

// ── Webhook Verification ──────────────────────────────────────────────

/**
 * Verify the HMAC signature on a Locus webhook payload.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
