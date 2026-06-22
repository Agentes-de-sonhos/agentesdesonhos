---
id: ft-prob-01
titulo: A fatura não é salva ao clicar em Salvar
modulo: Faturas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - a fatura não é salva ao clicar em salvar
palavras-chave:
  - problema
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# A fatura não é salva ao clicar em Salvar

## Sintoma
O botão **Salvar** fica desabilitado ou a fatura não aparece na lista.

## Causas possíveis
- Nome do cliente em branco.
- Nenhum serviço adicionado.
- Valor total zerado.
- Perfil sem permissão no módulo Financeiro.

## Como verificar e resolver
1. Confirme que o **Nome do cliente** está preenchido.
2. Garanta que existe pelo menos um **Serviço** com valor maior que zero.
3. Verifique se há campos obrigatórios em vermelho.
4. Peça ao titular para revisar suas permissões em **Equipe e Permissões**.

## Resultado esperado
A fatura é salva e aparece na lista de **Faturas**.

## Quando procurar o suporte
Se persistir, abra um chamado em **Suporte** informando o navegador, a categoria de serviço utilizada e o horário. Não envie senhas, dados de cartão ou tokens.
