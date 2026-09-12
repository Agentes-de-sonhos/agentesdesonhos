import { describe, expect, it } from "vitest";
import {
  agencyContextHost,
  stripAgencyContext,
  withAgencyContext,
} from "@/lib/agencyContextLink";

const TENANT = "casanovatur.demo.local";
const PREVIEW = "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app";
const SEARCH = `?__agency_host=${TENANT}`;

describe("agencyContextLink", () => {
  it("resolve o tenant apenas em hosts técnicos", () => {
    expect(agencyContextHost(PREVIEW, SEARCH)).toBe(TENANT);
    expect(agencyContextHost("localhost:8080", SEARCH)).toBe(TENANT);
    expect(agencyContextHost("www.100limites.tur.br", SEARCH)).toBeNull();
    expect(agencyContextHost(PREVIEW, "")).toBeNull();
  });

  it("preserva o contexto com query e hash na ordem correta", () => {
    expect(withAgencyContext("/", PREVIEW, SEARCH)).toBe(`/?__agency_host=${TENANT}`);
    expect(withAgencyContext("/#solicitacoes", PREVIEW, SEARCH)).toBe(
      `/?__agency_host=${TENANT}#solicitacoes`,
    );
    expect(withAgencyContext("/#campanhas", PREVIEW, SEARCH)).toBe(
      `/?__agency_host=${TENANT}#campanhas`,
    );
    expect(withAgencyContext("/area-do-cliente", PREVIEW, SEARCH)).toBe(
      `/area-do-cliente?__agency_host=${TENANT}`,
    );
    expect(withAgencyContext("/gestao/login", PREVIEW, SEARCH)).toBe(
      `/gestao/login?__agency_host=${TENANT}`,
    );
    expect(withAgencyContext("/gestao/crm/funil?tab=funil#topo", PREVIEW, SEARCH)).toBe(
      `/gestao/crm/funil?tab=funil&__agency_host=${TENANT}#topo`,
    );
  });

  it("não duplica o parâmetro quando o caminho já o carrega", () => {
    expect(withAgencyContext(`/gestao?__agency_host=${TENANT}`, PREVIEW, SEARCH)).toBe(
      `/gestao?__agency_host=${TENANT}`,
    );
  });

  it("em domínio real gera URLs limpas (sem spoofing)", () => {
    expect(withAgencyContext("/area-do-cliente", "www.100limites.tur.br", SEARCH)).toBe(
      "/area-do-cliente",
    );
    expect(withAgencyContext(`/gestao?__agency_host=${TENANT}`, "www.100limites.tur.br", "")).toBe(
      "/gestao",
    );
    expect(stripAgencyContext(`/?__agency_host=${TENANT}#sobre`)).toBe("/#sobre");
  });

  it("não altera links externos ou âncoras puras", () => {
    expect(withAgencyContext("https://wa.me/5551999999999", PREVIEW, SEARCH)).toBe(
      "https://wa.me/5551999999999",
    );
    expect(withAgencyContext("#atendimento", PREVIEW, SEARCH)).toBe("#atendimento");
  });
});
