import { describe, it, expect } from "vitest";
import {
  extractPeriodEnd,
  parseFunctionsError,
  formatCancelDate,
  CANCEL_ERROR_MESSAGES,
} from "@/lib/subscriptionCancel";

describe("extractPeriodEnd", () => {
  it("usa items.data[0].current_period_end (API basil)", () => {
    expect(extractPeriodEnd({ items: { data: [{ current_period_end: 1787850423 }] } })).toBe(1787850423);
  });

  it("cai para cancel_at quando não há item", () => {
    expect(extractPeriodEnd({ cancel_at: 1700000000 })).toBe(1700000000);
  });

  it("aceita current_period_end legado", () => {
    expect(extractPeriodEnd({ current_period_end: 1600000000 })).toBe(1600000000);
  });

  it("usa trial_end em assinatura trialing", () => {
    expect(extractPeriodEnd({ items: { data: [{}] }, trial_end: 1650000000 })).toBe(1650000000);
  });

  it("retorna null para valores inválidos", () => {
    expect(extractPeriodEnd({ items: { data: [{ current_period_end: null }] } })).toBeNull();
    expect(extractPeriodEnd({ cancel_at: 0 })).toBeNull();
    expect(extractPeriodEnd(undefined)).toBeNull();
  });
});

describe("formatCancelDate", () => {
  it("formata epoch em pt-BR", () => {
    expect(formatCancelDate(1787850423)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
  it("ignora valores inválidos", () => {
    expect(formatCancelDate(undefined)).toBeNull();
    expect(formatCancelDate(0)).toBeNull();
  });
});

describe("parseFunctionsError", () => {
  const httpError = (body: unknown, status: number) => ({
    message: "Edge Function returned a non-2xx status code",
    context: new Response(JSON.stringify(body), { status }),
  });

  it("mapeia code subscription_not_found", async () => {
    const msg = await parseFunctionsError(httpError({ error: "x", code: "subscription_not_found" }, 404));
    expect(msg).toBe(CANCEL_ERROR_MESSAGES.subscription_not_found);
  });

  it("mapeia code not_authenticated", async () => {
    const msg = await parseFunctionsError(httpError({ code: "not_authenticated" }, 401));
    expect(msg).toBe(CANCEL_ERROR_MESSAGES.not_authenticated);
  });

  it("mapeia code stripe_error", async () => {
    const msg = await parseFunctionsError(httpError({ code: "stripe_error" }, 502));
    expect(msg).toBe(CANCEL_ERROR_MESSAGES.stripe_error);
  });

  it("usa body.error quando não há code conhecido", async () => {
    const msg = await parseFunctionsError(httpError({ error: "Mensagem específica." }, 400));
    expect(msg).toBe("Mensagem específica.");
  });

  it("não vaza o texto genérico do SDK", async () => {
    const msg = await parseFunctionsError({
      message: "Edge Function returned a non-2xx status code",
      context: new Response("<html>oops</html>", { status: 500 }),
    });
    expect(msg).not.toMatch(/non-2xx/i);
    expect(msg).toBe("Não foi possível cancelar a assinatura. Tente novamente.");
  });

  it("aceita objeto simples (resposta 200 sem success)", async () => {
    const msg = await parseFunctionsError({ context: { error: "Falhou aqui." } });
    expect(msg).toBe("Falhou aqui.");
  });

  it("não consome o corpo original (clone)", async () => {
    const response = new Response(JSON.stringify({ code: "stripe_error" }), { status: 502 });
    await parseFunctionsError({ message: "x", context: response });
    await expect(response.json()).resolves.toEqual({ code: "stripe_error" });
  });
});
