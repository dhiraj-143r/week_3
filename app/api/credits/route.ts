/**
 * GET /api/credits
 *
 * Returns the current credit balance for the user.
 * POST /api/credits — manually add credits (for testing/demo).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCredits, getCreditToken, addCredits } from "@/lib/credits";

export async function GET(request: NextRequest) {
  const token = getCreditToken(request.headers);
  const credits = getCredits(token);

  return NextResponse.json({
    ...credits,
    creditToken: token,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { credits: count = 3, token: providedToken } = body;

  const token = providedToken || getCreditToken(request.headers);
  addCredits(token, count);

  return NextResponse.json({
    success: true,
    message: `Added ${count} credits`,
    ...getCredits(token),
    creditToken: token,
  });
}
