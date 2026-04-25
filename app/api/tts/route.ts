/**
 * POST /api/tts
 *
 * Server-side proxy for Sarvam AI Text-to-Speech.
 * Keeps the API key secure on the server.
 *
 * Accepts: { text: string, lang: "en" | "hi" }
 * Returns: audio/wav binary
 */

import { NextRequest, NextResponse } from "next/server";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";

export async function POST(request: NextRequest) {
  try {
    if (!SARVAM_API_KEY) {
      return NextResponse.json({ error: "SARVAM_API_KEY not configured" }, { status: 500 });
    }

    const { text, lang } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Map to Sarvam language codes and voice models
    const langConfig = lang === "hi"
      ? { target_language_code: "hi-IN", speaker: "anushka", model: "bulbul:v1" }
      : { target_language_code: "en-IN", speaker: "anushka", model: "bulbul:v1" };

    const response = await fetch(SARVAM_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Subscription-Key": SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [text],
        ...langConfig,
        enable_preprocessing: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS] Sarvam API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Sarvam TTS failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Sarvam returns base64 audio in audios array
    const audioBase64 = data?.audios?.[0];
    if (!audioBase64) {
      return NextResponse.json({ error: "No audio returned" }, { status: 500 });
    }

    return NextResponse.json({ audio: audioBase64 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[TTS] Route error:", err.message);
    return NextResponse.json({ error: err.message || "TTS failed" }, { status: 500 });
  }
}
