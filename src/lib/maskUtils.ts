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
 * Checks if a string is a Facebook/Instagram Linked ID (not a real phone number)
 * These are typically 15+ digit numbers that don't start with country codes
 */
export function isLinkedId(str: string | null | undefined): boolean {
  if (!str) return false;
  const digits = str.replace(/\D/g, "");
  // Linked IDs are typically 14-18 digits and don't start with valid country codes like 55
  return digits.length >= 14 && !digits.startsWith("55");
}

/**
 * Formats a raw phone number for display
 * Example: 553899938311 -> (38) 99938-3311
 * Example: 5538991234567 -> (38) 99123-4567
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  
  // If it's a linked ID (Facebook/Instagram), show as "ID externo"
  if (isLinkedId(phone)) return `ID: ${digits.slice(-6)}`;
  
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
 * Checks if a string looks like a Brazilian phone number (only digits, 10-13 chars)
 */
export function isPhoneNumber(str: string | null | undefined): boolean {
  if (!str) return false;
  const digits = str.replace(/\D/g, "");
  // Brazilian phones: 10-13 digits (with or without country code 55)
  return digits.length >= 10 && digits.length <= 13 && /^\d+$/.test(str.trim());
}

/**
 * Returns formatted phone if name is a phone number, otherwise returns name
 */
export function displayContactName(name: string | null | undefined, phone?: string | null): string {
  if (!name) return phone ? formatPhoneDisplay(phone) : "Desconhecido";
  if (isLinkedId(name)) return phone ? formatPhoneDisplay(phone) : `Contato ${name.slice(-4)}`;
  if (isPhoneNumber(name)) return formatPhoneDisplay(name);
  return name;
}
