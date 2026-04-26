/**
 * lib/report-store.ts — In-memory report storage
 *
 * Stores analysis reports with unique IDs so they can be retrieved
 * via a shareable public URL. In production, this would use a
 * database — for the hackathon, in-memory Map is fine.
 */

interface StoredReport {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

// In-memory store (persists for the lifetime of the server process)
const reports = new Map<string, StoredReport>();

/**
 * Generate a short, unique report ID
 */
function generateId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Store a report and return its unique ID
 */
export function storeReport(data: Record<string, unknown>): string {
  const id = generateId();
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  reports.set(id, {
    id,
    data,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });

  // Clean up expired reports
  Array.from(reports.entries()).forEach(([key, report]) => {
    if (new Date(report.expiresAt) < now) {
      reports.delete(key);
    }
  });

  return id;
}

/**
 * Retrieve a report by ID
 */
export function getReport(id: string): StoredReport | null {
  const report = reports.get(id);
  if (!report) return null;

  // Check expiration
  if (new Date(report.expiresAt) < new Date()) {
    reports.delete(id);
    return null;
  }

  return report;
}
