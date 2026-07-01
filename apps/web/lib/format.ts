/** Formatting helpers for task cards. */

const numberFormatter = new Intl.NumberFormat("en-US");

/** Comma-separated thousands, e.g. 12450 → "12,450". */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Dollars with 4 decimal places, e.g. 0.0315 → "$0.0315". */
export function formatCost(value: number): string {
  return `$${value.toFixed(4)}`;
}

/** Compact token count with "K"/"M" suffix, e.g. 50000 → "50K", 1500000 → "1.5M". */
export function formatTokensCompact(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
  }
  return String(value);
}

/**
 * Human-friendly duration from a number of seconds.
 * e.g. 45 → "45s", 154 → "2m 34s", 4320 → "1h 12m".
 */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Elapsed clock from a number of seconds.
 * Under an hour → "MM:SS", otherwise "HH:MM:SS".
 */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number): string => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}

/** Round a number up to the nearest 10,000. */
export function roundUpToNearest10K(value: number): number {
  return Math.ceil(value / 10_000) * 10_000;
}
