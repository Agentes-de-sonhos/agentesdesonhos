import { describe, it, expect } from "vitest";
import {
  bookingCtaLabel,
  bookingSelectionTotal,
  buildBookingSelectionModel,
  effectiveSelectionIds,
  initialBookingSelection,
  toggleBookingSelection,
  validateBookingContact,
  validateBookingSelection,
} from "@/lib/quoteBookingSelection";

const svc = (id: string, mode?: string, amount = 100, groupId?: string) => ({
  id,
  service_type: "hotel",
  amount,
  selection_mode: mode,
  choice_group_id: groupId ?? null,
  service_data: {},
}) as any;

const group = (id: string, type: "alternative" | "free", min = 1, max: number | null = null) => ({
  id,
  title: `Grupo ${id}`,
  group_type: type,
  min_select: min,
  max_select: max,
  order_index: 0,
}) as any;

const quote = (over: any = {}) => ({
  total_amount: 1000,
  show_detailed_prices: true,
  ...over,
}) as any;

describe("modelo de seleção", () => {
  it("obrigatório entra sempre e não pode ser retirado", () => {
    const services = [svc("a", "required"), svc("b", "optional")];
    const model = buildBookingSelectionModel(quote(), services);
    let selected = initialBookingSelection(model);
    expect(selected).toEqual(["a"]);
    selected = toggleBookingSelection(model, selected, "a");
    expect(effectiveSelectionIds(model, selected)).toContain("a");
    expect(validateBookingSelection(model, selected)).toBeNull();
  });

  it("opcional alterna livremente", () => {
    const services = [svc("a", "required"), svc("b", "optional")];
    const model = buildBookingSelectionModel(quote(), services);
    const selected = toggleBookingSelection(model, ["a"], "b");
    expect(effectiveSelectionIds(model, selected).sort()).toEqual(["a", "b"]);
  });

  it("grupo alternativa exige exatamente 1", () => {
    const g = group("g1", "alternative");
    const services = [svc("a", "alternative", 100, "g1"), svc("b", "alternative", 200, "g1")];
    const model = buildBookingSelectionModel(quote(), services, [g]);
    expect(validateBookingSelection(model, [])).toMatch(/exatamente 1/i);
    const one = toggleBookingSelection(model, [], "a");
    expect(validateBookingSelection(model, one)).toBeNull();
    // Selecionar a concorrente troca a escolha em vez de somar.
    const two = toggleBookingSelection(model, one, "b");
    expect(two).toEqual(["b"]);
  });

  it("grupo livre respeita min e max", () => {
    const g = group("g2", "free", 1, 2);
    const services = [
      svc("a", "free", 100, "g2"),
      svc("b", "free", 100, "g2"),
      svc("c", "free", 100, "g2"),
    ];
    const model = buildBookingSelectionModel(quote(), services, [g]);
    expect(validateBookingSelection(model, [])).toMatch(/pelo menos 1/i);
    expect(validateBookingSelection(model, ["a"])).toBeNull();
    expect(validateBookingSelection(model, ["a", "b", "c"])).toMatch(/no máximo 2/i);
  });

  it("pacote fechado bloqueia tudo e usa o total efetivo", () => {
    const q = quote({ pricing_mode: "package", package_total_amount: 7500 });
    const services = [svc("a", "optional", 0), svc("b", "optional", 0)];
    const model = buildBookingSelectionModel(q, services);
    expect(model.packageMode).toBe(true);
    const selected = initialBookingSelection(model);
    expect(selected.sort()).toEqual(["a", "b"]);
    // Não é possível retirar itens mantendo o valor.
    expect(toggleBookingSelection(model, selected, "a").sort()).toEqual(["a", "b"]);
    expect(bookingSelectionTotal(q, model, selected).total).toBe(7500);
    expect(bookingCtaLabel(model, 2)).toBe("Solicitar reserva deste pacote");
  });

  it("detalhado soma apenas os itens selecionados", () => {
    const q = quote();
    const services = [svc("a", "required", 300), svc("b", "optional", 200), svc("c", "optional", 50)];
    const model = buildBookingSelectionModel(q, services);
    expect(bookingSelectionTotal(q, model, ["a", "b"]).total).toBe(500);
  });

  it("nunca inventa valores quando os individuais estão ocultos", () => {
    const q = quote({ show_detailed_prices: false, hide_service_amounts: true });
    const services = [svc("a", "required", 300)];
    const model = buildBookingSelectionModel(q, services);
    if (model.hideAmounts) expect(bookingSelectionTotal(q, model, ["a"]).total).toBeNull();
  });

  it("rótulo do botão muda conforme contexto", () => {
    const model = buildBookingSelectionModel(quote(), [svc("a", "required"), svc("b", "optional")]);
    expect(bookingCtaLabel(model, 1)).toBe("Solicitar este serviço");
    expect(bookingCtaLabel(model, 2)).toBe("Solicitar reserva dos serviços selecionados");
  });
});

describe("validação de contato", () => {
  const ok = { name: "Maria Souza", whatsapp: "", email: "", disclaimerAccepted: true };

  it("aceita nome + WhatsApp", () => {
    expect(validateBookingContact({ ...ok, whatsapp: "(11) 98888-7777" })).toBeNull();
  });
  it("aceita nome + e-mail", () => {
    expect(validateBookingContact({ ...ok, email: "maria@exemplo.com" })).toBeNull();
  });
  it("rejeita sem nenhum canal", () => {
    expect(validateBookingContact(ok)).toMatch(/WhatsApp ou e-mail/i);
  });
  it("exige nome", () => {
    expect(validateBookingContact({ ...ok, name: "M", email: "a@b.com" })).toMatch(/nome/i);
  });
  it("exige aceite do aviso", () => {
    expect(
      validateBookingContact({ ...ok, email: "a@b.com", disclaimerAccepted: false }),
    ).toMatch(/aceitar/i);
  });
});
