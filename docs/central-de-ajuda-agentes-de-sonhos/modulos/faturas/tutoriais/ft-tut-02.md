---
id: ft-tut-02
titulo: Importar dados de um orçamento para a fatura
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - importar dados de um orçamento para a fatura
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Importar dados de um orçamento para a fatura

## O que você fará
Cliente, destino e serviços do orçamento aparecem preenchidos no formulário da fatura.

## Antes de começar
- Ter o orçamento criado em **Orçamentos**.
- Acesso ao módulo **Financeiro → Faturas**.

## Passo a passo
1. Em **Financeiro → Faturas**, clique em **Nova fatura**.
2. No topo do formulário, use **Importar do orçamento**.
3. Selecione o orçamento desejado na lista.
4. Revise cliente, destino e serviços importados; ajuste o que for necessário.
5. Clique em **Salvar**.

## Resultado esperado
A fatura nasce já vinculada aos dados do orçamento original, sem precisar redigitar.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
