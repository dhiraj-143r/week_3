/**
 * POST /api/checkout/create
 *
 * Creates a Locus Checkout session for the selected plan.
 * Returns sessionId for the <LocusCheckout /> component.
 */

import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, PRICING_PLANS } from "@/lib/locus-checkout";
import { getCreditToken } from "@/lib/credits";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId } = body;

    // Validate plan
    if (!planId || !PRICING_PLANS[planId]) {
      return NextResponse.json(
        {
          error: "Invalid plan",
          availablePlans: Object.keys(PRICING_PLANS),
        },
        { status: 400 }
      );
    }

    // Get user token for credit attribution
    const creditToken = getCreditToken(request.headers);

    // Create checkout session
    const session = await createCheckoutSession(planId, creditToken);

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      amount: session.amount,
      plan: session.plan.name,
      creditToken,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown } };
    console.error("[Checkout] Session creation failed:", err.message);

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        message: err.message,
        details: err.response?.data,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkout/create
 *
 * Returns available pricing plans.
 */
export async function GET() {
  return NextResponse.json({
    plans: Object.values(PRICING_PLANS),
    currency: "USDC",
    provider: "Locus Checkout",
  });
}
