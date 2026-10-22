import { describe, expect, it } from "vitest";
import { MUNDO_EM_CORES_PREVIEW_PROFILE as profile, MUNDO_EM_CORES_PREVIEW_INFO as info, MUNDO_EM_CORES_PREVIEW_HOST as host, DRICA_VIAGENS_PREVIEW_PROFILE, VIAJAR_TIRISMO_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";

describe("O Mundo em Cores approved isolated presentation", () => {
  it("uses professional experience without inventing a founding date", () => {
    expect(profile.about?.badge).toEqual({ value: "29 anos", label: "de experiência no turismo" });
    expect(profile.about?.title).toBe("Viagens planejadas para o seu jeito de viver o mundo.");
    // "curadoria" saiu da lista porque a agência escreveu a palavra no texto que enviou em 22/10/2026.
    expect(JSON.stringify(profile)).not.toMatch(/30 anos|2012|2017|antecipação|jornada|Vinculação de domínio/i);
    expect(profile.about?.text).toContain("Olá, eu sou a Vanessa Figueiredo.");
  });

  it("usa o texto institucional enviado pela agência em 22/10/2026", () => {
    const text = profile.about?.text ?? "";
    expect(text.split("\n\n")).toHaveLength(8);
    expect(text).toContain(
      "Há 29 anos transformo sonhos em viagens. Nos últimos 14, faço isso à frente da minha agência, a O Mundo em Cores · Studio de Viagens.",
    );
    expect(text).toContain(
      "Nesse caminho, aprendi que conhecimento não se acumula: se renova. Vivo em constante aprendizado sobre destinos, passeios e novidades, e conquistei certificações como Xcaret Expert, Disney, Universal e de companhias de cruzeiros, entre outras.",
    );
    expect(text).toContain(
      "Cada cliente que volta com os olhos brilhando, cada família que vive um momento inesquecível, cada “foi a viagem da minha vida”... tudo isso volta para mim em bênçãos e alegria. O que eu faço não é só trabalho: é parte de quem eu sou.",
    );
    expect(text).toContain("Acredito que cada pessoa é única, com seus gostos e seu jeito de viver o mundo. Assim também devem ser as suas viagens.");
    expect(text).toContain("Seja bem-vindo(a) à O Mundo em Cores.");
    expect(text).not.toContain("últimos 16 anos");
    expect(profile.about?.tagline).toBe("Consultoria exclusiva · Experiências sob medida");
    // Nenhuma outra agência recebe a linha de fechamento.
    for (const other of ["www.destinoscomaju.com.br", "100limites.tur.br", "paraisoviagens.com"]) {
      expect(resolveSiteProfile(other).about?.tagline).toBeUndefined();
    }
  });
  it("preserves safe synthetic identity and uses opt-in shared visuals", () => {
    expect(profile.alternateSurfaces).toBe(true);
    expect(profile.campaignCardPresentation).toBe("photoAbove");
    expect(siteThemeRootClass(host)).toContain("wl-mundo");
    expect(info.primary_color).toBe("#245C81");
    expect(info.phone).toBeNull();
    expect(info.agency_slug).toBe("");
    expect(info.public_slug).toBeNull();
    for (const other of ["www.destinoscomaju.com.br", "100limites.tur.br", "briefing-16-v1.preview.local", "briefing-17-v1.preview.local"]) {
      expect(siteThemeRootClass(other)).not.toContain("wl-mundo");
      expect(resolveSiteProfile(other).about?.visitedDestinations).toBeUndefined();
      expect(resolveSiteProfile(other).campaignCardPresentation).toBeUndefined();
    }
    expect(DRICA_VIAGENS_PREVIEW_PROFILE.sections?.testimonials).toEqual({ enabled: false });
    expect(VIAJAR_TIRISMO_PREVIEW_PROFILE.sections?.testimonials).toEqual({ enabled: false });
  });
  it("keeps exact approved testimonials and real media without invented ratings", () => {
    expect(profile.testimonials?.map(({ author, quote }) => [author, quote])).toEqual([
      ["Thaís Rosa", "competência, carinho, personalização, amor, dedicação"],
      ["Lucia Quintas", "sempre priorizando nossos desejos e conforto"],
      ["Raquel Macario", "minhas viagens sejam leves, agradáveis, com excelentes escolhas"],
    ]);
    expect(profile.about?.images?.[0].src).toContain("/__l5e/assets-v1/");
    expect(profile.about?.visitedDestinations?.names).toHaveLength(21);
    expect(profile.about?.visitedDestinations?.names).not.toContain("Indonésia");
    expect(profile.about?.visitedDestinations?.names).toContain("Eslovênia");
    expect(profile.about?.visitedDestinations?.names).toContain("Ilhas Virgens Britânicas");
    // O número não é exibido no rodapé: apenas o link de WhatsApp (pedido do Fernando em 22/10/2026).
    expect(profile.footer?.phone).toBeUndefined();
    expect(profile.footer?.whatsapp).toBe("(11) 99995-4734");
    expect(profile.about?.visitedDestinations?.title).toBe("Destinos que já conheci");
    expect(profile.modules?.find(m => m.key === "elas-viajam")?.text).toBe("Experiências de viagem para mulheres. Converse com a Vanessa sobre propostas e próximas saídas.");
    expect(profile.hero?.[0].title).toBe("Viagem desenhada para você.");
    expect(profile.heroPresentation?.cta).toBeUndefined();
    expect(profile.hero?.[1].title).toBe("Existe uma Europa para cada pessoa.");
    expect(profile.hero?.[2].title).toBe("Viajar em boa companhia.");
    expect(profile.signature?.title).toBe("Uma viagem com a sua personalidade.");
    expect(profile.sections?.newsletter).toEqual({ enabled: true, order: 10 });
    expect(profile.socialStrip?.links[0].network).toBe("instagram");
  });
});