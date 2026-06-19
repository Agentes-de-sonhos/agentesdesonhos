---
id: dp-tut-08
titulo: Exportar despesas para análise
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - exportar despesas para análise
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Exportar despesas para análise

## O que você fará
É gerado um arquivo com as despesas do período, incluindo descrição, categoria, valor e data.

## Antes de começar
- Acesso ao módulo Financeiro/Despesas.
- Definir o período desejado.

## Passo a passo
1. Em **Financeiro → Despesas**, clique no ícone de **mais ações** (três pontos).
2. Selecione **Exportar**.
3. No modal, escolha o **período** e o **formato** desejados.
4. Confirme para baixar o arquivo.

## Resultado esperado
É gerado um arquivo com as despesas do período, incluindo descrição, categoria, valor e data.

## Atenção
- A exportação usa o período definido no modal, não os filtros visuais da tela.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
