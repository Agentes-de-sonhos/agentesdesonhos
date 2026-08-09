import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isAllowedServiceKey, normalizeHost, originAllowed } from "./validation.ts";

const h = (origin: string | null, referer: string | null = null) => ({ origin, referer });

Deno.test("aceita envio do próprio domínio da agência (root e www)", () => {
  assertEquals(originAllowed(h("https://100limites.tur.br"), "100limites.tur.br"), true);
  assertEquals(originAllowed(h("https://www.100limites.tur.br"), "100limites.tur.br"), true);
  assertEquals(originAllowed(h("https://100limites.tur.br"), "www.100limites.tur.br"), true);
});

Deno.test("rejeita hostname divergente (lead não vaza para outra agência)", () => {
  assertEquals(originAllowed(h("https://outraagencia.tur.br"), "100limites.tur.br"), false);
  assertEquals(originAllowed(h("https://100limites.tur.br.evil.com"), "100limites.tur.br"), false);
  assertEquals(originAllowed(h(null, null), "100limites.tur.br"), false);
});

Deno.test("exceção documentada: preview Lovable com ?__agency_host", () => {
  assertEquals(originAllowed(h("https://id-preview--abc.lovable.app"), "100limites.tur.br"), true);
  assertEquals(originAllowed(h("http://localhost:8080"), "100limites.tur.br"), true);
});

Deno.test("allowlist de service_key", () => {
  for (const key of ["aereo", "hospedagem", "carro", "transfer", "ingressos", "seguro", "cruzeiros", "pacotes"]) {
    assertEquals(isAllowedServiceKey(key), true);
  }
  assertEquals(isAllowedServiceKey("newsletter"), false);
  assertEquals(isAllowedServiceKey("admin"), false);
  assertEquals(isAllowedServiceKey(""), false);
});

Deno.test("normalizeHost remove porta e www", () => {
  assertEquals(normalizeHost("WWW.Exemplo.Tur.BR:443"), "exemplo.tur.br");
});
