/**
 * Email header and body parsing utilities.
 * Extracts structured data from raw email text for forensic analysis.
 */

export interface ReceivedHop {
  from: string;
  by: string;
  timestamp: string;
  ip: string;
}

export interface ParsedEmail {
  headers: Record<string, string>;
  from: string;
  returnPath: string;
  replyTo: string;
  to: string;
  subject: string;
  body: string;
  senderDomain: string;
  receivedHops: ReceivedHop[];
  urls: string[];
  ipAddresses: string[];
  attachments: string[];
  spf: string;
  dkim: string;
  dmarc: string;
  date: string;
  messageId: string;
  rawHeaders: string;
}

/**
 * Parse raw email text into structured components.
 * Splits headers from body at the first blank line, then extracts
 * all forensic-relevant fields.
 */
export function parseEmailHeaders(rawEmail: string): ParsedEmail {
  // Split headers and body at the first blank line
  const blankLineIndex = rawEmail.search(/\r?\n\r?\n/);
  const rawHeaders = blankLineIndex !== -1 ? rawEmail.substring(0, blankLineIndex) : rawEmail;
  const body = blankLineIndex !== -1 ? rawEmail.substring(blankLineIndex).trim() : "";

  // Parse all headers into key-value pairs
  // Headers can span multiple lines (continuation lines start with whitespace)
  const headers: Record<string, string> = {};
  const headerLines = unfoldHeaders(rawHeaders);

  for (const line of headerLines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      // If a header appears multiple times, append with semicolon
      if (headers[key.toLowerCase()]) {
        headers[key.toLowerCase()] += "; " + value;
      } else {
        headers[key.toLowerCase()] = value;
      }
    }
  }

  // Extract specific fields
  const from = extractHeaderValue(headers, "from");
  const returnPath = extractHeaderValue(headers, "return-path");
  const replyTo = extractHeaderValue(headers, "reply-to");
  const to = extractHeaderValue(headers, "to");
  const subject = extractHeaderValue(headers, "subject");
  const date = extractHeaderValue(headers, "date");
  const messageId = extractHeaderValue(headers, "message-id");
  const spf = extractAuthResult(headers, "spf");
  const dkim = extractAuthResult(headers, "dkim");
  const dmarc = extractAuthResult(headers, "dmarc");

  // Extract sender domain from the From field
  const senderDomain = extractDomainFromEmail(from);

  // Extract all URLs from the entire raw email
  const urls = extractUrls(rawEmail);

  // Parse Received headers for hop analysis
  const receivedHops = parseReceivedHops(rawHeaders);

  // Extract all IP addresses from Received headers
  const ipAddresses = extractIPsFromReceived(rawHeaders);

  return {
    headers,
    from,
    returnPath,
    replyTo,
    to,
    subject,
    body,
    senderDomain,
    receivedHops,
    urls,
    ipAddresses,
    attachments: [],
    spf,
    dkim,
    dmarc,
    date,
    messageId,
    rawHeaders,
  };
}

/**
 * Unfold multi-line headers.
 * In email headers, a line that starts with whitespace is a continuation
 * of the previous header line (RFC 2822 §2.2.3).
 */
function unfoldHeaders(rawHeaders: string): string[] {
  const lines = rawHeaders.split(/\r?\n/);
  const unfolded: string[] = [];

  for (const line of lines) {
    if (line.match(/^\s+/) && unfolded.length > 0) {
      // Continuation line — append to previous header
      unfolded[unfolded.length - 1] += " " + line.trim();
    } else {
      unfolded.push(line);
    }
  }

  return unfolded;
}

/**
 * Safely extract a header value, returning empty string if not found.
 */
function extractHeaderValue(headers: Record<string, string>, key: string): string {
  return headers[key.toLowerCase()] || "";
}

/**
 * Extract authentication results (SPF, DKIM, DMARC) from
 * the Authentication-Results header.
 */
function extractAuthResult(headers: Record<string, string>, protocol: string): string {
  const authResults = headers["authentication-results"] || "";
  
  // Look for the protocol result in the authentication-results header
  const regex = new RegExp(`${protocol}=([a-zA-Z]+)`, "i");
  const match = authResults.match(regex);
  
  if (match) {
    return match[1].toLowerCase();
  }

  // Also check dedicated headers
  const dedicatedHeader = headers[`${protocol}-signature`] || headers[protocol] || "";
  if (dedicatedHeader) {
    const passMatch = dedicatedHeader.match(/(pass|fail|softfail|neutral|none|temperror|permerror)/i);
    return passMatch ? passMatch[1].toLowerCase() : dedicatedHeader.substring(0, 50);
  }

  return "";
}

/**
 * Extract all URLs (http and https) from text using regex.
 * Deduplicates and cleans trailing punctuation.
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\])(,;]+/gi;
  const matches = text.match(urlRegex) || [];

  // Clean trailing punctuation that often gets captured
  const cleaned = matches.map((url) => {
    return url.replace(/[.)>,;:!?]+$/, "");
  });

  // Deduplicate
  return Array.from(new Set(cleaned));
}

/**
 * Extract the domain from an email address string.
 * Handles formats like "Name <email@domain.com>" and bare "email@domain.com".
 */
export function extractDomainFromEmail(emailField: string): string {
  // Try to extract from angle brackets first: "Name <user@domain.com>"
  const angleMatch = emailField.match(/<([^>]+)>/);
  const email = angleMatch ? angleMatch[1] : emailField;

  // Extract domain after @
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return "";

  return email.substring(atIndex + 1).trim().replace(/[>"'\s]/g, "");
}

/**
 * Extract domain from a URL string.
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    // Fallback regex for malformed URLs
    const match = url.match(/(?:https?:\/\/)?([^\/:\s]+)/);
    return match ? match[1] : "";
  }
}

/**
 * Parse all "Received:" headers to build the hop chain.
 * Each Received header represents one mail server hop.
 */
function parseReceivedHops(rawHeaders: string): ReceivedHop[] {
  const hops: ReceivedHop[] = [];

  // Unfold headers first, then find all Received lines
  const headerLines = unfoldHeaders(rawHeaders);

  for (const line of headerLines) {
    if (!line.toLowerCase().startsWith("received:")) continue;

    const value = line.substring(9).trim(); // Remove "Received:"

    // Extract "from" field
    const fromMatch = value.match(/from\s+([^\s(]+)/i);
    const from = fromMatch ? fromMatch[1] : "";

    // Extract "by" field
    const byMatch = value.match(/by\s+([^\s(]+)/i);
    const by = byMatch ? byMatch[1] : "";

    // Extract timestamp (after the last semicolon)
    const semiIndex = value.lastIndexOf(";");
    const timestamp = semiIndex !== -1 ? value.substring(semiIndex + 1).trim() : "";

    // Extract first IP from this hop
    const ipMatch = value.match(/\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?/);
    const ip = ipMatch ? ipMatch[1] : "";

    hops.push({ from, by, timestamp, ip });
  }

  return hops;
}

/**
 * Extract all IPv4 and IPv6 addresses from the Received headers.
 * Deduplicates and filters out private/loopback addresses.
 */
function extractIPsFromReceived(rawHeaders: string): string[] {
  // Get only Received header lines
  const headerLines = unfoldHeaders(rawHeaders);
  const receivedLines = headerLines
    .filter((line) => line.toLowerCase().startsWith("received:"))
    .join("\n");

  // IPv4 pattern
  const ipv4Regex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
  const ipv4Matches = receivedLines.match(ipv4Regex) || [];

  // IPv6 pattern (simplified)
  const ipv6Regex = /\[([0-9a-fA-F:]{3,39})\]/g;
  const ipv6Matches: string[] = [];
  let ipv6Match;
  while ((ipv6Match = ipv6Regex.exec(receivedLines)) !== null) {
    // Make sure it's not an IPv4 we already captured
    if (ipv6Match[1].includes(":")) {
      ipv6Matches.push(ipv6Match[1]);
    }
  }

  const allIPs = [...ipv4Matches, ...ipv6Matches];

  // Filter out common private/loopback IPs
  const filtered = allIPs.filter((ip) => {
    if (ip.startsWith("127.")) return false;
    if (ip.startsWith("10.")) return false;
    if (ip.startsWith("192.168.")) return false;
    if (ip.startsWith("172.") && parseInt(ip.split(".")[1]) >= 16 && parseInt(ip.split(".")[1]) <= 31) return false;
    if (ip === "0.0.0.0") return false;
    return true;
  });

  return Array.from(new Set(filtered));
}
