---
id: ft-tut-08
titulo: Compartilhar o link público da fatura
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - compartilhar o link público da fatura
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Compartilhar o link público da fatura

## O que você fará
O cliente recebe um endereço onde pode visualizar a cobrança.

## Antes de começar
- A fatura precisa ter sido enviada (status diferente de **Rascunho**).

## Passo a passo
1. Na lista, clique no ícone **Link público** (corrente).
2. Verifique a confirmação **Link copiado**.
3. Cole o link no canal de envio (WhatsApp, e-mail, etc.).
4. Confirme com o cliente o recebimento.

## Resultado esperado
O cliente abre o link e visualiza a fatura sem precisar de cadastro.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
