---
id: ft-bp-04
titulo: Evite excluir faturas com pagamento já registrado
modulo: Faturas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - evite excluir faturas com pagamento já registrado
palavras-chave:
  - boa prática
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Evite excluir faturas com pagamento já registrado

## Por que importa
Excluir uma fatura paga apaga o recibo e o histórico de recebimento, o que pode prejudicar conferências contábeis e a relação com o cliente.

## Como aplicar no Agentes de Sonhos
- Antes de excluir, verifique se há pagamentos na subaba **Recibos**.
- Prefira **Cancelar** ou ajustar a fatura quando o histórico precisa ser preservado.
- Combine na equipe quem está autorizado a excluir faturas financeiras.

## Erros que ajuda a evitar
- Perda do histórico de recibos.
- Discrepâncias entre o que foi cobrado e o que foi recebido.
- Risco de reclamação do cliente.
