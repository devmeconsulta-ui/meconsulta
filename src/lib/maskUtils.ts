// Utility functions to mask sensitive patient data for marketplace privacy

/**
 * Masks a phone number showing only the last 4 digits
 * Example: (11) 99999-1234 -> (••) •••••-1234
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••••••••••";
  const lastFour = digits.slice(-4);
  return `(••) •••••-${lastFour}`;
}

/**
 * Masks a CPF showing only the last 3 digits
 * Example: 123.456.789-00 -> •••.•••.•••-00
 */
export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length < 2) return "•••.•••.•••-••";
  const lastTwo = digits.slice(-2);
  return `•••.•••.•••-${lastTwo}`;
}

/**
 * Masks an email showing only first 2 characters and domain
 * Example: joao.silva@email.com -> jo***@email.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "•••@•••.com";
  const visibleChars = local.slice(0, 2);
  return `${visibleChars}***@${domain}`;
}

/**
 * Formats a raw phone number for display
 * Example: 553899938311 -> (38) 99938-3311
 * Example: 5538991234567 -> (38) 99123-4567
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  
  // Remove country code 55 if present
  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  
  if (national.length === 11) {
    // Mobile: (XX) XXXXX-XXXX
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  } else if (national.length === 10) {
    // Landline: (XX) XXXX-XXXX
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  return phone;
}

/**
 * Checks if a string looks like a phone number (only digits, 10-15 chars)
 */
export function isPhoneNumber(str: string | null | undefined): boolean {
  if (!str) return false;
  const digits = str.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && /^\d+$/.test(str.trim());
}

/**
 * Returns formatted phone if name is a phone number, otherwise returns name
 */
export function displayContactName(name: string | null | undefined, phone?: string | null): string {
  if (!name) return phone ? formatPhoneDisplay(phone) : "Desconhecido";
  if (isPhoneNumber(name)) return formatPhoneDisplay(name);
  return name;
}
