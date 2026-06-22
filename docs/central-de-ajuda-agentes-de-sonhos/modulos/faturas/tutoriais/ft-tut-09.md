---
id: ft-tut-09
titulo: Baixar o PDF da fatura
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - baixar o pdf da fatura
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Baixar o PDF da fatura

## O que você fará
O arquivo PDF é gerado com os dados completos da fatura.

## Antes de começar
- A fatura precisa estar criada.

## Passo a passo
1. Na lista, clique no ícone **PDF** (download).
2. Aguarde a geração e o download automático do arquivo.
3. Abra o PDF para conferir cliente, serviços, parcelas e dados da agência.

## Resultado esperado
O PDF é salvo no seu dispositivo e pode ser anexado em e-mail ou impresso.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
