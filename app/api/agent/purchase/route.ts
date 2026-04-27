import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, PRICING_PLANS } from "@/lib/locus-checkout";

/* ════════════════════════════════════════════════════════════════
   PHISHFILTER — AGENT PURCHASE ENDPOINT
   Allows AI agents to programmatically create Locus Checkout
   sessions and purchase scan credits with USDC.
   ════════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, agentId } = body;

    if (!planId) {
      return NextResponse.json(
        {
          error: "MISSING_PLAN_ID",
          message: "planId is required. Options: single_scan, scan_pack_15, pro_monthly",
          availablePlans: Object.values(PRICING_PLANS).map((p) => ({
            id: p.id,
            name: p.name,
            price: `${p.price} USDC`,
            credits: p.credits === -1 ? "unlimited" : p.credits,
          })),
        },
        { status: 400 }
      );
    }

    const plan = PRICING_PLANS[planId];
    if (!plan) {
      return NextResponse.json(
        {
          error: "INVALID_PLAN",
          message: `Plan '${planId}' not found.`,
          availablePlans: Object.keys(PRICING_PLANS),
        },
        { status: 400 }
      );
    }

    // Generate a credit token for the agent
    const creditToken = agentId
      ? `pf_agent_${agentId}_${Date.now()}`
      : `pf_agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Create Locus Checkout session
    const session = await createCheckoutSession(planId, creditToken);

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: "USDC",
        credits: plan.credits === -1 ? "unlimited" : plan.credits,
      },
      checkout: {
        sessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        expiresAt: null,
      },
      creditToken,
      instructions: {
        step1: `Complete USDC payment at: ${session.checkoutUrl}`,
        step2: `After payment, use header 'x-credit-token: ${creditToken}' for scan requests`,
        step3: "POST /api/agent/scan with { emailContent: '...' } to analyze emails",
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("[Agent Purchase] Error:", e);
    return NextResponse.json(
      { error: "CHECKOUT_FAILED", message: e.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// GET — return available plans for agent discovery
export async function GET() {
  return NextResponse.json({
    plans: Object.values(PRICING_PLANS).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: "USDC",
      credits: p.credits === -1 ? "unlimited" : p.credits,
      description: p.description,
      features: p.features,
    })),
    purchaseMethod: "POST /api/agent/purchase with { planId: '<plan_id>' }",
    paymentCurrency: "USDC on Base network",
    paymentProvider: "Locus Checkout",
  });
}
