---
id: ft-prob-03
titulo: O total da fatura não bate com o esperado
modulo: Faturas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - o total da fatura não bate com o esperado
palavras-chave:
  - problema
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# O total da fatura não bate com o esperado

## Sintoma
O total exibido difere do que você somou manualmente.

## Causas possíveis
- Algum serviço com **Desconto** ou **Taxas** preenchido incorretamente.
- Parcelas com soma diferente do total.
- Comissão ou RAV confundidos com valor de venda.

## Como verificar e resolver
1. Abra a fatura e revise cada serviço: **Tarifa**, **Taxas** e **Desconto** entram no total final; **Comissão** e **RAV** são apenas indicadores de lucro estimado.
2. Some manualmente as parcelas e compare com o total da fatura.
3. Corrija os valores e salve novamente.

## Resultado esperado
O total da fatura volta a corresponder à soma dos serviços e das parcelas.

## Quando procurar o suporte
Se a diferença continuar, abra um chamado em **Suporte** com o número da fatura e prints da tela.
