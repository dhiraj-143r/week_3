/**
 * IMAP integration for automatic inbox scanning.
 * Connects to Gmail/Outlook/Yahoo via IMAP and fetches emails
 * with full headers for phishing analysis.
 */

import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";

// ── Types ──────────────────────────────────────────────────────────────

export interface ImapConfig {
  email: string;
  password: string; // App password, NOT real password
  provider: "gmail" | "outlook" | "yahoo" | "custom";
  host?: string;
  port?: number;
}

export interface AttachmentData {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

export interface FetchedEmail {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  rawContent: string;    // Full raw email with headers (for PhishFilter analysis)
  snippet: string;       // First 200 chars of body text
  hasAttachments: boolean;
  attachments: AttachmentData[];
}

// ── Provider configs ───────────────────────────────────────────────────

const PROVIDER_CONFIG: Record<string, { host: string; port: number }> = {
  gmail: { host: "imap.gmail.com", port: 993 },
  outlook: { host: "outlook.office365.com", port: 993 },
  yahoo: { host: "imap.mail.yahoo.com", port: 993 },
};

// ── Main Functions ─────────────────────────────────────────────────────

/**
 * Test IMAP connection — verifies credentials without fetching emails.
 */
export async function testConnection(config: ImapConfig): Promise<{ success: boolean; error?: string; mailboxCount?: number }> {
  const providerConf = PROVIDER_CONFIG[config.provider] || { host: config.host!, port: config.port || 993 };

  const client = new ImapFlow({
    host: providerConf.host,
    port: providerConf.port,
    secure: true,
    auth: {
      user: config.email,
      pass: config.password,
    },
    logger: false,
  });

  try {
    await client.connect();
    const mailbox = await client.status("INBOX", { messages: true });
    await client.logout();

    return {
      success: true,
      mailboxCount: mailbox.messages,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; responseCode?: string };
    console.error("[IMAP] Connection test failed:", err.message);

    let friendlyError = err.message || "Connection failed";
    if (friendlyError.includes("AUTHENTICATIONFAILED") || friendlyError.includes("Invalid credentials")) {
      friendlyError = "Authentication failed. Check your email and app password.";
    } else if (friendlyError.includes("ECONNREFUSED")) {
      friendlyError = "Connection refused. Check your IMAP settings.";
    }

    return { success: false, error: friendlyError };
  }
}

/**
 * Fetch the latest N emails from INBOX with full raw content.
 */
export async function fetchEmails(config: ImapConfig, count: number = 10): Promise<FetchedEmail[]> {
  const providerConf = PROVIDER_CONFIG[config.provider] || { host: config.host!, port: config.port || 993 };

  const client = new ImapFlow({
    host: providerConf.host,
    port: providerConf.port,
    secure: true,
    auth: {
      user: config.email,
      pass: config.password,
    },
    logger: false,
  });

  const emails: FetchedEmail[] = [];

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");

    try {
      // Get the latest N message UIDs
      const mb = client.mailbox;
      const totalMessages = (mb && typeof mb === "object" && "exists" in mb) ? mb.exists : 0;
      if (totalMessages === 0) {
        return [];
      }

      const startSeq = Math.max(1, totalMessages - count + 1);
      const range = `${startSeq}:*`;

      for await (const message of client.fetch(range, {
        source: true,        // Full raw email source
        envelope: true,      // Parsed envelope data
        uid: true,
      })) {
        try {
          const rawSource = message.source?.toString("utf-8") || "";

          // Parse the email for display info
          let parsed: ParsedMail | null = null;
          try {
            if (message.source) {
              parsed = await simpleParser(message.source) as unknown as ParsedMail;
            }
          } catch {
            // If parsing fails, use envelope data
          }

          const fromAddress = parsed?.from?.text
            || message.envelope?.from?.[0]?.address
            || "Unknown";

          const toAddress = parsed?.to
            ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(", ") : parsed.to.text)
            : message.envelope?.to?.[0]?.address || "Unknown";

          const bodyText = parsed?.text || parsed?.html || "";
          const snippet = bodyText.replace(/<[^>]*>/g, "").slice(0, 200).trim();

          // Extract attachments (PDF, images, HTML)
          const attachments: AttachmentData[] = [];
          if (parsed?.attachments) {
            for (const att of parsed.attachments) {
              const ct = att.contentType || "";
              if (ct === "application/pdf" || ct.startsWith("image/") || ct === "text/html") {
                attachments.push({
                  filename: att.filename || `attachment.${ct.split("/")[1]}`,
                  contentType: ct,
                  size: att.size || att.content?.length || 0,
                  content: att.content,
                });
              }
            }
          }

          emails.push({
            uid: message.uid,
            subject: parsed?.subject || message.envelope?.subject || "(No Subject)",
            from: fromAddress,
            to: toAddress,
            date: parsed?.date?.toISOString()
              || message.envelope?.date?.toISOString()
              || new Date().toISOString(),
            rawContent: rawSource,
            snippet,
            hasAttachments: attachments.length > 0,
            attachments,
          });
        } catch (msgErr) {
          console.error("[IMAP] Failed to parse message:", msgErr);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[IMAP] Fetch failed:", err.message);
    throw new Error(`Failed to fetch emails: ${err.message}`);
  }

  // Return newest first
  return emails.reverse();
}
