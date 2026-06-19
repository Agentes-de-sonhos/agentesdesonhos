---
id: en-tut-08
titulo: Exportar as entradas para análise
modulo: Entradas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - exportar as entradas para análise
palavras-chave:
  - tutorial
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Exportar as entradas para análise

## O que você fará
Um arquivo com as entradas do período é baixado, contendo data, descrição, valor e forma de pagamento.

## Antes de começar
- Acesso ao módulo Financeiro/Entradas.
- Definir o período desejado (mês, trimestre, ano).

## Passo a passo
1. Em **Financeiro → Entradas**, clique no ícone de **mais ações** (três pontos).
2. Selecione **Exportar**.
3. Escolha o **período** e o **formato** no modal **Exportar Entradas**.
4. Confirme para baixar o arquivo gerado.

## Resultado esperado
Um arquivo com as entradas do período é baixado, contendo data, descrição, valor e forma de pagamento.

## Atenção
- A exportação usa o período escolhido no modal, não os filtros visuais da tela.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
