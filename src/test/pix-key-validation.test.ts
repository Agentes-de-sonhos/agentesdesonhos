import { describe, expect, it } from "vitest";
import { buildPixBrCode, normalizePixKey, validatePixKey } from "@/lib/pixBrCode";

describe("validatePixKey", () => {
  it("normaliza CNPJ formatado para 14 dígitos", () => {
    const r = validatePixKey("12.345.678/0001-95");
    expect(r.isValid).toBe(true);
    expect(r.type).toBe("cnpj");
    expect(r.normalized).toBe("12345678000195");
  });

  it("normaliza CPF formatado para 11 dígitos", () => {
    const r = validatePixKey("123.456.789-09");
    expect(r).toMatchObject({ isValid: true, type: "cpf", normalized: "12345678909" });
  });

  it("aceita e-mail, UUID e telefone E.164", () => {
    expect(validatePixKey(" agencia@viagem.com ")).toMatchObject({ isValid: true, type: "email", normalized: "agencia@viagem.com" });
    expect(validatePixKey("6f9619ff-8b86-d011-b42d-00cf4fc964ff")).toMatchObject({ isValid: true, type: "random" });
    expect(validatePixKey("+5511987654321")).toMatchObject({ isValid: true, type: "phone", normalized: "+5511987654321" });
  });

  it("recusa formatos inválidos", () => {
    for (const bad of ["", "minha chave", "1234", "11987654321", "+55 11 98765-4321", "agencia@viagem", "123.456.789-0"]) {
      expect(validatePixKey(bad).isValid, bad).toBe(false);
      expect(normalizePixKey(bad)).toBeNull();
    }
  });
});

describe("buildPixBrCode", () => {
  it("usa a chave normalizada e gera payload com CRC válido", () => {
    const payload = buildPixBrCode({ pixKey: "12.345.678/0001-95", amount: 10.5, merchantName: "Agência", merchantCity: "São Paulo" });
    expect(payload).toContain("12345678000195");
    expect(payload).not.toContain("12.345.678/0001-95");
    expect(payload.startsWith("000201")).toBe(true);
    expect(payload).toContain("5303986");
    expect(payload).toContain("540510.50");

    const body = payload.slice(0, -4);
    let crc = 0xffff;
    for (let i = 0; i < body.length; i++) {
      crc ^= body.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
      }
    }
    expect(payload.slice(-4)).toBe(crc.toString(16).toUpperCase().padStart(4, "0"));
  });

  it("lança erro claro para chave inválida", () => {
    expect(() => buildPixBrCode({ pixKey: "chave errada" })).toThrow(/Chave Pix inválida/);
  });
});
