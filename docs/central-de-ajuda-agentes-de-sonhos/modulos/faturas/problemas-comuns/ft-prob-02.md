---
id: ft-prob-02
titulo: O link público não abre para o cliente
modulo: Faturas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - o link público não abre para o cliente
palavras-chave:
  - problema
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# O link público não abre para o cliente

## Sintoma
O cliente diz que o link não carrega ou retorna erro.

## Causas possíveis
- Fatura ainda em **Rascunho**.
- Código de acesso foi alterado.
- Link foi colado de forma incompleta.

## Como verificar e resolver
1. Confirme que o status é **Enviada** (ou mais avançado), nunca **Rascunho**.
2. Copie o link novamente pelo ícone **Link público** e teste em uma janela anônima.
3. Reenvie ao cliente o endereço completo.

## Resultado esperado
O cliente abre a fatura pelo link público sem precisar de cadastro.

## Quando procurar o suporte
Se mesmo assim não abrir, abra um chamado em **Suporte** informando o número da fatura e o link copiado.
