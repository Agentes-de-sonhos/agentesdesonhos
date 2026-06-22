---
id: ft-tut-10
titulo: Consultar faturas vencidas em Cobranças
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - consultar faturas vencidas em cobranças
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Consultar faturas vencidas em Cobranças

## O que você fará
A lista mostra apenas as faturas com saldo em aberto, com destaque para as vencidas.

## Antes de começar
- Ter faturas emitidas com saldo aberto.

## Passo a passo
1. Em **Financeiro → Faturas**, clique na subaba **Cobranças**.
2. Identifique as faturas com o selo **Vencida** (em vermelho).
3. Use a busca para localizar por cliente, número ou destino.
4. Registre os pagamentos recebidos ou entre em contato com o cliente.

## Resultado esperado
Você acompanha de forma centralizada o que ainda está em aberto e o que já passou do vencimento.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
