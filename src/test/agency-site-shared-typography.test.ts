import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AGENCY_CARD_DESCRIPTION_CLASS,
  AGENCY_CARD_TITLE_CLASS,
  AGENCY_HERO_COPY_CLASS,
  AGENCY_HERO_SUBTITLE_CLASS,
  AGENCY_HERO_TITLE_CLASS,
  AGENCY_SECTION_HEADING_CLASS,
  AGENCY_SECTION_SUBTITLE_CLASS,
  AGENCY_SECTION_TITLE_CLASS,
} from "@/lib/agencySiteTypography";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteTheme } from "@/lib/agencySiteTheme";

const homeSource = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");
const campaignSource = readFileSync("src/components/whitelabel/AgencyCampaignRail.tsx", "utf8");

describe("tipografia compartilhada dos sites white label", () => {
  it("usa a largura real do container nos títulos e subtítulos das seções", () => {
    expect(AGENCY_SECTION_HEADING_CLASS).toContain("w-full");
    expect(AGENCY_SECTION_TITLE_CLASS).toContain("w-full");
    expect(AGENCY_SECTION_SUBTITLE_CLASS).toContain("max-w-5xl");
    expect(AGENCY_SECTION_TITLE_CLASS).not.toContain("max-w-2xl");
    expect(AGENCY_SECTION_SUBTITLE_CLASS).not.toContain("max-w-2xl");
  });

  it("amplia o texto do hero no desktop sem impor quebra rígida no mobile", () => {
    expect(AGENCY_HERO_COPY_CLASS).toContain("md:max-w-[82%]");
    expect(AGENCY_HERO_TITLE_CLASS).toContain("max-w-[30ch]");
    expect(AGENCY_HERO_SUBTITLE_CLASS).toContain("max-w-[72rem]");
    for (const classes of [
      AGENCY_HERO_COPY_CLASS,
      AGENCY_HERO_TITLE_CLASS,
      AGENCY_HERO_SUBTITLE_CLASS,
      AGENCY_SECTION_TITLE_CLASS,
      AGENCY_SECTION_SUBTITLE_CLASS,
      AGENCY_CARD_TITLE_CLASS,
      AGENCY_CARD_DESCRIPTION_CLASS,
    ]) {
      expect(classes).not.toContain("whitespace-nowrap");
      expect(classes).not.toContain("truncate");
      expect(classes).not.toContain("line-clamp");
    }
  });

  it("aplica as classes compartilhadas no hero, seções, avaliações e cards", () => {
    expect(homeSource).toContain("AGENCY_HERO_TITLE_CLASS");
    expect(homeSource).toContain("AGENCY_SECTION_TITLE_CLASS");
    expect(homeSource).toContain("AGENCY_CARD_DESCRIPTION_CLASS");
    expect(campaignSource).toContain("AGENCY_CARD_TITLE_CLASS");
    expect(campaignSource).not.toContain("xl:w-[calc((100%-3.75rem)/4)]");
  });

  it("remove o texto inválido e preserva a newsletter declarativa da Destinos com a Ju", () => {
    const profile = resolveSiteProfile("destinoscomaju.com.br");
    expect(homeSource).not.toMatch(/>\s*title \?\? "Receba novidades e oportunidades"\s*</);
    expect(homeSource).toContain('{copy.title ?? "Receba novidades e oportunidades"}');
    expect(profile.copy?.newsletter).toEqual({
      kicker: "INSPIRAÇÕES PARA VIAJAR",
      title: "Receba novidades e oportunidades",
      subtitle: "Deixe o seu contato para receber inspirações de destinos, cruzeiros, resorts e experiências selecionadas pela Destinos com a Ju.",
      cta: "Quero receber inspirações",
      surface: "navy",
      titleSingleLine: true,
    });

  });

  it("preserva textos e temas dos perfis com proporções diferentes", () => {
    expect(resolveSiteProfile("destinoscomaju.com.br").copy?.destinations?.title).toBe(
      "Inspirações para a sua próxima viagem",
    );
    expect(resolveSiteProfile("destinoscomaju.com.br").destinations?.[0].title).toBe("Europa no seu ritmo");
    expect(resolveSiteTheme("destinoscomaju.com.br")).toBe("roseEditorial");
    expect(resolveSiteTheme("paraisoviagens.com")).toBe("luxuryEditorial");
    expect(resolveSiteTheme("www.essyatur.com.br")).toBe("essyaEditorial");
    expect(resolveSiteTheme("100limites.tur.br")).toBe("travelEditorial");
  });
});