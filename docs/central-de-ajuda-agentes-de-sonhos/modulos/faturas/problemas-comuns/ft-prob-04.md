---
id: ft-prob-04
titulo: A fatura aparece como Vencida mesmo após pagamento
modulo: Faturas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Faturas
intencoes:
  - a fatura aparece como vencida mesmo após pagamento
palavras-chave:
  - problema
  - faturas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# A fatura aparece como Vencida mesmo após pagamento

## Sintoma
Você registrou o pagamento mas o selo **Vencida** continua.

## Causas possíveis
- O pagamento foi menor que o saldo (fatura ficou **Parcialmente paga**).
- O pagamento foi registrado em outra fatura.
- A página não foi atualizada após o registro.

## Como verificar e resolver
1. Confira o **Saldo restante** na fatura: se for maior que zero, falta receber.
2. Vá em **Recibos** e confirme em qual fatura o pagamento foi registrado.
3. Atualize a tela; se o saldo zerou, o status passa para **Paga**.

## Resultado esperado
A fatura quitada deixa de exibir o selo **Vencida**.

## Quando procurar o suporte
Se o saldo continuar incorreto, abra um chamado em **Suporte** com o número da fatura e o número do recibo.
