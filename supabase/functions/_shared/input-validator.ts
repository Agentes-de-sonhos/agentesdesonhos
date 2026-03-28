/**
 * Shared input validation & sanitization for Edge Functions.
 */

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /disregard\s+(all\s+)?previous/i,
  /system\s*prompt/i,
  /reveal\s+(hidden|secret|internal)/i,
  /override\s+(system|instructions|rules)/i,
  /you\s+are\s+now\s+a/i,
  /act\s+as\s+(if|a)\s/i,
  /pretend\s+(you|to)\s/i,
  /new\s+instructions?:/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\/?system>/i,
  /```system/i,
  /do\s+not\s+follow\s+(the\s+)?(previous|above)/i,
  /forget\s+(everything|all|previous)/i,
];

/**
 * Sanitize a text string: strip HTML/script tags, trim, collapse whitespace.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .trim()
    .replace(/\s{3,}/g, "  "); // collapse excessive whitespace
}

/**
 * Check for prompt injection patterns.
 * Returns the matched pattern description or null if clean.
 */
export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Validate a string field with length limits.
 */
export function validateString(
  value: unknown,
  fieldName: string,
  minLen: number,
  maxLen: number
): { valid: true; value: string } | { valid: false; error: string } {
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} deve ser texto.` };
  }
  const sanitized = sanitizeText(value);
  if (sanitized.length < minLen) {
    return { valid: false, error: `${fieldName} é obrigatório.` };
  }
  if (sanitized.length > maxLen) {
    return {
      valid: false,
      error: `${fieldName} excede o limite de ${maxLen} caracteres.`,
    };
  }
  if (detectPromptInjection(sanitized)) {
    return {
      valid: false,
      error: `${fieldName} contém conteúdo não permitido.`,
    };
  }
  return { valid: true, value: sanitized };
}

/**
 * Validate that value is one of allowed options (whitelist).
 */
export function validateEnum(
  value: unknown,
  fieldName: string,
  allowed: string[]
): { valid: true; value: string } | { valid: false; error: string } {
  if (typeof value !== "string" || !allowed.includes(value)) {
    return {
      valid: false,
      error: `${fieldName} inválido. Valores aceitos: ${allowed.join(", ")}`,
    };
  }
  return { valid: true, value };
}

/**
 * Validate a number field within a range.
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): { valid: true; value: number } | { valid: false; error: string } {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) {
    return {
      valid: false,
      error: `${fieldName} deve ser entre ${min} e ${max}.`,
    };
  }
  return { valid: true, value: num };
}

/**
 * Validate an array of strings, each against an allowed set.
 */
export function validateStringArray(
  value: unknown,
  fieldName: string,
  allowed: string[],
  maxItems: number
): { valid: true; value: string[] } | { valid: false; error: string } {
  if (!Array.isArray(value)) {
    return { valid: false, error: `${fieldName} deve ser uma lista.` };
  }
  if (value.length > maxItems) {
    return {
      valid: false,
      error: `${fieldName} pode ter no máximo ${maxItems} itens.`,
    };
  }
  const filtered = value.filter(
    (v) => typeof v === "string" && allowed.includes(v)
  );
  return { valid: true, value: filtered };
}

/**
 * Strip unknown keys from an object, keeping only whitelisted ones.
 */
export function whitelistKeys<T extends Record<string, unknown>>(
  obj: unknown,
  allowedKeys: string[]
): Partial<T> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in (obj as Record<string, unknown>)) {
      result[key] = (obj as Record<string, unknown>)[key];
    }
  }
  return result as Partial<T>;
}

/**
 * Build a 400 error response.
 */
export function validationError(
  message: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
