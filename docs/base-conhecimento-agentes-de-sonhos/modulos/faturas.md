# Módulo: Faturas

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota interna:** `/financeiro` (aba Faturas). **Pública:** `/fatura/:agencySlug/:code`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Emissão de fatura com serviços e parcelas (`invoice_services`, `invoice_installments`).
- Registro de pagamentos por parcela (`invoice_payments`).
- PDF da fatura (`generateInvoicePdf`) e recibo (`generateReceiptPdf`).
- Link público para o cliente.
- PIX BR Code (`src/lib/pixBrCode.ts`).

## Regras
- Numeração e datas controladas pela agência.
- Página pública exige slug da agência + código para evitar enumeration.

## Evidências
`src/components/financial/invoices/*`, `src/pages/FaturaPublica.tsx`, `src/types/invoice.ts`, tabelas `invoices`, `invoice_*`.