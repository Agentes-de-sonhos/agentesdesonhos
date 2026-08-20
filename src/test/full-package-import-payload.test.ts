import { describe, it, expect } from "vitest";
import {
  MIN_USEFUL_TEXT_CHARS,
  IMPORT_CLIENT_TIMEOUT_MS,
  IMPORT_SLOW_NOTICE_MS,
  IMPORT_MESSAGES,
  usefulTextLength,
  hasSufficientText,
  shouldSendFileBase64,
  classifyImportFailure,
} from "@/lib/fullPackageImportPayload";

const longText = `--- Página 1 ---\n${"Voo LATAM GRU CDG 10 Jul 2026 ".repeat(60)}`;
const shortText = "--- Página 1 ---\n--- Página 2 ---\n   ";

describe("usefulTextLength", () => {
  it("ignora marcadores de página e espaços", () => {
    expect(usefulTextLength(shortText)).toBe(0);
    expect(usefulTextLength(null)).toBe(0);
    expect(usefulTextLength(longText)).toBeGreaterThan(MIN_USEFUL_TEXT_CHARS);
  });
});

describe("hasSufficientText", () => {
  it("aprova texto longo e reprova texto insuficiente", () => {
    expect(hasSufficientText(longText)).toBe(true);
    expect(hasSufficientText("a".repeat(799))).toBe(false);
    expect(hasSufficientText("a".repeat(800))).toBe(true);
  });
});

describe("shouldSendFileBase64", () => {
  it("PDF com texto suficiente: não envia base64", () => {
    expect(shouldSendFileBase64({ hasFile: true, mimeType: "application/pdf", extractedText: longText })).toBe(false);
  });
  it("PDF digitalizado (texto insuficiente): envia base64 como fallback", () => {
    expect(shouldSendFileBase64({ hasFile: true, mimeType: "application/pdf", extractedText: shortText })).toBe(true);
    expect(shouldSendFileBase64({ hasFile: true, mimeType: "application/pdf", extractedText: "" })).toBe(true);
  });
  it("imagem sempre envia base64", () => {
    expect(shouldSendFileBase64({ hasFile: true, mimeType: "image/png", extractedText: longText })).toBe(true);
  });
  it("sem arquivo nunca envia base64", () => {
    expect(shouldSendFileBase64({ hasFile: false, extractedText: "" })).toBe(false);
  });
});

describe("classifyImportFailure", () => {
  it("diferencia cancelamento, timeout e erro real", () => {
    const abort = Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
    expect(classifyImportFailure(abort, true)).toBe("canceled");
    expect(classifyImportFailure(abort, false)).toBe("timeout");
    expect(classifyImportFailure(Object.assign(new Error("x"), { name: "TimeoutError" }), false)).toBe("timeout");
    expect(classifyImportFailure(new Error("500 boom"), false)).toBe("error");
  });
});

describe("timeouts e mensagens", () => {
  it("cliente 90s, aviso 20s, backend abaixo do cliente", () => {
    expect(IMPORT_CLIENT_TIMEOUT_MS).toBe(90_000);
    expect(IMPORT_SLOW_NOTICE_MS).toBe(20_000);
    expect(IMPORT_MESSAGES.timeout).toContain("ultrapassou o tempo esperado");
    expect(IMPORT_MESSAGES.canceled).toContain("cancelada");
  });
});
