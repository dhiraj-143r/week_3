/**
 * Scan credit management system for PhishFilter.
 *
 * Hackathon approach: in-memory store on the server,
 * localStorage on the client. Production would use a database.
 */

// ── Server-side credit store (in-memory) ──────────────────────────────

interface CreditRecord {
  credits: number;
  isPro: boolean;
  proExpiresAt: number | null;
  totalPurchased: number;
  totalUsed: number;
  lastFreeResetDate: string;
  freeScansUsedToday: number;
}

const FREE_SCANS_PER_DAY = 3;
const creditStore = new Map<string, CreditRecord>();

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getOrCreateRecord(token: string): CreditRecord {
  if (!creditStore.has(token)) {
    creditStore.set(token, {
      credits: 0,
      isPro: false,
      proExpiresAt: null,
      totalPurchased: 0,
      totalUsed: 0,
      lastFreeResetDate: getToday(),
      freeScansUsedToday: 0,
    });
  }
  const record = creditStore.get(token)!;

  // Reset daily free scans
  const today = getToday();
  if (record.lastFreeResetDate !== today) {
    record.freeScansUsedToday = 0;
    record.lastFreeResetDate = today;
  }

  // Check pro expiration
  if (record.isPro && record.proExpiresAt && Date.now() > record.proExpiresAt) {
    record.isPro = false;
    record.proExpiresAt = null;
  }

  return record;
}

/**
 * Get credit info for a user token.
 */
export function getCredits(token: string): {
  credits: number;
  isPro: boolean;
  freeScansRemaining: number;
  totalUsed: number;
} {
  const record = getOrCreateRecord(token);
  return {
    credits: record.credits,
    isPro: record.isPro,
    freeScansRemaining: Math.max(0, FREE_SCANS_PER_DAY - record.freeScansUsedToday),
    totalUsed: record.totalUsed,
  };
}

/**
 * Check if the user can scan (has credits or free scans).
 */
export function canScan(token: string): boolean {
  const record = getOrCreateRecord(token);

  // Pro users always can
  if (record.isPro) return true;

  // Has purchased credits
  if (record.credits > 0) return true;

  // Has free daily scans remaining
  if (record.freeScansUsedToday < FREE_SCANS_PER_DAY) return true;

  return false;
}

/**
 * Deduct one scan credit. Returns true if successful.
 */
export function consumeCredit(token: string): boolean {
  const record = getOrCreateRecord(token);

  // Pro users — unlimited
  if (record.isPro) {
    record.totalUsed++;
    return true;
  }

  // Use purchased credits first
  if (record.credits > 0) {
    record.credits--;
    record.totalUsed++;
    return true;
  }

  // Fall back to free daily scans
  if (record.freeScansUsedToday < FREE_SCANS_PER_DAY) {
    record.freeScansUsedToday++;
    record.totalUsed++;
    return true;
  }

  return false;
}

/**
 * Add credits after successful payment.
 */
export function addCredits(token: string, credits: number, isPro = false): void {
  const record = getOrCreateRecord(token);

  if (isPro) {
    record.isPro = true;
    record.proExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  } else {
    record.credits += credits;
  }

  record.totalPurchased += credits;
}

/**
 * Generate a simple credit token from request headers.
 */
export function getCreditToken(headers: Headers): string {
  // Use provided token or generate from IP/user-agent
  const provided = headers.get("x-credit-token");
  if (provided) return provided;

  const ip = headers.get("x-forwarded-for") || headers.get("x-real-ip") || "anonymous";
  const ua = headers.get("user-agent") || "unknown";

  // Simple hash for demo purposes
  const raw = `${ip}:${ua}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `pf_${Math.abs(hash).toString(36)}`;
}

// ── Revenue tracking (for dashboard/demo) ────────────────────────────

interface RevenueRecord {
  amount: string;
  plan: string;
  txHash: string;
  paidAt: string;
}

const revenueLog: RevenueRecord[] = [];

export function logRevenue(amount: string, plan: string, txHash: string): void {
  revenueLog.push({
    amount,
    plan,
    txHash,
    paidAt: new Date().toISOString(),
  });
}

export function getTotalRevenue(): { total: number; transactions: number } {
  const total = revenueLog.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  return { total, transactions: revenueLog.length };
}
