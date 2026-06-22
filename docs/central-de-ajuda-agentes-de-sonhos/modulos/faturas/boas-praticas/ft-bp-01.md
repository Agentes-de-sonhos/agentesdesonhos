---
id: ft-bp-01
titulo: Confira cliente, serviços e parcelas antes de enviar
modulo: Faturas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - confira cliente, serviços e parcelas antes de enviar
palavras-chave:
  - boa prática
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Confira cliente, serviços e parcelas antes de enviar

## Por que importa
Uma fatura enviada com erro de valor, parcela ou nome do cliente gera retrabalho e desconfiança. Revisar antes de clicar em **Enviar** evita reemissão e ruído na cobrança.

## Como aplicar no Agentes de Sonhos
- Releia o **Nome do cliente** e o **Documento** no topo do formulário.
- Confira cada **Serviço** com **Tarifa**, **Taxas** e **Desconto**.
- Some mentalmente as **Parcelas** e compare com o **Total** da fatura.
- Sempre teste o **Link público** em uma janela anônima antes de enviar.

## Erros que ajuda a evitar
- Reemissão repetida.
- Cobranças com valor errado.
- Desgaste com o cliente.
