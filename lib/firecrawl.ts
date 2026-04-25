/**
 * Firecrawl API integration for URL scraping and unshortening.
 * Scrapes page content for replica/brand impersonation detection,
 * and resolves shortened URLs to their final destination.
 */

import axios from "axios";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1";

// ── Types ──────────────────────────────────────────────────────────────

export interface FirecrawlResult {
  title: string;
  description: string;
  content: string;
  finalUrl: string;
  statusCode: number;
}

// ── Main Function ──────────────────────────────────────────────────────

/**
 * Scrape a URL using Firecrawl to get its page content and final
 * destination (after redirects). Used for:
 *  - Unshortening shortened URLs (bit.ly, tinyurl, etc.)
 *  - Extracting page content for brand replica detection
 *  - Getting page title/description for display
 */
export async function scrapeUrl(url: string): Promise<FirecrawlResult> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured in environment variables");
  }

  try {
    const response = await axios.post(
      `${FIRECRAWL_BASE_URL}/scrape`,
      {
        url,
        formats: ["markdown", "html"],
        onlyMainContent: true,
      },
      {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000, // 20 second timeout per URL
      }
    );

    const data = response.data?.data || response.data;

    return {
      title: data?.metadata?.title || data?.title || "",
      description: data?.metadata?.description || data?.description || "",
      content: data?.markdown || data?.content || "",
      finalUrl: data?.metadata?.sourceURL || data?.metadata?.finalUrl || url,
      statusCode: data?.metadata?.statusCode || response.status || 0,
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number }; message?: string };
    console.error(`[Firecrawl] Failed to scrape ${url}:`, axiosError.message);

    // Return a minimal result instead of throwing
    // so that one URL failure doesn't kill the whole pipeline
    return {
      title: "",
      description: "",
      content: "",
      finalUrl: url,
      statusCode: axiosError.response?.status || 0,
    };
  }
}

/**
 * Scrape multiple URLs in parallel with concurrency control.
 * Returns a map of original URL → FirecrawlResult.
 */
export async function scrapeUrls(urls: string[]): Promise<Record<string, FirecrawlResult>> {
  const results: Record<string, FirecrawlResult> = {};

  if (urls.length === 0) return results;

  // Limit concurrency to 5 simultaneous requests
  const BATCH_SIZE = 5;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((url) => scrapeUrl(url))
    );

    batch.forEach((url, index) => {
      const result = batchResults[index];
      if (result.status === "fulfilled") {
        results[url] = result.value;
      } else {
        console.error(`[Firecrawl] Batch scrape failed for ${url}:`, result.reason);
        results[url] = {
          title: "",
          description: "",
          content: "",
          finalUrl: url,
          statusCode: 0,
        };
      }
    });
  }

  return results;
}
