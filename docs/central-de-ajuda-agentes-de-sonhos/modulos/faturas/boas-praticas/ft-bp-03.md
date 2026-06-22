---
id: ft-bp-03
titulo: Acompanhe a aba Cobranças semanalmente
modulo: Faturas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - acompanhe a aba cobranças semanalmente
palavras-chave:
  - boa prática
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Acompanhe a aba Cobranças semanalmente

## Por que importa
A subaba **Cobranças** concentra o que está em aberto, com destaque para faturas vencidas. Olhar uma vez por semana reduz a inadimplência e organiza o follow-up.

## Como aplicar no Agentes de Sonhos
- Reserve um dia fixo da semana para abrir **Financeiro → Faturas → Cobranças**.
- Comece pelas faturas com selo **Vencida**.
- Use a busca por cliente para priorizar contatos.

## Erros que ajuda a evitar
- Perda de prazo de cobrança.
- Esquecimento de cliente em atraso.
- Surpresas no fechamento mensal.
