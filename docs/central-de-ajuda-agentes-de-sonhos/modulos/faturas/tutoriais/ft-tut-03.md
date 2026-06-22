---
id: ft-tut-03
titulo: Importar dados da Carteira Digital para a fatura
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - importar dados da carteira digital para a fatura
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Importar dados da Carteira Digital para a fatura

## O que você fará
Os serviços da carteira do cliente aparecem como itens da nova fatura.

## Antes de começar
- Ter uma carteira criada em **Carteira Digital**.
- Acesso ao módulo **Financeiro → Faturas**.

## Passo a passo
1. Em **Nova fatura**, use **Importar da carteira**.
2. Escolha a carteira (viagem) do cliente.
3. Confirme o destino, datas e serviços trazidos.
4. Adicione parcelas, se aplicável, e clique em **Salvar**.

## Resultado esperado
A fatura aparece em **Rascunho** com os serviços já vinculados.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
