import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { generateShareToken } from "@/hooks/useQuotes";
import { buildPublicToolUrl } from "@/lib/publicAgencyUrls";

const quotes = readFileSync("src/hooks/useQuotes.ts", "utf8");
const editor = readFileSync("src/pages/GerarOrcamento.tsx", "utf8");
const card = readFileSync("src/components/crm/OpportunityCard.tsx", "utf8");

describe("orçamento web automático", () => {
  it("token público é opaco e único (32 hex)", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });

  it("criação já nasce publicada com link público", () => {
    const createBlock = quotes.slice(quotes.indexOf("createQuoteMutation"), quotes.indexOf("updateQuoteMutation"));
    expect(createBlock).toContain('status: "published"');
    expect(createBlock).toContain("share_token: generateShareToken()");
  });

  it("a cópia do orçamento também recebe link próprio", () => {
    const dup = quotes.slice(quotes.indexOf("duplicateQuoteMutation"), quotes.indexOf("publishQuoteMutation"));
    expect(dup).toContain('status: "published"');
    expect(dup).toContain("share_token: generateShareToken()");
  });

  it("orçamentos antigos recebem link silenciosamente, uma vez", () => {
    expect(quotes).toContain("ensureQuotePublicLink: ensurePublicLinkMutation.mutateAsync");
    expect(quotes).toContain('.is("share_token", null)');
    expect(editor).toContain("ensureQuotePublicLink(quote.id)");
    expect(editor).toContain("ensuredLinkRef");
  });

  it("a etapa Publicar e o botão Gerar orçamento web não existem mais", () => {
    expect(editor).not.toContain('short: "Publicar"');
    expect(editor).not.toContain("Gerar orçamento web");
    expect(editor).not.toContain("const handlePublish");
    // Abrir/Copiar/Compartilhar seguem disponíveis.
    expect(editor).toContain("QuoteShareBar");
  });

  it("link canônico continua no formato dos sites-modelo", () => {
    expect(buildPublicToolUrl({ kind: "orcamento", agencySlug: "casa-nova-tur", accessCode: "ABC123456789" })).toBe(
      "https://vitrine.tur.br/casa-nova-tur/orcamento/ABC123456789",
    );
  });
});

describe("criação direta a partir da oportunidade", () => {
  it("reutiliza o orçamento existente em vez de duplicar", () => {
    expect(card).toContain("navigate(nav.quote(data.id))");
    expect(card).not.toContain('setLinkedDialog({ kind: "quote"');
  });

  it("cria e abre o editor sem tela intermediária, com guarda de corrida", () => {
    expect(editor).toContain("autoQuoteRef");
    expect(editor).toContain("opportunity_id: opportunityId");
    expect(editor).toContain("{ replace: true }");
  });
});
