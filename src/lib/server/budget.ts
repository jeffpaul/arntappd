import "server-only";
import { singleton } from "./cache";

/**
 * Hourly call budget per Untappd credential scope (the app key, or one user
 * token). Untappd allows 100 calls an hour for each; we stop at 85 to leave
 * headroom, and also stop early when Untappd's own header says we are low.
 */
const LIMIT_PER_HOUR = 85;
const HOUR = 60 * 60 * 1000;

type Window = { start: number; used: number; providerRemaining: number | null };

const windows = singleton("untappdBudget", () => new Map<string, Window>());

function current(scope: string): Window {
  const now = Date.now();
  let w = windows.get(scope);
  if (!w || now - w.start >= HOUR) {
    w = { start: now, used: 0, providerRemaining: null };
    windows.set(scope, w);
  }
  return w;
}

export function canSpend(scope: string, calls = 1): boolean {
  const w = current(scope);
  if (w.used + calls > LIMIT_PER_HOUR) return false;
  if (w.providerRemaining !== null && w.providerRemaining - calls < 5) return false;
  return true;
}

export function recordCall(scope: string, providerRemaining: number | null): void {
  const w = current(scope);
  w.used += 1;
  if (providerRemaining !== null && Number.isFinite(providerRemaining)) {
    w.providerRemaining = providerRemaining;
  }
}

export function budgetSnapshot(scope: string) {
  const w = current(scope);
  return { used: w.used, limit: LIMIT_PER_HOUR, providerRemaining: w.providerRemaining };
}
