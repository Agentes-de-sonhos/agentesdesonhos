/**
 * Testes de COMPORTAMENTO da vitrine de seleção do orçamento público.
 *
 * Cobrem: construção dos blocos, numeração reiniciada por conjunto, escolha
 * única exclusiva (opcional e obrigatória), mínimo/máximo, item avulso,
 * múltipla escolha no limite, validação, payload enviado ao backend,
 * compatibilidade com grupos antigos e migração do localStorage legado.
 */
import { describe, expect, it } from "vitest";
import {
  applyShowcaseSelection,
  blockRequiresChoice,
  blockStatus,
  blockValidation,
  buildBookingShowcase,
  buildSelectionSummary,
  cardAction,
  groupIsRequired,
  groupMax,
  groupMin,
  migrateLegacySelection,
  parseStoredSelection,
  resolveInitialSelection,
  selectionBlockedReason,
  selectionCount,
  serializeSelection,
  showcaseValidation,
} from "@/lib/quoteBookingShowcase";
import {
  buildBookingSelectionModel,
  effectiveSelectionIds,
} from "@/lib/quoteBookingSelection";

const svc = (id: string, extra: any = {}) =>
  ({
    id,
    service_type: "hotel",
    amount: 100,
    selection_mode: "optional",
    service_data: {},
    ...extra,
  }) as any;

const quote = (extra: any = {}) => ({ id: "q1", services: [], ...extra }) as any;

const group = (id: string, extra: any = {}) =>
  ({ id, title: id, group_type: "alternative", min_select: 1, max_select: 1, ...extra }) as any;

const build = (services: any[], groups: any[] = [], sections: any[] = []) => {
  const model = buildBookingSelectionModel(quote({ services, sections }), services, groups);
  return { model, showcase: buildBookingShowcase(model, sections, groups) };
};

describe("construção dos blocos", () => {
  it("separa incluídos, conjuntos e avulsos", () => {
    const services = [
      svc("req", { selection_mode: "required" }),
      svc("a", { selection_mode: "alternative", choice_group_id: "g" }),
      svc("b", { selection_mode: "alternative", choice_group_id: "g" }),
      svc("solo"),
    ];
    const { showcase } = build(services, [group("g")]);
    expect(showcase.blocks.map((b) => b.kind)).toEqual(["included", "choice", "single"]);
    expect(showcase.hasChoiceSets).toBe(true);
  });

  it("reinicia a numeração das opções em cada conjunto", () => {
    const services = [
      svc("a1", { choice_group_id: "g1" }),
      svc("a2", { choice_group_id: "g1" }),
      svc("b1", { choice_group_id: "g2" }),
      svc("b2", { choice_group_id: "g2" }),
    ];
    const { showcase } = build(services, [group("g1"), group("g2")]);
    const numbers = showcase.blocks.map((b) => b.options.map((o) => o.optionNumber));
    expect(numbers).toEqual([
      [1, 2],
      [1, 2],
    ]);
  });

  it("grupos antigos do tipo free viram bloco de escolha múltipla", () => {
    const services = [
      svc("a", { choice_group_id: "gf" }),
      svc("b", { choice_group_id: "gf" }),
    ];
    const { showcase } = build(services, [
      group("gf", { group_type: "free", min_select: 0, max_select: null }),
    ]);
    const block = showcase.blocks[0];
    expect(block.kind).toBe("choice");
    expect(cardAction(block)).toBe("toggle");
    expect(groupIsRequired(block.group!)).toBe(false);
  });
});

describe("obrigatoriedade vem de min_select", () => {
  it("escolha única obrigatória = min 1 / max 1", () => {
    const g = group("g", { min_select: 1, max_select: 1 });
    expect(groupMin(g)).toBe(1);
    expect(groupMax(g)).toBe(1);
    expect(groupIsRequired(g)).toBe(true);
  });

  it("escolha única opcional = min 0 / max 1", () => {
    const g = group("g", { min_select: 0, max_select: 1 });
    expect(groupMin(g)).toBe(0);
    expect(groupMax(g)).toBe(1);
    expect(groupIsRequired(g)).toBe(false);
  });
});

describe("escolha única", () => {
  const services = [
    svc("a", { choice_group_id: "g" }),
    svc("b", { choice_group_id: "g" }),
  ];

  it("é exclusiva: selecionar outra troca automaticamente", () => {
    const { showcase } = build(services, [group("g")]);
    const block = showcase.blocks[0];
    const first = applyShowcaseSelection(block, [], "a");
    expect(first).toEqual(["a"]);
    expect(applyShowcaseSelection(block, first, "b")).toEqual(["b"]);
  });

  it("obrigatória: clicar na já selecionada NÃO esvazia o conjunto", () => {
    const { showcase } = build(services, [group("g", { min_select: 1 })]);
    const block = showcase.blocks[0];
    expect(blockRequiresChoice(block)).toBe(true);
    expect(selectionBlockedReason(block, ["a"], "a")).toMatch(/exige 1 opção/);
    expect(applyShowcaseSelection(block, ["a"], "a")).toEqual(["a"]);
  });

  it("opcional: clicar na já selecionada remove", () => {
    const { showcase } = build(services, [group("g", { min_select: 0 })]);
    const block = showcase.blocks[0];
    expect(blockRequiresChoice(block)).toBe(false);
    expect(selectionBlockedReason(block, ["a"], "a")).toBeNull();
    expect(applyShowcaseSelection(block, ["a"], "a")).toEqual([]);
  });

  it("valida somente abaixo do mínimo", () => {
    const req = build(services, [group("g", { min_select: 1 })]).showcase.blocks[0];
    const opt = build(services, [group("g", { min_select: 0 })]).showcase.blocks[0];
    expect(blockValidation(req, [])).toMatch(/Escolha 1 opção/);
    expect(blockValidation(req, ["a"])).toBeNull();
    expect(blockValidation(opt, [])).toBeNull();
    expect(blockValidation(opt, ["a"])).toBeNull();
    expect(blockStatus(opt, []).tone).toBe("neutral");
    expect(blockStatus(req, []).tone).toBe("pending");
  });
});

describe("múltipla escolha", () => {
  const services = [
    svc("a", { choice_group_id: "g" }),
    svc("b", { choice_group_id: "g" }),
    svc("c", { choice_group_id: "g" }),
  ];
  const free = (extra: any) => group("g", { group_type: "free", ...extra });

  it("respeita mínimo e máximo", () => {
    const block = build(services, [free({ min_select: 2, max_select: 3 })]).showcase.blocks[0];
    expect(blockValidation(block, ["a"])).toMatch(/pelo menos 2/);
    expect(blockValidation(block, ["a", "b"])).toBeNull();
  });

  it("no limite: mantém a seleção e informa, sem remover o mais antigo", () => {
    const block = build(services, [free({ min_select: 0, max_select: 2 })]).showcase.blocks[0];
    const at = ["a", "b"];
    expect(selectionBlockedReason(block, at, "c")).toMatch(/Remova uma opção/);
    expect(applyShowcaseSelection(block, at, "c")).toEqual(["a", "b"]);
    // remover consciente libera a escolha
    const afterRemove = applyShowcaseSelection(block, at, "a");
    expect(afterRemove).toEqual(["b"]);
    expect(applyShowcaseSelection(block, afterRemove, "c")).toEqual(["b", "c"]);
  });
});

describe("item avulso e incluídos", () => {
  it("avulso alterna livremente e incluído não muda a seleção", () => {
    const services = [svc("solo"), svc("req", { selection_mode: "required" })];
    const { showcase, model } = build(services);
    const solo = showcase.blocks.find((b) => b.kind === "single")!;
    const included = showcase.blocks.find((b) => b.kind === "included")!;
    expect(applyShowcaseSelection(solo, [], "solo")).toEqual(["solo"]);
    expect(applyShowcaseSelection(solo, ["solo"], "solo")).toEqual([]);
    expect(cardAction(included)).toBe("locked");
    expect(applyShowcaseSelection(included, [], "req")).toEqual([]);
    expect(selectionCount(model, [])).toBe(1);
  });
});

describe("validação e payload", () => {
  const services = [
    svc("req", { selection_mode: "required" }),
    svc("a", { choice_group_id: "g" }),
    svc("b", { choice_group_id: "g" }),
    svc("solo"),
  ];

  it("bloqueia envio enquanto o conjunto obrigatório está vazio", () => {
    const { showcase, model } = build(services, [group("g", { min_select: 1 })]);
    expect(showcaseValidation(showcase, model, [])).toMatch(/Escolha 1 opção/);
    expect(showcaseValidation(showcase, model, ["a"])).toBeNull();
  });

  it("permite envio sem escolher nada em conjunto opcional", () => {
    const { showcase, model } = build(services, [group("g", { min_select: 0 })]);
    expect(showcaseValidation(showcase, model, ["solo"])).toBeNull();
  });

  it("payload contém exatamente os escolhidos mais os incluídos", () => {
    const { model } = build(services, [group("g")]);
    expect(effectiveSelectionIds(model, ["a"]).sort()).toEqual(["a", "req"]);
    expect(effectiveSelectionIds(model, ["b", "solo"]).sort()).toEqual(["b", "req", "solo"]);
  });

  it("resumo Minha Seleção lista apenas escolhidos e travados", () => {
    const { showcase } = build(services, [group("g")]);
    const summary = buildSelectionSummary(showcase, ["a"]);
    const ids = summary.flatMap((s) => s.entries.map((e) => e.service.id));
    expect(ids.sort()).toEqual(["a", "req"]);
    expect(summary.flatMap((s) => s.entries).find((e) => e.service.id === "req")!.locked).toBe(true);
  });
});

describe("persistência e migração do localStorage", () => {
  const services = [svc("a"), svc("b")];

  it("lê e escreve o formato novo", () => {
    expect(parseStoredSelection(serializeSelection(["a"]))).toEqual(["a"]);
    expect(parseStoredSelection("nao-json")).toEqual([]);
  });

  it("migra decisões 'yes' do wizard sequencial antigo", () => {
    const legacy = JSON.stringify({ v: 1, decisions: { a: "yes", b: "no" } });
    expect(migrateLegacySelection(legacy)).toEqual(["a"]);
    const { model } = build(services);
    const resolved = resolveInitialSelection(model, null, legacy);
    expect(resolved.selected).toEqual(["a"]);
    expect(resolved.migrated).toBe(true);
  });

  it("formato novo tem prioridade sobre o legado", () => {
    const { model } = build(services);
    const resolved = resolveInitialSelection(
      model,
      serializeSelection(["b"]),
      JSON.stringify({ v: 1, decisions: { a: "yes" } }),
    );
    expect(resolved.selected).toEqual(["b"]);
    expect(resolved.migrated).toBe(false);
  });
});

describe("conjunto de escolha distribuído em duas seções", () => {
  const sections = [
    { id: "s1", title: "Seção 1", sort_order: 0 },
    { id: "s2", title: "Seção 2", sort_order: 1 },
  ] as any[];
  const services = [
    svc("a", { selection_mode: "alternative", choice_group_id: "g", section_id: "s1", sort_order: 0 }),
    svc("outro", { section_id: "s1", sort_order: 1 }),
    svc("b", { selection_mode: "alternative", choice_group_id: "g", section_id: "s2", sort_order: 2 }),
  ];
  const groups = [group("g", { min_select: 1, max_select: 1 })];

  it("gera um único bloco global com opções 1..N e contexto da primeira seção", () => {
    const { showcase } = build(services, groups, sections);
    const choice = showcase.blocks.filter((b) => b.kind === "choice");
    expect(choice).toHaveLength(1);
    expect(choice[0].sectionId).toBe("s1");
    expect(choice[0].options.map((o) => o.service.id)).toEqual(["a", "b"]);
    expect(choice[0].options.map((o) => o.optionNumber)).toEqual([1, 2]);
    // nenhum bloco duplicado na segunda seção
    expect(showcase.blocks.filter((b) => b.group?.id === "g")).toHaveLength(1);
    // chaves únicas
    const keys = showcase.blocks.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("troca exclusiva global entre seções e validação min/max global", () => {
    const { model, showcase } = build(services, groups, sections);
    const block = showcase.blocks.find((b) => b.kind === "choice")!;
    const first = applyShowcaseSelection(block, [], "a");
    expect(first).toEqual(["a"]);
    const swapped = applyShowcaseSelection(block, first, "b");
    expect(swapped).toEqual(["b"]);
    expect(blockValidation(block, [])).toBeTruthy();
    expect(blockValidation(block, ["b"])).toBeNull();
    expect(showcaseValidation(showcase, model, [])).toBeTruthy();
    expect(showcaseValidation(showcase, model, ["b"])).toBeNull();
    expect(effectiveSelectionIds(model, ["b"])).toContain("b");
  });
});
