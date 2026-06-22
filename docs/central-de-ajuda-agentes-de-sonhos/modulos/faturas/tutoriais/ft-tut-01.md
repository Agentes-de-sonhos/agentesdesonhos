---
id: ft-tut-01
titulo: Criar uma fatura do zero
modulo: Faturas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - criar uma fatura do zero
palavras-chave:
  - tutorial
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Criar uma fatura do zero

## O que você fará
Uma nova fatura aparece na lista de **Faturas** com status **Rascunho**.

## Antes de começar
- Estar logado com perfil **Titular** ou **Financeiro**.
- Ter o nome do cliente, destino e os serviços a serem cobrados.

## Passo a passo
1. Em **Financeiro → Faturas**, clique em **Nova fatura**.
2. Na seção do cliente, preencha **Nome do cliente** e, se quiser, **Empresa**, **Documento**, **E-mail** e **Telefone**.
3. Em **Viagem**, informe **Destino**, **Embarque** e **Retorno** (opcionais).
4. Em **Serviços**, clique em **Adicionar serviço**, escolha a **Categoria** (Aéreo, Hotel, etc.), descreva o item e preencha **Tarifa**, **Taxas**, **Desconto**, **Comissão** e **RAV** conforme aplicável.
5. Em **Parcelas**, se houver, clique em **Adicionar parcela** e informe rótulo, valor e vencimento.
6. Confira o resumo financeiro e clique em **Salvar**.

## Resultado esperado
A fatura é criada como **Rascunho**, pronta para envio.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
