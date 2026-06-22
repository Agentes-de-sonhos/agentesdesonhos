---
id: ft-tut-04
titulo: Adicionar e organizar parcelas
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - adicionar e organizar parcelas
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Adicionar e organizar parcelas

## O que você fará
A fatura passa a ter parcelas individuais com rótulo, valor e vencimento.

## Antes de começar
- Estar editando ou criando uma fatura.
- Saber o valor total e como dividir.

## Passo a passo
1. No formulário da fatura, role até **Parcelas**.
2. Clique em **Adicionar parcela**.
3. Informe o **Rótulo** (ex.: Entrada, 2ª parcela), o **Valor** e a **Data de vencimento**.
4. Repita para cada parcela; o sistema mantém a ordem inserida.
5. Salve a fatura para gravar as parcelas.

## Resultado esperado
As parcelas aparecem para o cliente no link público e podem ser usadas no momento de registrar pagamentos.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
