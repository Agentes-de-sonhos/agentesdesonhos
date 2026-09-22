import { describe, it, expect } from "vitest";
import { opportunityDeepLink, toSiteRequestAlert } from "@/hooks/useAgencySiteRequestAlerts";
import {
  isE164,
  planWhatsappNotify,
  templateVariables,
  whatsappConfigFromEnv,
} from "../../supabase/functions/_shared/whatsapp-request-notify";

describe("aviso interno de solicitação do site", () => {
  it("normaliza a linha e mostra só o necessário", () => {
    const alert = toSiteRequestAlert({
      id: "11111111-1111-4111-8111-111111111111",
      lead_name: "Maria Souza",
      service_label: "Aéreo",
      destination: "Lisboa",
      opportunity_id: "22222222-2222-4222-8222-222222222222",
      created_at: "2026-02-01T12:00:00Z",
      lead_email: "maria@exemplo.com",
      lead_whatsapp: "+5511988887777",
    });
    expect(alert).toBeTruthy();
    expect(Object.keys(alert!).sort()).toEqual(
      ["created_at", "destination", "id", "lead_name", "opportunity_id", "service_label"],
    );
    expect(JSON.stringify(alert)).not.toContain("maria@exemplo.com");
    expect(JSON.stringify(alert)).not.toContain("988887777");
  });

  it("descarta linha sem identificador", () => {
    expect(toSiteRequestAlert(null)).toBeNull();
    expect(toSiteRequestAlert({ lead_name: "x" })).toBeNull();
  });

  it("abre a oportunidade exata, ou o funil quando ela não existe", () => {
    expect(opportunityDeepLink("abc")).toBe("/crm?opportunity=abc");
    expect(opportunityDeepLink(null)).toBe("/crm");
  });
});

describe("WhatsApp: preparado e desativado", () => {
  it("fica aguardando template sem configuração", () => {
    const r = planWhatsappNotify("+5511988887777", {});
    expect(r.status).toBe("awaiting_template");
  });

  it("ignora telefone inválido, sem falhar a solicitação", () => {
    expect(planWhatsappNotify("11988887777", { contentSid: "HX123", from: "whatsapp:+551130000000" }).status)
      .toBe("skipped");
    expect(planWhatsappNotify(null, {}).status).toBe("skipped");
  });

  it("recusa Content SID fora do padrão aprovado", () => {
    expect(planWhatsappNotify("+5511988887777", { contentSid: "abc", from: "whatsapp:+551130000000" }).status)
      .toBe("awaiting_template");
  });

  it("libera envio somente com template e remetente configurados", () => {
    expect(planWhatsappNotify("+5511988887777", { contentSid: "HX123", from: "whatsapp:+551130000000" }).status)
      .toBe("sent");
  });

  it("variáveis do template seguem nome e link", () => {
    expect(templateVariables("Casa Nova Tur", "https://app/crm?opportunity=1")).toEqual({
      "1": "Casa Nova Tur",
      "2": "https://app/crm?opportunity=1",
    });
  });

  it("ambiente sem segredos não ativa nada", () => {
    const cfg = whatsappConfigFromEnv(() => undefined);
    expect(planWhatsappNotify("+5511988887777", cfg).status).toBe("awaiting_template");
  });

  it("valida E.164", () => {
    expect(isE164("+5511988887777")).toBe(true);
    expect(isE164("+0511988887777")).toBe(false);
    expect(isE164("5511988887777")).toBe(false);
  });
});
