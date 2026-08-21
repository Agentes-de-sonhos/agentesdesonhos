import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");

/**
 * Leitura pública de orçamentos: o papel anônimo NÃO tem acesso direto às
 * tabelas. Todo acesso público passa por RPCs SECURITY DEFINER que validam o
 * token/código do link. Estes testes evitam regressão do frontend.
 */
describe("segurança da leitura pública de orçamentos", () => {
  const hook = read("src/hooks/useQuotes.ts");
  const publicPage = read("src/pages/OrcamentoPublico.tsx");

  const publicQuoteHook = hook.slice(hook.indexOf("export function usePublicQuote"));

  it("usePublicQuote usa a RPC por share_token", () => {
    expect(publicQuoteHook).toContain("get_quote_by_share_token");
  });

  it("usePublicQuote não lê tabelas de orçamento diretamente", () => {
    expect(publicQuoteHook).not.toContain('from("quotes")');
    expect(publicQuoteHook).not.toContain('from("quote_services")');
    expect(publicQuoteHook).not.toContain('from("quote_entry_extras")');
  });

  it("documentos públicos são lidos por RPC atrelada ao link", () => {
    expect(publicPage).toContain("get_public_quote_documents_by_share_token");
    expect(publicPage).toContain("get_public_quote_documents_by_public_code");
    expect(publicPage).not.toContain('from("quote_documents")');
  });

  it("frontend não usa mais a RPC antiga por UUID do orçamento", () => {
    expect(publicPage).not.toContain('rpc("get_public_quote_documents"');
    expect(publicPage).not.toContain("p_quote_id");
  });
});
