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
