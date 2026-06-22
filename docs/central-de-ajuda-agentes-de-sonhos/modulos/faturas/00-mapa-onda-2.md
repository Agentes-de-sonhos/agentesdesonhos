---
id: faturas-mapa-onda-2
titulo: Faturas — Mapa de produção (Onda 2)
modulo: Faturas
tipo: índice-de-producao
publico:
  - equipe-documentacao
status: concluído
confianca: confirmado
ultima-revisao: 2026-06-22
fonte-interna: src/components/financial/invoices/InvoicesManager.tsx | src/components/financial/invoices/InvoiceFormDialog.tsx | src/components/financial/invoices/RegisterPaymentDialog.tsx | src/hooks/useInvoices.ts | src/pages/FaturaPublica.tsx | src/lib/generateInvoicePdf.ts | src/lib/generateReceiptPdf.ts | src/types/invoice.ts
---
# Faturas — Mapa de produção da Onda 2 (Subonda 2B)

## Status
**Concluído.** Todas as entregas da Subonda 2B foram produzidas, validadas e publicadas no RAG.

## Objetivo do módulo
Documentar de forma confiável a operação do módulo **Faturas**, com foco em uso diário pelo usuário final.

## Escopo documentado
- Visão geral e primeiros passos (revisados).
- 20 FAQs canônicas confirmadas.
- 10 tutoriais.
- 5 problemas comuns.
- 4 boas práticas.

## Itens entregues
- 20 FAQs
- 10 tutoriais
- 5 problemas comuns
- 4 boas práticas
- 41 chunks adicionados ao RAG

## Itens pendentes
Nenhuma entrega quantitativa pendente. Decisões pontuais permanecem listadas em `23-DECISOES-PENDENTES-PROPRIETARIO.md`.

## Conteúdos incluídos no RAG
Todos os artigos deste módulo classificados como `status: pronto` e `confianca: confirmado`.

## Conteúdos excluídos do RAG
Nenhum nesta entrega.

## Decisões que dependem do proprietário
- Definir se o pagamento de fatura deve gerar automaticamente uma entrada em **Financeiro → Entradas**.
- Definir comportamento oficial para **Cancelar** vs **Excluir** uma fatura com pagamentos registrados.
- Confirmar se haverá emissão integrada de **nota fiscal** a partir da fatura.
- Confirmar se haverá notificação automática para o cliente quando a fatura vencer.

## Data da execução
2026-06-22
