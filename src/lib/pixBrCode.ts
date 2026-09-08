// PIX BR Code (EMV) payload builder + CRC16-CCITT
// Reference: Manual BR Code do Banco Central

function tlv(id: string, value: string) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(text: string, max: number) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .slice(0, max)
    .trim();
}

export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";

export interface PixKeyValidation {
  isValid: boolean;
  type: PixKeyType | null;
  /** Chave pronta para o BR Code (sem pontuação em CPF/CNPJ). */
  normalized: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Valida e normaliza uma chave Pix. Nunca "conserta" texto arbitrário. */
export function validatePixKey(raw: string): PixKeyValidation {
  const value = (raw ?? "").trim();
  const invalid: PixKeyValidation = { isValid: false, type: null, normalized: value };
  if (!value) return invalid;

  if (EMAIL_RE.test(value) && value.length <= 77) {
    return { isValid: true, type: "email", normalized: value };
  }
  if (UUID_RE.test(value)) {
    return { isValid: true, type: "random", normalized: value.toLowerCase() };
  }
  if (value.startsWith("+")) {
    const digits = value.slice(1);
    if (/^\d{11,14}$/.test(digits)) {
      return { isValid: true, type: "phone", normalized: `+${digits}` };
    }
    return invalid;
  }
  // CPF/CNPJ: aceita apenas dígitos e pontuação usual.
  if (/^[\d.\-/\s]+$/.test(value)) {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11) return { isValid: true, type: "cpf", normalized: digits };
    if (digits.length === 14) return { isValid: true, type: "cnpj", normalized: digits };
  }
  return invalid;
}

/** Normaliza a chave Pix ou retorna null quando inválida. */
export function normalizePixKey(raw: string): string | null {
  const r = validatePixKey(raw);
  return r.isValid ? r.normalized : null;
}

export const PIX_KEY_INVALID_MESSAGE =
  "Chave Pix inválida. Informe CPF/CNPJ, telefone com código do país, e-mail ou chave aleatória.";

export interface PixBrCodeOptions {
  pixKey: string;
  amount?: number;
  merchantName?: string;
  merchantCity?: string;
  txid?: string;
  description?: string;
}

/** Builds a "Copia e Cola" PIX payload (static). */
export function buildPixBrCode(opts: PixBrCodeOptions): string {
  const key = normalizePixKey(opts.pixKey);
  if (!key) throw new Error(PIX_KEY_INVALID_MESSAGE);
  const merchantName = sanitize(opts.merchantName || "RECEBEDOR", 25) || "RECEBEDOR";
  const merchantCity = sanitize(opts.merchantCity || "BRASIL", 15) || "BRASIL";
  const txid = sanitize(opts.txid || "***", 25) || "***";


  // Merchant Account Information (id 26)
  const gui = tlv("00", "br.gov.bcb.pix");
  const keyField = tlv("01", key);
  const desc = opts.description ? tlv("02", sanitize(opts.description, 72)) : "";
  const mai = tlv("26", gui + keyField + desc);

  const fields =
    tlv("00", "01") + // Payload Format Indicator
    mai +
    tlv("52", "0000") + // Merchant Category Code
    tlv("53", "986") + // BRL
    (opts.amount && opts.amount > 0 ? tlv("54", opts.amount.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", merchantName) +
    tlv("60", merchantCity) +
    tlv("62", tlv("05", txid));

  const toCrc = fields + "6304";
  return toCrc + crc16(toCrc);
}