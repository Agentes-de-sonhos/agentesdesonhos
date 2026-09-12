import { describe, expect, it } from "vitest";
import { clientAreaHostname, isTechnicalPreviewHost } from "@/lib/agencyDomains";

const CASANOVA = "casanovatur.demo.local";
const PREVIEW = "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app";

describe("clientAreaHostname", () => {
  it("aceita o override em hosts técnicos (prévia Lovable e localhost)", () => {
    expect(isTechnicalPreviewHost(PREVIEW)).toBe(true);
    expect(clientAreaHostname(PREVIEW, `?__agency_host=${CASANOVA}`)).toBe(CASANOVA);
    expect(clientAreaHostname("localhost:8080", `?__agency_host=${CASANOVA}`)).toBe(CASANOVA);
    expect(clientAreaHostname("127.0.0.1", `?__agency_host=${CASANOVA}`)).toBe(CASANOVA);
  });

  it("ignora o override em domínios reais (sem spoofing em produção)", () => {
    expect(isTechnicalPreviewHost("www.100limites.tur.br")).toBe(false);
    expect(clientAreaHostname("www.100limites.tur.br", `?__agency_host=${CASANOVA}`)).toBe(
      "www.100limites.tur.br",
    );
    expect(clientAreaHostname("app.agentesdesonhos.com.br", `?__agency_host=${CASANOVA}`)).toBe(
      "app.agentesdesonhos.com.br",
    );
  });

  it("mantém o hostname real quando não há override", () => {
    expect(clientAreaHostname(PREVIEW, "")).toBe(PREVIEW);
    expect(clientAreaHostname("www.100limites.tur.br", "")).toBe("www.100limites.tur.br");
  });

  it("rejeita overrides inválidos e normaliza porta/caixa", () => {
    expect(clientAreaHostname(PREVIEW, "?__agency_host=localhost")).toBe(PREVIEW);
    expect(clientAreaHostname(PREVIEW, "?__agency_host=nao-e-host")).toBe(PREVIEW);
    expect(clientAreaHostname(PREVIEW, `?__agency_host=${CASANOVA.toUpperCase()}:3000`)).toBe(
      CASANOVA,
    );
  });
});
