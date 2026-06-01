// Utility: merge class names (clsx + tailwind-merge pattern)
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format a Date as a local calendar date. Do not use toISOString() for date-only
// UI state because it converts local midnight to UTC and can shift the day.
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addLocalDays(dateStr: string, days: number): string {
  const date = parseLocalDateString(dateStr);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

// Format compact numbers: 42500 → "42.5k", 1200 → "1.2k"
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toString();
}

// Format duration in seconds to "h:mm" or "mm:ss"
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Format distance in meters
export function formatDistance(meters: number, unit: "km" | "mi" = "km"): string {
  if (unit === "mi") return `${(meters / 1609.34).toFixed(2)} mi`;
  return `${(meters / 1000).toFixed(2)} km`;
}
