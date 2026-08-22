/**
 * Contrato dos dois contextos de card no orçamento público:
 *
 * 1. Serviços dentro de grupos/seções reais (buildQuoteSectionLayout +
 *    visibleSectionGroups) recebem `collapsible={false}`: cabeçalho estático,
 *    sem ChevronDown, conteúdo sempre completo e carrinho inline dentro do card.
 * 2. Serviços fora de grupos e orçamentos antigos sem seções mantêm
 *    `collapsible` verdadeiro e o comportamento individual atual.
 *
 * Cobre também os dois caminhos de pagamento por serviço
 * (ServiceInvestmentInline e footer customizado) e a ocultação de valores.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildQuoteSectionLayout,
  visibleSectionGroups,
} from "@/lib/quoteSections";
import type { QuoteSection, QuoteService } from "@/types/quote";

const src = readFileSync("src/pages/OrcamentoPublico.tsx", "utf8");

const section = (id: string, title: string, order_index: number): QuoteSection =>
  ({ id, quote_id: "q1", title, order_index } as QuoteSection);
const service = (id: string, order_index: number, section_id: string | null = null): QuoteService =>
  ({ id, quote_id: "q1", order_index, section_id, service_type: "hotel", amount: 100 } as unknown as QuoteService);

describe("cards agrupados x individuais no orçamento público", () => {
  it("CollapsibleServiceCard aceita a prop explícita collapsible com default true", () => {
    expect(src).toMatch(/collapsible = true,/);
    expect(src).toMatch(/collapsible\?: boolean;/);
    expect(src).toMatch(/const expanded = collapsible \? isOpen : true;/);
  });

  it("cabeçalho é botão apenas quando colapsável e o chevron desaparece em grupo", () => {
    expect(src).toMatch(/\{collapsible \? \(\s*<button/);
    expect(src).toMatch(/data-service-card-header="static"/);
    expect(src).toMatch(/\{collapsible && \(\s*<ChevronDown/);
  });

  it("corpo do card usa expanded (nunca isOpen direto) para renderizar conteúdo", () => {
    expect(src).not.toMatch(/\{isOpen && /);
    expect(src).toMatch(/gridTemplateRows: expanded \? "1fr" : "0fr"/);
  });

  it("serviços de grupo são renderizados com collapsible=false e os soltos sem a flag", () => {
    expect(src).toMatch(/group\.services\.map\(\(s\) => renderCard\(s, false\)\)/);
    expect(src).toMatch(/layout\.unsectioned\.map\(\(s\) => renderCard\(s\)\)/);
    expect(src).toMatch(/quote\.services!\.map\(\(s\) => renderCard\(s\)\)/);
  });

  it("carrinho inline continua dentro do card, após o footer de pagamento", () => {
    const footer = src.indexOf("data-service-payment-footer");
    // Nos grupos (collapsible=false) a ação fica no rodapé do card, após o footer.
    const action = src.indexOf("{!collapsible && <BookingServiceActionRow service={service} attached={investmentBandVisible} />}");
    expect(footer).toBeGreaterThan(0);
    expect(action).toBeGreaterThan(footer);
  });

  it("faixa de ação do carrinho é azul-clara, full width e alinhada à direita", () => {
    const i = src.indexOf("data-booking-action-row");
    expect(i).toBeGreaterThan(0);
    const row = src.slice(i, i + 400);
    expect(row).toMatch(/bg-primary\/\[0\.07\]/);
    expect(row).toMatch(/border-t-2 border-primary\/25/);
    expect(row).toMatch(/data-attached=/);
    expect(row).toMatch(/w-full/);
    expect(row).toMatch(/justify-end/);
    expect(row).toMatch(/py-3\.5/);
  });

  it("grupo com um único serviço também vira bloco não colapsável", () => {
    const layout = buildQuoteSectionLayout([section("s1", "Transporte Privativo", 0)], [service("a", 0, "s1")]);
    const groups = visibleSectionGroups(layout);
    expect(groups).toHaveLength(1);
    expect(groups[0].services.map((s) => s.id)).toEqual(["a"]);
    expect(layout.unsectioned).toHaveLength(0);
  });

  it("grupo com vários serviços mantém ordem e conta corretamente", () => {
    const layout = buildQuoteSectionLayout(
      [section("s1", "Orlando", 0)],
      [service("a", 0, "s1"), service("b", 1, "s1"), service("c", 2, null)],
    );
    const groups = visibleSectionGroups(layout);
    expect(groups[0].services.map((s) => s.id)).toEqual(["a", "b"]);
    expect(layout.unsectioned.map((s) => s.id)).toEqual(["c"]);
  });

  it("orçamento antigo sem seções não gera nenhum grupo (todos individuais)", () => {
    const layout = buildQuoteSectionLayout([], [service("a", 0), service("b", 1)]);
    expect(visibleSectionGroups(layout)).toHaveLength(0);
    expect(layout.unsectioned).toHaveLength(2);
  });

  it("apenas o PublicSectionAccordion controla abrir/fechar do grupo", () => {
    const accordion = readFileSync("src/components/quote/PublicSectionAccordion.tsx", "utf8");
    expect(accordion).toMatch(/aria-expanded=\{open\}/);
    expect(accordion).toMatch(/\{open && <div/);
  });

  it("texto de apoio da seção é universal e válido para cards agrupados e individuais", () => {
    expect(src).toMatch(/Consulte abaixo os detalhes de cada serviço\./);
    expect(src).not.toMatch(/Toque em cada item para ver os detalhes completos/);
  });
});

describe("apresentação dos pagamentos por serviço", () => {
  it("ServiceInvestmentInline centraliza, dá respiro e usa tipografia legível", () => {
    const block = src.slice(src.indexOf("function ServiceInvestmentInline"), src.indexOf("function CollapsibleServiceCard"));
    expect(block).toMatch(/border-t border-primary\/25 bg-primary\/\[0\.07\] px-5 py-4 space-y-3 text-center/);
    expect(block).not.toMatch(/border-t border-border\/50/);
    expect(block).toMatch(/items-baseline justify-center/);
    // Valor principal destacado; rótulo "À vista" legível.
    expect(block).toMatch(/text-lg sm:text-xl font-bold tracking-tight text-primary tabular-nums/);
    expect(block).toMatch(/text-sm sm:text-base text-muted-foreground/);
    // "Valor do serviço" em text-sm/base, sem duplicar o bloco.
    expect(block).toMatch(/text-sm sm:text-base text-foreground\/80/);
    expect(block.match(/Valor do serviço:/g)).toHaveLength(1);
    expect(block.match(/Condições de pagamento/g)).toHaveLength(1);
  });

  it("footer customizado é centralizado e não coexiste com o bloco inline", () => {
    expect(src).toMatch(/showPaymentPerService && !showInvestmentInline && !hotelHasMultipleRooms/);
    expect(src).toMatch(/flex flex-col items-center gap-2 text-center/);
    expect(src).toMatch(/text-lg sm:text-xl font-bold tracking-tight text-primary break-words leading-snug tabular-nums/);
  });

  it("título do footer customizado é 'Condições de pagamento' e não 'Parcelamento'", () => {
    const footerStart = src.indexOf("data-service-payment-footer");
    const footerEnd = src.indexOf("{!collapsible && <BookingServiceActionRow service={service} attached={investmentBandVisible} />}");
    const footer = src.slice(footerStart, footerEnd);
    expect(footer).toMatch(/Condições de pagamento/);
    expect(footer).not.toMatch(/Parcelamento/);
  });

  it("valores ocultos: pacote fechado mostra apenas o rótulo de incluído", () => {
    expect(src).toMatch(/hidesIndividualAmounts\(quote\)/);
    expect(src).toMatch(/PACKAGE_INCLUDED_LABEL/);
  });
});

describe("carrinho em serviços avulsos x agrupados", () => {
  it("serviços avulsos só exibem ação de carrinho quando o card está expandido", () => {
    // Ação dos cards colapsáveis é renderizada dentro do corpo, condicionada a expanded.
    expect(src).toMatch(/\{collapsible && expanded && \(\s*<BookingServiceActionRow service=\{service\} attached=\{investmentBandVisible\} \/>/);
  });

  it("serviços avulsos recolhidos não reservam espaço para o carrinho", () => {
    // Não existe mais uma ação incondicional no rodapé do card.
    const bottomAction = src.indexOf("{!collapsible && <BookingServiceActionRow");
    expect(bottomAction).toBeGreaterThan(0);
    // O único <BookingServiceActionRow> fora do corpo colapsável é o dos grupos.
    // Toda renderização da ação é guardada por collapsible/!collapsible.
    const occurrences = [...src.matchAll(/<BookingServiceActionRow\b/g)].map((m) =>
      src.slice(Math.max(0, m.index! - 120), m.index!),
    );
    expect(occurrences.length).toBeGreaterThan(0);
    for (const before of occurrences) {
      expect(before).toMatch(/collapsible/);
    }
  });

  it("serviços dentro de blocos mantêm a ação de carrinho sempre visível", () => {
    expect(src).toMatch(/\{!collapsible && <BookingServiceActionRow service=\{service\} attached=\{investmentBandVisible\} \/>\}/);
  });
});


describe("bloco azul unificado de condições de pagamento", () => {
  it("faixa azul começa no bloco de pagamento (linha azul fina, sem cinza)", () => {
    const block = src.slice(
      src.indexOf("function ServiceInvestmentInline"),
      src.indexOf("function CollapsibleServiceCard"),
    );
    expect(block).toMatch(/border-t border-primary\/25 bg-primary\/\[0\.07\]/);
    expect(block).not.toMatch(/border-border\/50/);
  });

  it("bloco de pagamento fica fora do padding do corpo, imediatamente antes do carrinho", () => {
    const investment = src.indexOf("<ServiceInvestmentInline service={service} quote={quote} />");
    const action = src.indexOf("<BookingServiceActionRow service={service} attached={investmentBandVisible} />");
    expect(investment).toBeGreaterThan(0);
    expect(action).toBeGreaterThan(investment);
  });

  it("carrinho colado no bloco de pagamento perde a divisória azul", () => {
    expect(src).toMatch(/const investmentBandVisible =/);
    expect(src).toMatch(/attached \? "pb-3\.5 pt-1" : "border-t-2 border-primary\/25 py-3\.5"/);
  });

  it("card recolhido não recebe a faixa azul de pagamento", () => {
    expect(src).toMatch(/expanded && showInvestmentInline && !hotelHasMultipleRooms/);
  });
});
