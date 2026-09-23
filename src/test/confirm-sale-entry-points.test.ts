import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const kanban = read("src/components/crm/KanbanBoard.tsx");
const processo = read("src/pages/ProcessoReserva.tsx");
const dialog = read("src/components/reservas/ConfirmSaleDialog.tsx");
const launcher = read("src/components/reservas/ConfirmSaleLauncher.tsx");

describe("funil: arrastar para Fechado abre a confirmação oficial", () => {
  it("processo ativo único abre o diálogo em vez de gravar a etapa", () => {
    const branch = kanban.slice(
      kanban.indexOf('if (resolution.kind === "single")'),
      kanban.indexOf("try {\n      await reorderOpportunities"),
    );
    expect(branch).toContain("setConfirmSaleTarget");
    expect(branch).not.toContain("reorderOpportunities");
    expect(branch.trimEnd().endsWith("}")).toBe(true);
    expect(branch).toContain("return;");
  });

  it("cancelar apenas fecha o diálogo — nenhuma escrita de etapa", () => {
    const mount = kanban.slice(kanban.indexOf("<ConfirmSaleLauncher"));
    expect(mount).toContain("if (!nextOpen) setConfirmSaleTarget(null);");
    expect(mount).not.toContain("updateStage");
    expect(mount).not.toContain("reorderOpportunities");
  });

  it("o fechamento e a comemoração acontecem só após o sucesso da confirmação", () => {
    const mount = kanban.slice(kanban.indexOf("<ConfirmSaleLauncher"));
    expect(mount).toMatch(/onConfirmed=\{\(\) => \{[\s\S]*fireCelebrationConfetti\(\)/);
  });

  it("guard do servidor também abre o diálogo, sem ciclo sem saída", () => {
    expect(kanban).toContain("openConfirmSaleForOpportunity");
    expect(kanban).toMatch(/code === "USE_CONFIRM_SALE"[\s\S]*openConfirmSaleForOpportunity/);
  });

  it("o funil usa a prontidão compartilhada sem blocker financeiro", () => {
    expect(launcher).toContain("assessTravelFileReadiness");
    expect(launcher).toContain("ConfirmSaleDialog");
    expect(dialog).not.toMatch(/sem regra financeira confirmada|fornecedor\/comissão|Regra financeira pendente/i);
  });

  it("um único aviso por erro: o menu de mover não repete o toast", () => {
    const handler = kanban.slice(
      kanban.indexOf("const handleMoveToStage"),
      kanban.indexOf("const handleColumnDrop"),
    );
    expect(handler).not.toContain("Não foi possível mover o card");
    expect(handler).not.toContain("toast.error");
  });

  it("mais de um processo ativo continua bloqueado com explicação", () => {
    expect(kanban).toContain('resolution.kind === "multiple"');
    expect(kanban).toContain("mantenha apenas um ativo");
  });
});

describe("Central de Reservas: mesma ação canônica", () => {
  it("botão oficial fica visível e clicável quando o fluxo unificado está ativo", () => {
    const section = processo.slice(processo.indexOf("Confirmação da venda (fluxo unificado)"));
    expect(section).toContain("Confirmar venda e iniciar operação");
    expect(section).not.toContain("disabled={!readiness.ready}");
  });

  it("avanço sequencial e troca de etapa abrem o diálogo, sem update direto", () => {
    const fn = processo.slice(
      processo.indexOf("const updateFileStatus"),
      processo.indexOf("const updateResponsibles"),
    );
    expect(fn).toMatch(
      /\["sale_confirmed", "in_operation"\]\.includes\(status\) && unifiedV2\) \{\s*\n\s*setConfirmSaleOpen\(true\);\s*\n\s*return;/,
    );
    expect(fn).not.toContain('A venda é confirmada no botão');
  });

  it("dropdown mantém a etapa de venda visível no fluxo unificado (abrindo o diálogo)", () => {
    expect(processo).toMatch(/legacyFlowAllowed \|\|\s*\n\s*unifiedV2 \|\|/);
  });

  it("fluxo legado (entitlement desligado) segue gravando a etapa como antes", () => {
    const fn = processo.slice(
      processo.indexOf("const updateFileStatus"),
      processo.indexOf("const updateResponsibles"),
    );
    expect(fn).toContain("await setStatus.mutateAsync({ status, reason: reason ?? null })");
  });

  it("erros do processo aparecem em linguagem humana", () => {
    expect(processo).toContain("humanizeWorkflowError(error)");
    expect(processo).not.toContain('toast.error(error?.message || "Não foi possível salvar a alteração.")');
  });
});

describe("orquestrador único e diálogo", () => {
  it("as duas entradas usam o mesmo componente/RPC", () => {
    expect(kanban).toContain('from "@/components/reservas/ConfirmSaleLauncher"');
    expect(launcher).toContain("ConfirmSaleDialog");
    expect(launcher).toContain("assessTravelFileReadiness");
    expect(processo).toContain('from "@/components/reservas/ConfirmSaleDialog"');
    expect(dialog).toContain("useConfirmTravelFileSale");
  });

  it("chave de idempotência estável por tentativa e replay seguro", () => {
    expect(dialog).toContain("idempotencyKeyRef.current = crypto.randomUUID()");
    expect(dialog).toContain("idempotencyKey: idempotencyKeyRef.current");
    expect(dialog).toContain("if (confirmSale.isPending) return;");
    expect(dialog).toContain("data.replayed");
  });

  it("lista o que falta e oferece caminho para corrigir", () => {
    expect(dialog).toContain("Falta isto para confirmar a venda:");
    expect(dialog).toContain("Abrir o processo para ajustar");
  });

  it("no celular o diálogo rola e o botão fica acessível acima da safe area", () => {
    expect(dialog).toContain("max-h-[88svh]");
    expect(dialog).toContain("overflow-y-auto");
    expect(dialog).toContain("env(safe-area-inset-bottom)");
    expect(dialog).toContain("min-h-11");
  });

  it("nenhum código técnico é renderizado no diálogo", () => {
    expect(dialog).not.toMatch(/USE_CONFIRM_SALE|SERVICES_PENDING/);
    expect(dialog).toContain("humanizeWorkflowError");
  });
});
