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

  it("scopes white section surfaces to the Paraíso home wrappers, not hero or footer", () => {
    const css = readFileSync("src/index.css", "utf8");
    const home = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");
    expect(home).toMatch(/if \(profile\.key === "luxuryCurated"\)[\s\S]*?className="wl-paraiso-home-surface"/);
    expect(css).toMatch(/\.wl-paraiso-home-surface > section,[\s\S]*?background-color: #fff !important/);
    expect(css).not.toContain(".wl-paraiso-home-surface #rodape");
  });
});
