// src/lib/utils/time.ts
// Simple time formatting helpers — no external dependency.

/**
 * Returns a human-readable relative time string, e.g. "2 hours ago", "3 days ago".
 * Falls back to the ISO string if parsing fails.
 */
export function formatDistanceToNow(date: Date | string, opts?: { addSuffix?: boolean }): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = Date.now();
    const diffMs = now - d.getTime();
    const abs = Math.abs(diffMs);
    const suffix = opts?.addSuffix ?? false;
    const future = diffMs < 0;

    let result: string;

    if (abs < 60_000) {
      result = "just now";
    } else if (abs < 3_600_000) {
      const mins = Math.floor(abs / 60_000);
      result = `${mins} minute${mins !== 1 ? "s" : ""}`;
    } else if (abs < 86_400_000) {
      const hours = Math.floor(abs / 3_600_000);
      result = `${hours} hour${hours !== 1 ? "s" : ""}`;
    } else if (abs < 7 * 86_400_000) {
      const days = Math.floor(abs / 86_400_000);
      result = `${days} day${days !== 1 ? "s" : ""}`;
    } else if (abs < 30 * 86_400_000) {
      const weeks = Math.floor(abs / (7 * 86_400_000));
      result = `${weeks} week${weeks !== 1 ? "s" : ""}`;
    } else if (abs < 365 * 86_400_000) {
      const months = Math.floor(abs / (30 * 86_400_000));
      result = `${months} month${months !== 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(abs / (365 * 86_400_000));
      result = `${years} year${years !== 1 ? "s" : ""}`;
    }

    if (!suffix || result === "just now") return result;
    return future ? `in ${result}` : `${result} ago`;
  } catch {
    return typeof date === "string" ? date : date.toISOString();
  }
}
