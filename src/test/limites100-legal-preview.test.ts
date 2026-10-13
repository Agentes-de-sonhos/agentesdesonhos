import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  isLimites100LegalPreviewActive,
  LIMITES100_PRIVACY,
  LIMITES100_TERMS,
  LIMITES100_LEGAL_DATA as D,
  LIMITES100_LEGAL_PENDING,
} from "@/lib/agencyLegal/limites100LegalPreview";

const PREVIEW = "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app";
const all = [LIMITES100_PRIVACY, LIMITES100_TERMS]
  .flatMap((d) => [d.title, d.lastUpdated, ...d.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.items ?? [])])])
  .concat(LIMITES100_LEGAL_PENDING)
  .join("\n");

describe("100 Limites — prévia jurídica isolada", () => {
  it("ativa só em host técnico de prévia com tenant 100 Limites (raiz e www)", () => {
    expect(isLimites100LegalPreviewActive("100limites.tur.br", PREVIEW)).toBe(true);
    expect(isLimites100LegalPreviewActive("www.100limites.tur.br", PREVIEW)).toBe(true);
    expect(isLimites100LegalPreviewActive("www.100limites.tur.br", "localhost")).toBe(true);
  });
  it("nunca ativa em produção, outro tenant ou domínio da plataforma", () => {
    expect(isLimites100LegalPreviewActive("100limites.tur.br", "100limites.tur.br")).toBe(false);
    expect(isLimites100LegalPreviewActive("www.100limites.tur.br", "www.100limites.tur.br")).toBe(false);
    expect(isLimites100LegalPreviewActive("www.destinoscomaju.com.br", PREVIEW)).toBe(false);
    expect(isLimites100LegalPreviewActive("www.destinoscomaju.com.br", "www.destinoscomaju.com.br")).toBe(false);
    expect(isLimites100LegalPreviewActive("100limites.tur.br", "app.agentesdesonhos.com.br")).toBe(false);
    expect(isLimites100LegalPreviewActive("100limites.tur.br", "agentedesonhoproject.lovable.app.evil.com")).toBe(false);
  });
  it("não contém marcadores crus nem dados de outras agências", () => {
    expect(all).not.toMatch(/\{\{|\}\}|\[IF|\[\/IF|\[EACH/);
    expect(all).not.toMatch(/FECAFER|23\.593\.301|destinoscomaju|Google Calendar|comunidade/i);
  });
  it("usa os dados aprovados e não inventa pontos pendentes", () => {
    for (const v of [D.legalName, D.cnpj, D.email, D.phone, D.site, "Palhoça/SC", "88133-060"]) expect(all).toContain(v);
    expect(all).not.toMatch(/encarregad[oa] (pelo tratamento )?é|DPO é|Configurações de Cookies disponível|ficam desativados até/i);
    expect(all).not.toMatch(/transporte próprio|frota própria/i);
    expect(all).toContain("contratados separadamente");
  });
  it("rotas e rodapé usam o mesmo guard e mantêm o fallback da plataforma", () => {
    const routes = readFileSync("src/components/routing/AgencyDomainRoutes.tsx", "utf8");
    expect(routes).toContain('isLimites100LegalPreviewActive(info.hostname) ? <Limites100LegalPreviewPage kind="privacy" /> : <PoliticasPrivacidade />');
    expect(routes).toContain('isLimites100LegalPreviewActive(info.hostname) ? <Limites100LegalPreviewPage kind="terms" /> : <TermosDeUso />');
    const layout = readFileSync("src/components/whitelabel/AgencySiteLayout.tsx", "utf8");
    expect(layout).toContain("{legalPreview && <Limites100LegalFooterPreview />}");
  });
});
