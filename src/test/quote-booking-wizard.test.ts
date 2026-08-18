import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyBookingDecision,
  bookingWizardProgress,
  buildBookingWizardSteps,
  decidedSelectionIds,
  firstPendingStepIndex,
  parseStoredWizardState,
  bookingWizardCountsLabel,
  bookingWizardDecisionCounts,
  clampStepIndex,
  isLastStepIndex,
  nextStepIndex,
  previousStepIndex,
  pruneBookingDecisions,
  stepProgressLabel,
} from "@/lib/quoteBookingWizard";
import { buildBookingSelectionModel } from "@/lib/quoteBookingSelection";

const svc = (id: string, extra: any = {}) =>
  ({ id, service_type: "hotel", amount: 100, selection_mode: "optional", service_data: {}, ...extra }) as any;

const quote = (extra: any = {}) => ({ id: "q1", services: [], ...extra }) as any;

describe("buildBookingWizardSteps", () => {
  it("ignora serviços incluídos (required) e mantém a ordem do orçamento", () => {
    const services = [svc("a"), svc("b", { selection_mode: "required" }), svc("c")];
    const model = buildBookingSelectionModel(quote({ services }), services, []);
    const steps = buildBookingWizardSteps(model, [], []);
    expect(steps.map((s) => s.serviceId)).toEqual(["a", "c"]);
    expect(steps.map((s) => s.position)).toEqual([1, 2]);
  });

  it("não gera passos em orçamento com valor fechado de pacote", () => {
    const services = [svc("a"), svc("b")];
    const model = buildBookingSelectionModel(
      quote({ services, pricing_mode: "package_total", package_total: 1000 }),
      services,
      [],
    );
    if (model.packageMode) {
      expect(buildBookingWizardSteps(model, [], [])).toHaveLength(0);
    }
  });

  it("mantém serviços do mesmo bloco de escolha contíguos e rotulados", () => {
    const services = [
      svc("g1", { choice_group_id: "grp" }),
      svc("solo"),
      svc("g2", { choice_group_id: "grp" }),
    ];
    const groups = [{ id: "grp", title: "Hotel", group_type: "alternative" }] as any[];
    const model = buildBookingSelectionModel(quote({ services }), services, groups);
    const steps = buildBookingWizardSteps(model, [], groups);
    expect(steps.map((s) => s.serviceId)).toEqual(["g1", "g2", "solo"]);
    expect(steps[0].blockTitle).toBe("Hotel");
    expect(steps[0].groupType).toBe("alternative");
  });
});

describe("applyBookingDecision", () => {
  const services = [
    svc("g1", { choice_group_id: "grp" }),
    svc("g2", { choice_group_id: "grp" }),
    svc("x"),
  ];
  const groups = [{ id: "grp", title: "Hotel", group_type: "alternative" }] as any[];
  const model = buildBookingSelectionModel(quote({ services }), services, groups);
  const steps = buildBookingWizardSteps(model, [], groups);

  it("recusa os concorrentes ao aceitar uma opção de escolha única", () => {
    const next = applyBookingDecision(steps, {}, "g1", "yes");
    expect(next.g1).toBe("yes");
    expect(next.g2).toBe("no");
  });

  it("não mexe nos concorrentes ao recusar", () => {
    const next = applyBookingDecision(steps, { g2: "yes" }, "g1", "no");
    expect(next.g2).toBe("yes");
  });

  it("ignora serviço fora do fluxo", () => {
    expect(applyBookingDecision(steps, {}, "inexistente", "yes")).toEqual({});
  });

  it("gera apenas os IDs aceitos", () => {
    expect(decidedSelectionIds({ a: "yes", b: "no", c: "yes" }).sort()).toEqual(["a", "c"]);
  });
});

describe("navegação e progresso", () => {
  const services = [svc("a"), svc("b"), svc("c")];
  const model = buildBookingSelectionModel(quote({ services }), services, []);
  const steps = buildBookingWizardSteps(model, [], []);

  it("aponta o próximo serviço pendente e dá a volta quando necessário", () => {
    expect(firstPendingStepIndex(steps, {})).toBe(0);
    expect(firstPendingStepIndex(steps, { a: "yes" }, 1)).toBe(1);
    expect(firstPendingStepIndex(steps, { b: "no", c: "yes" }, 1)).toBe(0);
    expect(firstPendingStepIndex(steps, { a: "yes", b: "no", c: "yes" })).toBe(-1);
  });

  it("calcula progresso e conclusão", () => {
    expect(bookingWizardProgress(steps, { a: "yes" })).toEqual({ decided: 1, total: 3, complete: false });
    expect(bookingWizardProgress(steps, { a: "yes", b: "no", c: "no" }).complete).toBe(true);
  });

  it("formata o rótulo do passo", () => {
    expect(stepProgressLabel(steps[1], 3)).toBe("Serviço 2 de 3");
    expect(stepProgressLabel(undefined, 3)).toBe("");
  });

  it("descarta decisões de serviços removidos e valores inválidos", () => {
    expect(pruneBookingDecisions(steps, { a: "yes", zz: "yes", b: "talvez" } as any)).toEqual({ a: "yes" });
  });
});

describe("parseStoredWizardState", () => {
  it("tolera dados ausentes ou corrompidos", () => {
    expect(parseStoredWizardState(null)).toEqual({ decisions: {}, reviewed: false });
    expect(parseStoredWizardState("{oops")).toEqual({ decisions: {}, reviewed: false });
  });

  it("recupera decisões válidas", () => {
    const state = parseStoredWizardState(JSON.stringify({ decisions: { a: "yes", b: "x" }, reviewed: true }));
    expect(state).toEqual({ decisions: { a: "yes" }, reviewed: true });
  });
});
/* --------------------------------------------------------------------------
 * Navegação livre: steps é fonte imutável (revisão de usabilidade).
 * ----------------------------------------------------------------------- */
describe("navegação livre e contagens", () => {
  const many = Array.from({ length: 13 }, (_, i) => svc(`s${i + 1}`));
  const model13 = buildBookingSelectionModel(quote({ services: many }), many, []);
  const steps13 = buildBookingWizardSteps(model13, [], []);

  it("mantém 13 passos após decisões yes/no", () => {
    let decisions: any = {};
    steps13.forEach((s, i) => {
      decisions = applyBookingDecision(steps13, decisions, s.serviceId, i % 2 ? "no" : "yes");
    });
    expect(steps13).toHaveLength(13);
    expect(buildBookingWizardSteps(model13, [], [])).toHaveLength(13);
    expect(pruneBookingDecisions(steps13, decisions)).toEqual(decisions);
  });

  it("next/previous alcançam todos os índices independentemente do status", () => {
    const decisions: any = { s1: "no", s2: "yes" };
    let i = 0;
    const visited = [i];
    while (!isLastStepIndex(steps13, i)) {
      i = nextStepIndex(steps13, i);
      visited.push(i);
    }
    expect(visited).toEqual([...Array(13).keys()]);
    expect(previousStepIndex(steps13, 0)).toBe(0);
    expect(previousStepIndex(steps13, 6)).toBe(5);
    expect(nextStepIndex(steps13, 12)).toBe(12);
    expect(clampStepIndex(steps13, 99)).toBe(12);
    expect(clampStepIndex(steps13, -5)).toBe(0);
    expect(decisions.s1).toBe("no");
  });

  it("conta selecionados, recusados e pendentes", () => {
    const counts = bookingWizardDecisionCounts(steps13, { s1: "yes", s2: "yes", s3: "no" } as any);
    expect(counts).toEqual({ selected: 2, rejected: 1, pending: 10, decided: 3, total: 13 });
    expect(bookingWizardCountsLabel(counts)).toBe("2 selecionados, 1 recusado e 10 pendentes");
    expect(
      bookingWizardCountsLabel(bookingWizardDecisionCounts(steps13.slice(0, 3), { s1: "yes", s2: "no" } as any)),
    ).toBe("1 selecionado, 1 recusado e 1 pendente");
  });

  it("posições seguem a ordem original (clicar no item 7 = índice 6)", () => {
    expect(steps13[6].position).toBe(7);
    expect(steps13.map((s) => s.serviceId)).toEqual(many.map((s) => s.id));
  });
});

describe("regressão de UI do pop-up", () => {
  const dialog = readFileSync("src/components/quote/QuoteBookingWizardDialog.tsx", "utf8");

  it("mantém Próximo serviço separado de Ver resumo e Ver todos", () => {
    expect(dialog).toContain("Próximo serviço");
    expect(dialog).toContain("Ir para o resumo");
    expect(dialog).toContain("Ver resumo");
    expect(dialog).toContain("Ver todos os serviços");
    expect(dialog).toContain("Serviço anterior");
  });

  it("usa aria-pressed nas decisões e aria-current no modo todos", () => {
    expect(dialog).toContain('aria-pressed={decided === "yes"}');
    expect(dialog).toContain('aria-pressed={decided === "no"}');
    expect(dialog).toContain('aria-current={current ? "true" : undefined}');
  });

  it("edição não força resumo nem fecha o pop-up", () => {
    expect(dialog).toContain("editingSession.current && !wasPending");
    expect(dialog).toContain("if (!editingSession.current) showMode(\"review\")");
  });

  it("review oferece voltar ao serviço e ver todos", () => {
    expect(dialog).toContain("Voltar ao serviço {index + 1}");
  });

  it("sem overflow horizontal", () => {
    expect(dialog).toContain("overflow-x-hidden");
    expect(dialog).toContain("[overflow-wrap:anywhere]");
  });

  it("status do modo todos não depende só de cor", () => {
    expect(dialog).toContain("Selecionado para reserva");
    expect(dialog).toContain("Ainda não avaliado");
  });
});
