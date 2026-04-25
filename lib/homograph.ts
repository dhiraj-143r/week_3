/**
 * Homograph attack detection library.
 *
 * IDN homograph attacks use Unicode characters that visually resemble
 * ASCII letters to create domains that look identical to legitimate ones
 * (e.g., "аpple.com" using Cyrillic "а" instead of Latin "a").
 *
 * This module detects, normalizes, and reports on homograph abuse
 * with zero external dependencies.
 */

// ── Lookalike Character Map ────────────────────────────────────────────
// Maps visually confusable Unicode characters to their ASCII equivalents.
// Sources: Unicode TR39 confusables, ICANN IDN guidelines, real phishing samples.

const LOOKALIKE_MAP: Record<string, string> = {
  // ─── Cyrillic → Latin ─────────────────────────────────────────────
  "\u0430": "a",   // Cyrillic а → a
  "\u0435": "e",   // Cyrillic е → e
  "\u043E": "o",   // Cyrillic о → o
  "\u0440": "p",   // Cyrillic р → p
  "\u0441": "c",   // Cyrillic с → c
  "\u0443": "y",   // Cyrillic у → y
  "\u0445": "x",   // Cyrillic х → x
  "\u0455": "s",   // Cyrillic ѕ → s
  "\u0456": "i",   // Cyrillic і → i
  "\u0458": "j",   // Cyrillic ј → j
  "\u04BB": "h",   // Cyrillic һ → h
  "\u04CF": "l",   // Cyrillic ӏ → l
  "\u0501": "d",   // Cyrillic ԁ → d
  "\u0510": "q",   // Cyrillic Ԑ → q (rare)
  "\u0411": "B",   // Cyrillic Б → B (uppercase)
  "\u0406": "I",   // Cyrillic І → I (uppercase)
  "\u041E": "O",   // Cyrillic О → O (uppercase)
  "\u0420": "P",   // Cyrillic Р → P (uppercase)
  "\u0421": "C",   // Cyrillic С → C (uppercase)
  "\u0422": "T",   // Cyrillic Т → T (uppercase)
  "\u041D": "H",   // Cyrillic Н → H (uppercase)
  "\u041C": "M",   // Cyrillic М → M (uppercase)
  "\u0410": "A",   // Cyrillic А → A (uppercase)
  "\u0412": "B",   // Cyrillic В → B (uppercase)
  "\u0415": "E",   // Cyrillic Е → E (uppercase)
  "\u041A": "K",   // Cyrillic К → K (uppercase)

  // ─── Greek → Latin ────────────────────────────────────────────────
  "\u03B1": "a",   // Greek α → a
  "\u03B5": "e",   // Greek ε → e (loose)
  "\u03B9": "i",   // Greek ι → i
  "\u03BA": "k",   // Greek κ → k
  "\u03BD": "v",   // Greek ν → v
  "\u03BF": "o",   // Greek ο → o
  "\u03C1": "p",   // Greek ρ → p
  "\u03C4": "t",   // Greek τ → t (loose)
  "\u03C5": "u",   // Greek υ → u
  "\u03C9": "w",   // Greek ω → w
  "\u0391": "A",   // Greek Α → A (uppercase)
  "\u0392": "B",   // Greek Β → B (uppercase)
  "\u0395": "E",   // Greek Ε → E (uppercase)
  "\u0396": "Z",   // Greek Ζ → Z (uppercase)
  "\u0397": "H",   // Greek Η → H (uppercase)
  "\u0399": "I",   // Greek Ι → I (uppercase)
  "\u039A": "K",   // Greek Κ → K (uppercase)
  "\u039C": "M",   // Greek Μ → M (uppercase)
  "\u039D": "N",   // Greek Ν → N (uppercase)
  "\u039F": "O",   // Greek Ο → O (uppercase)
  "\u03A1": "P",   // Greek Ρ → P (uppercase)
  "\u03A4": "T",   // Greek Τ → T (uppercase)
  "\u03A7": "X",   // Greek Χ → X (uppercase)
  "\u03A5": "Y",   // Greek Υ → Y (uppercase)

  // ─── Latin Extended / IPA ─────────────────────────────────────────
  "\u0131": "i",   // Turkish dotless ı → i
  "\u0261": "g",   // Latin small letter script ɡ → g
  "\u0269": "i",   // Latin small letter iota ɩ → i (also l)
  "\u026A": "i",   // Latin letter small capital I ɪ → i
  "\u0280": "r",   // Latin letter small capital R ʀ → r (loose)
  "\u1D00": "a",   // Latin letter small capital A ᴀ → a
  "\u1D04": "c",   // Latin letter small capital C ᴄ → c
  "\u1D05": "d",   // Latin letter small capital D ᴅ → d
  "\u1D07": "e",   // Latin letter small capital E ᴇ → e
  "\u1D0F": "o",   // Latin letter small capital O ᴏ → o
  "\u1D18": "p",   // Latin letter small capital P ᴘ → p
  "\u1D1B": "t",   // Latin letter small capital T ᴛ → t
  "\u1D1C": "u",   // Latin letter small capital U ᴜ → u
  "\u0127": "h",   // Latin small letter h with stroke ħ → h

  // ─── Math / Symbol characters ─────────────────────────────────────
  "\u212F": "e",   // Script small e ℯ → e
  "\u2134": "o",   // Script small o ℴ → o
  "\u2113": "l",   // Script small l ℓ → l
  "\uFF41": "a",   // Fullwidth a ａ → a
  "\uFF42": "b",   // Fullwidth b ｂ → b
  "\uFF43": "c",   // Fullwidth c ｃ → c
  "\uFF44": "d",   // Fullwidth d ｄ → d
  "\uFF45": "e",   // Fullwidth e ｅ → e
  "\uFF4F": "o",   // Fullwidth o ｏ → o
  "\uFF50": "p",   // Fullwidth p ｐ → p
  "\uFF53": "s",   // Fullwidth s ｓ → s

  // ─── Digit / Letter confusion ─────────────────────────────────────
  "0": "o",        // Zero → o
  "1": "l",        // One → l
};

// ── Brand List ─────────────────────────────────────────────────────────
// Famous brands commonly targeted by homograph phishing.

const FAMOUS_BRANDS = [
  "google", "apple", "microsoft", "amazon", "paypal",
  "netflix", "facebook", "instagram", "twitter", "bank",
  "chase", "wellsfargo", "citibank", "hsbc", "barclays",
  "linkedin", "dropbox", "spotify", "uber", "airbnb",
  "yahoo", "outlook", "icloud", "whatsapp", "telegram",
  "coinbase", "binance", "stripe", "shopify", "ebay",
  "reddit", "github", "slack", "zoom", "docusign",
  "fedex", "dhl", "ups", "usps",
];

// ── Types ──────────────────────────────────────────────────────────────

export interface SuspiciousChar {
  /** The original Unicode character found */
  char: string;
  /** Zero-based position in the domain string */
  position: number;
  /** The ASCII character it visually imitates */
  looksLike: string;
  /** Unicode code point in U+XXXX format */
  codePoint: string;
  /** Unicode script name (e.g. "Cyrillic", "Greek") */
  script: string;
}

export interface HomographResult {
  /** The original domain as extracted from the URL */
  original: string;
  /** The domain with all lookalikes replaced by ASCII */
  normalized: string;
  /** Whether any homograph characters were detected */
  isHomograph: boolean;
  /** List of each suspicious character found */
  suspiciousChars: SuspiciousChar[];
  /** If impersonating a known brand, the brand name */
  targetBrand: string | null;
  /** Severity: "critical" if brand match, "high" if many chars, "medium" if few */
  severity: "critical" | "high" | "medium" | "none";
}

// ── Core Functions ─────────────────────────────────────────────────────

/**
 * Check if a domain contains any homograph (lookalike Unicode) characters.
 */
export function detectHomograph(domain: string): boolean {
  for (let i = 0; i < domain.length; i++) {
    if (LOOKALIKE_MAP[domain[i]] !== undefined) {
      return true;
    }
  }
  return false;
}

/**
 * Replace all lookalike characters with their ASCII equivalents.
 * Returns a normalized, pure-ASCII version of the domain.
 */
export function normalizeHomograph(domain: string): string {
  let normalized = "";
  for (let i = 0; i < domain.length; i++) {
    const char = domain[i];
    normalized += LOOKALIKE_MAP[char] !== undefined ? LOOKALIKE_MAP[char] : char;
  }
  return normalized.toLowerCase();
}

/**
 * Analyze a list of URLs for homograph attacks.
 * Extracts the domain from each URL, runs detection, and returns
 * a detailed result for every URL.
 */
export function analyzeAllDomains(urls: string[]): HomographResult[] {
  return urls.map((url) => {
    const domain = extractDomainFromUrl(url);
    return analyzeDomain(domain);
  });
}

/**
 * Check if the normalized form of a domain matches any famous brand,
 * but the original does not (indicating a homograph impersonation).
 *
 * Returns the brand name if impersonation is detected, else null.
 */
export function checkFamousBrands(domain: string): string | null {
  const normalized = normalizeHomograph(domain).toLowerCase();
  const originalLower = domain.toLowerCase();

  for (const brand of FAMOUS_BRANDS) {
    // The normalized domain contains the brand name...
    const normalizedContainsBrand = normalized.includes(brand);
    // ...but the original domain does NOT contain it in plain ASCII
    const originalContainsBrand = originalLower.includes(brand);

    if (normalizedContainsBrand && !originalContainsBrand) {
      return brand;
    }
  }

  return null;
}

// ── Internal Helpers ───────────────────────────────────────────────────

/**
 * Full analysis of a single domain string.
 */
function analyzeDomain(domain: string): HomographResult {
  const suspiciousChars: SuspiciousChar[] = [];

  for (let i = 0; i < domain.length; i++) {
    const char = domain[i];
    if (LOOKALIKE_MAP[char] !== undefined) {
      suspiciousChars.push({
        char,
        position: i,
        looksLike: LOOKALIKE_MAP[char],
        codePoint: formatCodePoint(char),
        script: guessScript(char),
      });
    }
  }

  const normalized = normalizeHomograph(domain);
  const isHomograph = suspiciousChars.length > 0;
  const targetBrand = isHomograph ? checkFamousBrands(domain) : null;

  let severity: HomographResult["severity"] = "none";
  if (targetBrand) {
    severity = "critical";
  } else if (suspiciousChars.length >= 3) {
    severity = "high";
  } else if (suspiciousChars.length > 0) {
    severity = "medium";
  }

  return {
    original: domain,
    normalized,
    isHomograph,
    suspiciousChars,
    targetBrand,
    severity,
  };
}

/**
 * Extract hostname from a URL string. Handles malformed URLs gracefully.
 */
function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    // Fallback: strip protocol and path manually
    const stripped = url.replace(/^https?:\/\//, "").split("/")[0].split("?")[0].split("#")[0];
    return stripped;
  }
}

/**
 * Format a character's Unicode code point as U+XXXX.
 */
function formatCodePoint(char: string): string {
  const code = char.codePointAt(0);
  if (code === undefined) return "U+????";
  return "U+" + code.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Best-effort guess of which Unicode script a character belongs to,
 * based on code point ranges. Not exhaustive but covers the main
 * confusable scripts.
 */
function guessScript(char: string): string {
  const code = char.codePointAt(0);
  if (code === undefined) return "Unknown";

  // ASCII digits
  if (code >= 0x30 && code <= 0x39) return "Digit";

  // Basic Latin
  if (code >= 0x41 && code <= 0x7A) return "Latin";

  // Latin Extended-A/B
  if (code >= 0x0100 && code <= 0x024F) return "Latin Extended";

  // IPA Extensions
  if (code >= 0x0250 && code <= 0x02AF) return "IPA/Latin Extended";

  // Greek and Coptic
  if (code >= 0x0370 && code <= 0x03FF) return "Greek";

  // Cyrillic
  if (code >= 0x0400 && code <= 0x04FF) return "Cyrillic";

  // Cyrillic Supplement
  if (code >= 0x0500 && code <= 0x052F) return "Cyrillic";

  // Latin Extended Additional
  if (code >= 0x1D00 && code <= 0x1D7F) return "Phonetic/Latin";

  // Letterlike Symbols
  if (code >= 0x2100 && code <= 0x214F) return "Letterlike Symbol";

  // Fullwidth Latin
  if (code >= 0xFF00 && code <= 0xFF5E) return "Fullwidth";

  return "Other";
}
