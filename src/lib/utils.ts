import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, de-duplicating conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a number with Danish thousands separators (space) and comma decimals. */
export function fmtNum(value: number, maxFractionDigits = 1): string {
  return new Intl.NumberFormat("da-DK", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/** Format kilograms for display, trimming ".0". */
export function fmtKg(value: number): string {
  return `${fmtNum(value, 1)} kg`;
}
