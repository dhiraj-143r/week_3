/**
 * Locus API integration for security enrichment tools.
 * Provides VirusTotal URL scanning, IPinfo lookups, and ScreenshotOne captures.
 *
 * All endpoints are accessed through the Locus proxy which handles
 * authentication to the underlying services.
 */

import axios from "axios";

const LOCUS_API_KEY = process.env.LOCUS_API_KEY;
const LOCUS_BASE_URL = "https://api.locus.sh/v1";

// ── Types ──────────────────────────────────────────────────────────────

export interface VirusTotalResult {
  maliciousCount: number;
  totalEngines: number;
  permalink: string;
  isMalicious: boolean;
}

export interface IpInfoResult {
  ip: string;
  city: string;
  country: string;
  org: string;
  hostname: string;
  isBogon: boolean;
}

export interface ScreenshotResult {
  screenshotUrl: string;
}

// ── VirusTotal URL Scan ────────────────────────────────────────────────

/**
 * Scan a URL against VirusTotal through the Locus proxy.
 * Returns the count of engines that flagged it as malicious.
 */
export async function scanUrlVirusTotal(url: string): Promise<VirusTotalResult> {
  if (!LOCUS_API_KEY) {
    throw new Error("LOCUS_API_KEY is not configured in environment variables");
  }

  try {
    const response = await axios.post(
      `${LOCUS_BASE_URL}/virustotal/urls`,
      { url },
      {
        headers: {
          Authorization: `Bearer ${LOCUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const data = response.data?.data || response.data;
    const stats = data?.attributes?.last_analysis_stats || data?.last_analysis_stats || {};

    const maliciousCount = (stats.malicious || 0) + (stats.suspicious || 0);
    const totalEngines =
      (stats.malicious || 0) +
      (stats.suspicious || 0) +
      (stats.undetected || 0) +
      (stats.harmless || 0) +
      (stats.timeout || 0);

    return {
      maliciousCount,
      totalEngines: totalEngines || 0,
      permalink: data?.links?.self || data?.permalink || "",
      isMalicious: maliciousCount > 0,
    };
  } catch (error: unknown) {
    const axiosError = error as { message?: string };
    console.error(`[Locus/VirusTotal] Scan failed for ${url}:`, axiosError.message);
    return {
      maliciousCount: 0,
      totalEngines: 0,
      permalink: "",
      isMalicious: false,
    };
  }
}

/**
 * Scan multiple URLs against VirusTotal in parallel.
 * Returns a map of URL → VirusTotalResult.
 */
export async function scanUrlsVirusTotal(urls: string[]): Promise<Record<string, VirusTotalResult>> {
  const results: Record<string, VirusTotalResult> = {};

  if (urls.length === 0) return results;

  const settled = await Promise.allSettled(
    urls.map((url) => scanUrlVirusTotal(url))
  );

  urls.forEach((url, index) => {
    const result = settled[index];
    if (result.status === "fulfilled") {
      results[url] = result.value;
    } else {
      console.error(`[Locus/VirusTotal] Batch scan failed for ${url}:`, result.reason);
      results[url] = { maliciousCount: 0, totalEngines: 0, permalink: "", isMalicious: false };
    }
  });

  return results;
}

// ── IPinfo Lookup ──────────────────────────────────────────────────────

/**
 * Look up geolocation and organization info for an IP address
 * through the Locus IPinfo proxy.
 */
export async function getIpInfo(ip: string): Promise<IpInfoResult> {
  if (!LOCUS_API_KEY) {
    throw new Error("LOCUS_API_KEY is not configured in environment variables");
  }

  try {
    const response = await axios.get(
      `${LOCUS_BASE_URL}/ipinfo/${ip}`,
      {
        headers: {
          Authorization: `Bearer ${LOCUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const data = response.data?.data || response.data;

    return {
      ip: data?.ip || ip,
      city: data?.city || "",
      country: data?.country || "",
      org: data?.org || "",
      hostname: data?.hostname || "",
      isBogon: data?.bogon === true,
    };
  } catch (error: unknown) {
    const axiosError = error as { message?: string };
    console.error(`[Locus/IPinfo] Lookup failed for ${ip}:`, axiosError.message);
    return {
      ip,
      city: "",
      country: "",
      org: "",
      hostname: "",
      isBogon: false,
    };
  }
}

/**
 * Look up multiple IPs in parallel.
 * Returns a map of IP → IpInfoResult.
 */
export async function getIpsInfo(ips: string[]): Promise<Record<string, IpInfoResult>> {
  const results: Record<string, IpInfoResult> = {};

  if (ips.length === 0) return results;

  const settled = await Promise.allSettled(
    ips.map((ip) => getIpInfo(ip))
  );

  ips.forEach((ip, index) => {
    const result = settled[index];
    if (result.status === "fulfilled") {
      results[ip] = result.value;
    } else {
      console.error(`[Locus/IPinfo] Batch lookup failed for ${ip}:`, result.reason);
      results[ip] = { ip, city: "", country: "", org: "", hostname: "", isBogon: false };
    }
  });

  return results;
}

// ── ScreenshotOne ──────────────────────────────────────────────────────

/**
 * Capture a screenshot of a URL through the Locus ScreenshotOne proxy.
 * Returns a URL pointing to the generated screenshot image.
 */
export async function getScreenshot(url: string): Promise<ScreenshotResult> {
  if (!LOCUS_API_KEY) {
    throw new Error("LOCUS_API_KEY is not configured in environment variables");
  }

  try {
    const response = await axios.get(
      `${LOCUS_BASE_URL}/screenshot`,
      {
        params: {
          url,
          full_page: false,
          viewport_width: 1280,
          viewport_height: 800,
          format: "png",
        },
        headers: {
          Authorization: `Bearer ${LOCUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const data = response.data?.data || response.data;

    return {
      screenshotUrl: data?.screenshot || data?.screenshotUrl || data?.url || "",
    };
  } catch (error: unknown) {
    const axiosError = error as { message?: string };
    console.error(`[Locus/Screenshot] Capture failed for ${url}:`, axiosError.message);
    return {
      screenshotUrl: "",
    };
  }
}
