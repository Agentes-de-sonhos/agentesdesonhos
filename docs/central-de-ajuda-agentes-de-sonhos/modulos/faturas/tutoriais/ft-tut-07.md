---
id: ft-tut-07
titulo: Registrar um pagamento parcial
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - registrar um pagamento parcial
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Registrar um pagamento parcial

## O que você fará
A fatura recebe parte do valor e fica com status **Parcialmente paga**.

## Antes de começar
- A fatura precisa ter saldo em aberto.

## Passo a passo
1. Abra **Registrar pagamento** ($).
2. Informe um **Valor** menor que o saldo total.
3. Preencha **Data** e **Forma de pagamento**.
4. Confirme.
5. Repita o processo a cada novo recebimento até quitar o saldo.

## Resultado esperado
A fatura mostra **Saldo restante** atualizado, e o status fica **Parcialmente paga** até zerar.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
