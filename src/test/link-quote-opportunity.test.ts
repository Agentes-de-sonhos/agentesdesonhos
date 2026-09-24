import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { searchLinkableQuotes } from "@/components/crm/LinkQuoteToOpportunityDialog";

const q = [
  { id: "a", trip_title: "Paris", destination: "França", client_name: "Ana", public_access_code: "ORC123" },
  { id: "b", trip_title: "Orlando", destination: "EUA", client_name: "Bruno" },
] as any[];

describe("gerar / vincular orçamento", () => {
  it("busca por título, cliente, destino e número", () => {
    expect(searchLinkableQuotes(q, "paris").map((x) => x.id)).toEqual(["a"]);
    expect(searchLinkableQuotes(q, "bruno").map((x) => x.id)).toEqual(["b"]);
    expect(searchLinkableQuotes(q, "eua").map((x) => x.id)).toEqual(["b"]);
    expect(searchLinkableQuotes(q, "orc123").map((x) => x.id)).toEqual(["a"]);
  });
  it("menu renomeado e vínculo por quotes.opportunity_id restrito à agência", () => {
    const card = readFileSync("src/components/crm/OpportunityCard.tsx", "utf-8");
    const dlg = readFileSync("src/components/crm/LinkQuoteToOpportunityDialog.tsx", "utf-8");
    expect(card).toContain("Gerar / vincular orçamento");
    expect(card).toContain("onGenerateNew={handleCreateQuote}");
    expect(dlg).toContain('.eq("user_id", agencyOwnerId)');
    expect(dlg).toContain('.is("opportunity_id", null)');
  });
});
