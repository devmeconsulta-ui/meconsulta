import { parseISO, format, type Locale } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Safely parse a date string from the database
 * This avoids timezone issues when converting ISO strings
 */
export function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    // parseISO correctly handles ISO 8601 strings without timezone conversion issues
    return parseISO(dateString);
  } catch {
    return null;
  }
}

/**
 * Format a date string from the database safely
 * Handles null values and timezone correctly
 */
export function formatDateSafe(
  dateString: string | null | undefined,
  formatStr: string = "dd/MM/yyyy",
  options?: { locale?: Locale }
): string {
  if (!dateString) return "—";
  
  try {
    const date = parseISO(dateString);
    return format(date, formatStr, { locale: options?.locale || ptBR });
  } catch {
    return "—";
  }
}

/**
 * Format date and time from database
 */
export function formatDateTime(dateString: string | null | undefined): string {
  return formatDateSafe(dateString, "dd/MM/yyyy 'às' HH:mm");
}

/**
 * Format just the time from database
 */
export function formatTime(dateString: string | null | undefined): string {
  return formatDateSafe(dateString, "HH:mm");
}

/**
 * Format just the date from database
 */
export function formatDate(dateString: string | null | undefined): string {
  return formatDateSafe(dateString, "dd/MM/yyyy");
}

/**
 * Format date with day of week
 */
export function formatDateWithWeekday(dateString: string | null | undefined): string {
  return formatDateSafe(dateString, "dd/MM/yyyy (EEEE)");
}
