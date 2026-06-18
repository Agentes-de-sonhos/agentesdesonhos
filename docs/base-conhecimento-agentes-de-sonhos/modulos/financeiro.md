# Módulo: Financeiro

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/financeiro` com abas Vendas, Entradas, Despesas, Faturas, Comissões, Vendedores, Dashboard.
- **Estado:** CONFIRMADO.

## Funcionalidades
- **Vendas** (`sales`/`sale_products`) com wizard de nova venda.
- **Entradas** (`income_entries`, `customer_payments`, `monthly_payments`).
- **Despesas** (`expense_entries`, `supplier_payments`) com recorrência (`utils/expenseRecurrence.ts`).
- **Faturas** (`invoices`, `invoice_services`, `invoice_installments`, `invoice_payments`).
- **Comissões a receber** (`booking_commissions`, `useCommissionsReceivable`).
- **Vendedores** (`sellers`) com relatório de comissão.
- **Smart Dashboard**: 5 blocos de inteligência financeira, projeção do mês, normalização de status.
- **Fluxo de caixa** (`CashFlowManager`).
- **Exportações** XLSX e PDF respeitando filtros.
- **Metas financeiras** (`financial_goals`).

## Regras
- Lucro líquido = comissões da agência − (despesas + comissões de vendedores).
- Atualizar venda com vendedor gera despesa de comissão automaticamente.
- Datas de recebimento calculadas por trigger conforme termos.
- Exclusões em cascata: PENDENTE listar regras exatas.

## Evidências
`src/pages/Financeiro.tsx`, `src/components/financial/*`, `src/types/financial.ts`, `src/utils/financialExport.ts`, `src/lib/generateInvoicePdf.ts`, `src/lib/generateReceiptPdf.ts`.