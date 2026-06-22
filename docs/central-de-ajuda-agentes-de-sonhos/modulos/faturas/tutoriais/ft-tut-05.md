---
id: ft-tut-05
titulo: Enviar a fatura para o cliente
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - enviar a fatura para o cliente
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Enviar a fatura para o cliente

## O que você fará
A fatura sai do status **Rascunho** e passa para **Enviada**, liberando o link público.

## Antes de começar
- A fatura precisa estar criada e em **Rascunho**.

## Passo a passo
1. Localize a fatura na lista.
2. Clique no ícone **Enviar** ao lado dela.
3. Confirme; o status muda para **Enviada**.
4. Use o ícone **Link público** para copiar o endereço.
5. Envie o link ao cliente pelo canal de sua preferência.

## Resultado esperado
O cliente passa a conseguir visualizar a fatura pelo link público.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
