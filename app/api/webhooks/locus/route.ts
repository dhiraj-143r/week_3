/**
 * POST /api/webhooks/locus
 *
 * Handles Locus Checkout webhook events:
 *  - checkout.session.paid → add scan credits
 *  - checkout.session.expired → log for analytics
 *
 * Verifies HMAC signature for security.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/locus-checkout";
import { addCredits, logRevenue } from "@/lib/credits";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature-256") || "";
    const event = request.headers.get("x-webhook-event") || "";
    const sessionId = request.headers.get("x-session-id") || "";

    // Verify webhook signature (if secret is configured)
    const webhookSecret = process.env.LOCUS_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("[Webhook] Invalid signature for session:", sessionId);
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(rawBody);
    const data = payload.data || {};

    console.log(`[Webhook] Received event: ${event} for session: ${sessionId}`);

    switch (event || payload.event) {
      case "checkout.session.paid": {
        const { metadata, amount, paymentTxHash, payerAddress, paidAt } = data;
        const userId = metadata?.userId || "anonymous";
        const planId = metadata?.planId || "single_scan";
        // metadata.credits comes as a string from session creation
        const credits = parseInt(metadata?.credits, 10) || 1;

        // Add credits to user
        const isPro = planId === "pro_monthly";
        addCredits(userId, isPro ? -1 : credits, isPro);

        // Log revenue
        logRevenue(amount || "0.00", planId, paymentTxHash || "");

        console.log(
          `[Webhook] ✅ Payment confirmed! User: ${userId}, Plan: ${planId}, ` +
            `Credits: ${isPro ? "unlimited" : credits}, Amount: ${amount} USDC, ` +
            `TxHash: ${paymentTxHash || "N/A"}, Payer: ${payerAddress || "N/A"}`
        );

        return NextResponse.json({
          success: true,
          message: "Payment processed, credits added",
          userId,
          creditsAdded: isPro ? "unlimited" : credits,
        });
      }

      case "checkout.session.expired": {
        console.log(`[Webhook] Session expired: ${sessionId}`);
        return NextResponse.json({
          success: true,
          message: "Session expiration logged",
        });
      }

      default: {
        console.log(`[Webhook] Unknown event: ${event}`, payload);
        return NextResponse.json({
          success: true,
          message: "Event received",
        });
      }
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Webhook] Processing failed:", err.message);

    return NextResponse.json(
      { error: "Webhook processing failed", message: err.message },
      { status: 500 }
    );
  }
}
