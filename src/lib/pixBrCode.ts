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
  const key = opts.pixKey.trim();
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