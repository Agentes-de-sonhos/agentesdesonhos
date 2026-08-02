import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

const header = read("src/components/dashboard/DashboardSectionHeader.tsx");
const news = read("src/components/dashboard/CuratedNewsFeed.tsx");
const community = read("src/components/dashboard/CommunitySocialFeed.tsx");
const academy = read("src/components/dashboard/AcademyCollapsibleCard.tsx");
const map = read("src/components/dashboard/start/MapaTurismoCard.tsx");

describe("Dashboard section headers", () => {
  it("uses a single reusable header component in the four sections", () => {
    for (const src of [news, community, academy, map]) {
      expect(src).toContain("DashboardSectionHeader");
    }
  });

  it("lays out title, description and CTA in one desktop row", () => {
    expect(header).toContain("@container");
    expect(header).toContain("@[44rem]:grid-cols-[auto_minmax(0,1fr)_auto]");
    expect(header).toContain("whitespace-nowrap");
    expect(header).toContain("text-center");
    expect(header).toContain("truncate");
    expect(header).toContain("min-w-0");
  });

  it("falls back to two lines only on narrow containers", () => {
    expect(header).toContain("grid-cols-[auto_auto]");
    expect(header).toContain("order-last col-span-2");
    expect(header).toContain("@[44rem]:order-none @[44rem]:col-span-1");
  });

  it("scales the description typography fluidly", () => {
    expect(header).toContain("text-xs");
    expect(header).toContain("@[60rem]:text-sm");
  });

  it("keeps the colored accent under the title only", () => {
    expect(header).toContain('cn("mt-2 h-1 w-full rounded-full", accentClassName)');
  });

  it("uses the new compact descriptions", () => {
    expect(news).toContain("Fique por dentro das principais notícias do turismo em um só lugar.");
    expect(community).toContain("Compartilhe experiências e oportunidades com outros agentes de viagens.");
    expect(academy).toContain("Aprenda sobre destinos e produtos para vender com mais segurança.");
    expect(map).toContain("Encontre e conecte-se com os melhores fornecedores do turismo.");
  });

  it("removed the old separate description lines", () => {
    expect(community).not.toContain("Compartilhe dúvidas, indicações, experiências e oportunidades");
    expect(academy).not.toContain("Explore trilhas rápidas sobre destinos e produtos");
    expect(map).not.toContain("Encontre seus parceiros ideais");
    expect(news).not.toContain("reunidas em um só lugar");
  });

  it("preserves CTA routes and internal window titles", () => {
    expect(news).toContain('to: "/noticias"');
    expect(community).toContain('to: "/comunidade"');
    expect(academy).toContain('to: "/educa-academy"');
    expect(map).toContain("to: DIRECTORY_ROOT");
    expect(header).toContain("SectionCtaLink");
  });
});
