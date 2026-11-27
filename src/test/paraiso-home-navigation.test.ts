import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

describe("Paraíso homepage and main menu", () => {
  it.each(["paraisoviagens.com", "www.paraisoviagens.com"])("keeps the requested menu on %s", (host) => {
    const profile = resolveSiteProfile(host);
    expect(profile.headerNav?.map(x => x.label)).toEqual(["Início", "Destaques", "Experiências", "Sobre", "Grupo WhatsApp", "Área do Cliente"]);
    expect(profile.headerNav?.[1]?.to).toBe("/#destinos");
    expect(profile.headerNav?.[2]?.children?.map(x => x.to)).toEqual(["/#novidades", "/#explora-monaco"]);
    expect(profile.headerNav?.[3]?.children?.map(x => x.label)).toEqual(["Nossa trajetória", "Credenciais", "Perguntas frequentes"]);
    expect(profile.hideHeaderBlog).toBe(true);
  });

  it("alternates the ordinary sections without recoloring Explora, the newsletter, or the footer", () => {
    const css = readFileSync("src/index.css", "utf8");
    const home = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");
    expect(home).toContain('if (section.key === "newsletter") return node;');
    expect(home).toContain('const tinted = rendered++ % 2 === 1;');
    expect(css).toContain(".wl-paraiso-home-surface > section:not(#explora-monaco)");
    expect(css).toContain("color-mix(in srgb, hsl(var(--wl-green)) 9%, #fff)");
    expect(css).not.toContain(".wl-paraiso-home-surface #rodape");
    expect(css).not.toContain(".wl-paraiso-home-surface #novidades");
  });
});
