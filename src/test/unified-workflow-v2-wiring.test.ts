import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Testes estruturais do fluxo unificado V2: garantem que os pontos de
 * integração da interface permanecem conectados (o comportamento de dados é
 * autoridade da RPC confirm_travel_file_sale, coberta pelas regras do banco).
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf-8");

describe("Fluxo unificado V2 — fiação da interface", () => {
  it("Central de Reservas usa entitlement, painel de prontidão e diálogo de confirmação", () => {
    const page = read("src/pages/ProcessoReserva.tsx");
    expect(page).toContain("useUnifiedWorkflowV2");
    expect(page).toContain("assessTravelFileReadiness");
    expect(page).toContain("ConfirmSaleDialog");
    expect(page).toContain("ServiceFinancialRuleDialog");
    expect(page).toContain("Confirmar venda e iniciar operação");
    // Troca manual de etapa não oferece venda confirmada/operação no V2.
    expect(page).toContain('"sale_confirmed", "in_operation"');
  });

  it("diálogo de confirmação usa chave de idempotência estável por abertura", () => {
    const dialog = read("src/components/reservas/ConfirmSaleDialog.tsx");
    expect(dialog).toContain("confirm_travel_file_sale");
    expect(dialog).toContain("idempotencyKey");
    expect(dialog).toContain("crypto.randomUUID");
    expect(dialog).toContain("expectedUpdatedAt");
    // Canal do aceite é obrigatório.
    expect(dialog).toContain("Canal do aceite");
  });

  it("regra financeira do serviço grava snapshot via RPC dedicada", () => {
    const dialog = read("src/components/reservas/ServiceFinancialRuleDialog.tsx");
    expect(dialog).toContain("travel_file_service_set_financial_rule");
    expect(dialog).toContain("travel_file_supplier_terms");
    expect(dialog).toContain("Usar termos padrão da agência");
  });

  it("funil do CRM orienta a confirmar pela Central quando há file vinculado (V2)", () => {
    const kanban = read("src/components/crm/KanbanBoard.tsx");
    expect(kanban).toContain("useUnifiedWorkflowV2");
    expect(kanban).toContain("travel_files");
    expect(kanban).toContain("Central de Reservas");
  });

  it("cartão de operação separa recebimento do cliente e pagamento a fornecedores no V2", () => {
    const card = read("src/components/crm/operations/OperationCard.tsx");
    expect(card).toContain("travel_file_id");
    expect(card).toContain("customer_payment_status");
    expect(card).toContain("supplier_payment_status");
  });

  it("hook consulta o entitlement unified_workflow_v2 (default OFF)", () => {
    const hook = read("src/hooks/useUnifiedWorkflow.ts");
    expect(hook).toContain("current_agency_has_entitlement");
    expect(hook).toContain("unified_workflow_v2");
  });
});
