import { describe, it, expect } from "vitest";
import {
  isUnderConstruction,
  resolveConstructionVariant,
  resolveHomeSurface,
  isRouteGatedByStatus,
} from "@/lib/agencySiteStatus";
import { canonicalRedirectHost } from "@/lib/agencySiteContacts";
import { resolveAgencyBrowserTitle } from "@/hooks/useAgencyBrowserTitle";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

const MUNDO_HOSTS = ["omundoemcores.com.br", "www.omundoemcores.com.br"];

describe("O Mundo em Cores — página em construção no domínio", () => {
  it("marca os hosts como under_construction com variante exclusiva", () => {
    for (const host of MUNDO_HOSTS) {
      expect(isUnderConstruction(host), host).toBe(true);
      expect(resolveConstructionVariant(host), host).toBe("mundoEmCores");
      expect(resolveHomeSurface(host), host).toBe("under_construction");
    }
  });

  it("não afeta outros tenants nem hosts não configurados", () => {
    const others = [
      "100limites.tur.br",
      "destinoscomaju.com.br",
      "essyatur.com.br",
      "paraisoviagens.com",
      "faeviagens.com.br",
      "outraagencia.com.br",
      "",
      null,
    ];
    for (const host of others) {
      expect(resolveConstructionVariant(host as string | null), String(host)).not.toBe("mundoEmCores");
    }
    expect(resolveSiteProfile("100limites.tur.br").key).not.toContain("mundo");
  });

  it("rotas transacionais seguem liberadas; só a home é bloqueada", () => {
    for (const host of MUNDO_HOSTS) {
      for (const path of ["/orcamento/ABC123", "/roteiro/ABC123", "/carteira/ABC123", "/fatura/ABC123", "/area-do-cliente"]) {
        expect(isRouteGatedByStatus(path, host), `${host}${path}`).toBe(false);
      }
      expect(isRouteGatedByStatus("/", host), host).toBe(true);
    }
  });

  it("título do navegador e redirecionamento canônico", () => {
    for (const host of MUNDO_HOSTS) {
      expect(resolveAgencyBrowserTitle(host), host).toBe("O Mundo em Cores");
    }
    expect(canonicalRedirectHost("omundoemcores.com.br")).toBe("www.omundoemcores.com.br");
    expect(canonicalRedirectHost("www.omundoemcores.com.br")).toBeNull();
  });
});
