import { describe, it, expect } from "vitest";
import { getScheduledCancellation, isPaidPlan, formatPtBrDate } from "@/lib/subscriptionState";
import { parsePortalError, PORTAL_ERROR_MESSAGES } from "@/lib/customerPortal";

const NOW = new Date("2026-08-10T19:00:00Z");

describe("getScheduledCancellation", () => {
  it("detecta cancelamento agendado (caso real: fundador até 20/08/2026)", () => {
    const r = getScheduledCancellation(
      {
        plan: "fundador",
        is_active: true,
        expires_at: "2026-08-20 22:42:13+00",
        stripe_subscription_id: "sub_1TDBkCFkGdVt5nied1kFUUlH",
      },
      NOW,
    );
    expect(r.scheduled).toBe(true);
    expect(r.endDateLabel).toBe("20/08/2026");
  });

  it("não sinaliza sem expires_at", () => {
    expect(
      getScheduledCancellation({ plan: "premium", stripe_subscription_id: "sub_x" }, NOW).scheduled,
    ).toBe(false);
  });

  it("não sinaliza quando já expirou", () => {
    expect(
      getScheduledCancellation(
        { plan: "premium", stripe_subscription_id: "sub_x", expires_at: "2026-01-01T00:00:00Z" },
        NOW,
      ).scheduled,
    ).toBe(false);
  });

  it("não sinaliza sem stripe_subscription_id", () => {
    expect(
      getScheduledCancellation({ plan: "premium", expires_at: "2026-12-01T00:00:00Z" }, NOW)
        .scheduled,
    ).toBe(false);
  });

  it("ignora planos não pagos e datas inválidas", () => {
    expect(
      getScheduledCancellation(
        { plan: "start", expires_at: "2026-12-01T00:00:00Z", stripe_subscription_id: "sub_x" },
        NOW,
      ).scheduled,
    ).toBe(false);
    expect(
      getScheduledCancellation(
        { plan: "premium", expires_at: "não-é-data", stripe_subscription_id: "sub_x" },
        NOW,
      ).scheduled,
    ).toBe(false);
    expect(getScheduledCancellation(null, NOW).scheduled).toBe(false);
  });

  it("isPaidPlan / formatPtBrDate", () => {
    expect(isPaidPlan("fundador")).toBe(true);
    expect(isPaidPlan("educa_pass")).toBe(false);
    expect(formatPtBrDate("2026-08-20T22:42:13Z")).toBe("20/08/2026");
    expect(formatPtBrDate(null)).toBeNull();
  });
});

describe("parsePortalError", () => {
  const httpError = (body: unknown, status: number) => ({
    message: "Edge Function returned a non-2xx status code",
    context: new Response(JSON.stringify(body), { status }),
  });

  it("mapeia códigos conhecidos", async () => {
    expect(await parsePortalError(httpError({ code: "not_authenticated" }, 401))).toBe(
      PORTAL_ERROR_MESSAGES.not_authenticated,
    );
    expect(await parsePortalError(httpError({ code: "subscription_not_found" }, 404))).toBe(
      PORTAL_ERROR_MESSAGES.subscription_not_found,
    );
    expect(await parsePortalError(httpError({ code: "portal_not_configured" }, 503))).toBe(
      PORTAL_ERROR_MESSAGES.portal_not_configured,
    );
    expect(await parsePortalError(httpError({ code: "stripe_error" }, 502))).toBe(
      PORTAL_ERROR_MESSAGES.stripe_error,
    );
  });

  it("usa error textual quando não há code", async () => {
    expect(await parsePortalError(httpError({ error: "Falha específica" }, 400))).toBe(
      "Falha específica",
    );
  });

  it("nunca devolve a mensagem genérica do SDK", async () => {
    const msg = await parsePortalError({
      message: "Edge Function returned a non-2xx status code",
      context: new Response("<html>oops</html>", { status: 500 }),
    });
    expect(msg).not.toMatch(/non-2xx/i);
    expect(msg).toBe("Não foi possível abrir o portal de pagamentos. Tente novamente.");
  });

  it("aceita objeto simples de resposta 200 sem url", async () => {
    expect(await parsePortalError({ context: { code: "stripe_error" } })).toBe(
      PORTAL_ERROR_MESSAGES.stripe_error,
    );
  });
});
