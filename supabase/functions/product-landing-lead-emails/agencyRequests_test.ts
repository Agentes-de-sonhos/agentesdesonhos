import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { opportunityDeepLink } from "./agencyRequests.ts";

Deno.test("link usa o domínio próprio da agência", () => {
  assertEquals(
    opportunityDeepLink("abc", "www.dricaviagens.com.br"),
    "https://www.dricaviagens.com.br/gestao/crm/funil?opportunity=abc",
  );
});

Deno.test("sem domínio validado, usa o app principal", () => {
  assertEquals(opportunityDeepLink("abc", null), "https://app.agentesdesonhos.com.br/crm?opportunity=abc");
});

Deno.test("prévias técnicas nunca viram link de agência", () => {
  assertEquals(
    opportunityDeepLink("abc", "drica-presentation.preview.local"),
    "https://app.agentesdesonhos.com.br/crm?opportunity=abc",
  );
});
