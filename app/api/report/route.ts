/**
 * POST /api/report — Save a report and return its shareable URL
 * GET  /api/report?id=xxx — Retrieve a report by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { storeReport, getReport } from "@/lib/report-store";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Report data is required" }, { status: 400 });
    }

    const reportId = storeReport(body);
    const shareUrl = `${APP_URL}/report/${reportId}`;

    console.log(`[Report] Stored report ${reportId}, shareable at ${shareUrl}`);

    return NextResponse.json({
      success: true,
      reportId,
      shareUrl,
    });
  } catch (error) {
    console.error("[Report] Store failed:", error);
    return NextResponse.json({ error: "Failed to store report" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const report = getReport(id);

    if (!report) {
      return NextResponse.json({ error: "Report not found or expired" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("[Report] Retrieve failed:", error);
    return NextResponse.json({ error: "Failed to retrieve report" }, { status: 500 });
  }
}
