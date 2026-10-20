import { describe, it, expect } from "vitest";
import { resolveSiteContacts, withSiteContacts } from "@/lib/agencySiteContacts";

describe("telefone principal da Paraíso Viagens", () => {
  it("aplica (48) 99946-6467 nos dois hosts do site", () => {
    for (const host of ["paraisoviagens.com", "www.paraisoviagens.com"]) {
      expect(resolveSiteContacts(host).phone).toBe("(48) 99946-6467");
    }
  });

  it("sobrepõe o telefone do cadastro só para a Paraíso", () => {
    const info = { hostname: "www.paraisoviagens.com", phone: "48999466465" };
    expect(withSiteContacts(info).phone).toBe("(48) 99946-6467");
  });

  it("não muda o telefone de outras agências", () => {
    expect(resolveSiteContacts("bardelliviagens.com.br").phone).toBe("(11) 97576-7319");
    expect(resolveSiteContacts("100limites.tur.br").phone).toBeUndefined();
  });
});
