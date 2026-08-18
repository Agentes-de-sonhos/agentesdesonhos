import { describe, expect, it } from "vitest";
import {
  applyBookingDecision,
  bookingWizardProgress,
  buildBookingWizardSteps,
  decidedSelectionIds,
  firstPendingStepIndex,
  parseStoredWizardState,
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