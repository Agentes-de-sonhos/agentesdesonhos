---
id: ft-tut-06
titulo: Registrar um pagamento integral
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - registrar um pagamento integral
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Registrar um pagamento integral

## O que você fará
A fatura recebe o pagamento e passa para o status **Paga**.

## Antes de começar
- A fatura precisa existir e ter saldo em aberto.
- Saber o valor, data e forma de pagamento.

## Passo a passo
1. Na lista, clique no ícone **Registrar pagamento** ($).
2. Preencha **Valor**, **Data** e **Forma de pagamento**.
3. Se houver parcelas, selecione a parcela correspondente.
4. Confirme; a fatura é atualizada e um recibo é gerado.
5. Acompanhe o recibo na subaba **Recibos**.

## Resultado esperado
O saldo zera e o status passa para **Paga**.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
