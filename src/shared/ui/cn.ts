import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes — pickup-local (tv^3.x skew vs shared tvShim 0.3). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
