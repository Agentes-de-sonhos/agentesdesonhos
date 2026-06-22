---
id: ft-prob-05
titulo: Não consigo excluir uma fatura
modulo: Faturas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - não consigo excluir uma fatura
palavras-chave:
  - problema
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Não consigo excluir uma fatura

## Sintoma
O ícone da lixeira não aparece, ou a exclusão não conclui.

## Causas possíveis
- Perfil sem permissão para excluir registros financeiros.
- Confirmação cancelada por engano.
- Fatura tem pagamentos vinculados e a equipe definiu não excluir.

## Como verificar e resolver
1. Confira suas permissões com o titular em **Equipe e Permissões**.
2. Tente novamente e confirme na caixa de diálogo **Excluir fatura?**.
3. Avalie se cancelar a fatura não é mais adequado, preservando o histórico.

## Resultado esperado
A fatura é removida da lista ou substituída por uma versão **Cancelada**, preservando o histórico contábil quando necessário.

## Quando procurar o suporte
Em caso de dúvida sobre exclusão de fatura paga, abra um chamado em **Suporte** antes de prosseguir.
