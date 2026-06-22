---
id: ft-bp-02
titulo: Diferencie fatura de nota fiscal e de entrada
modulo: Faturas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - diferencie fatura de nota fiscal e de entrada
palavras-chave:
  - boa prática
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Diferencie fatura de nota fiscal e de entrada

## Por que importa
A fatura é o documento de cobrança da agência; a nota fiscal é o documento fiscal emitido em outro sistema; a entrada é o registro do dinheiro no caixa. Confundir os três distorce o financeiro.

## Como aplicar no Agentes de Sonhos
- Use **Faturas** apenas para cobrar o cliente, não para emitir NF.
- Registre em **Entradas** o recebimento conforme o procedimento da sua agência.
- Mantenha as observações da fatura claras sobre o que está sendo cobrado.

## Erros que ajuda a evitar
- Duplicidade entre fatura e entrada.
- Cliente acreditar que a fatura é nota fiscal.
- Conflito entre relatórios financeiros e contábeis.
