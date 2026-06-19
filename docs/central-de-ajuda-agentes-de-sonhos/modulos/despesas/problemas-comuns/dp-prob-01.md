---
id: dp-prob-01
titulo: A despesa não é salva ao clicar em Criar
modulo: Despesas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - a despesa não é salva ao clicar em criar
palavras-chave:
  - problema
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# A despesa não é salva ao clicar em Criar

## Sintoma
O botão **Criar** fica desabilitado ou não conclui o salvamento.

## Causas possíveis
- Campo **Descrição** vazio.
- **Valor** zerado.
- Falta de permissão no módulo Financeiro.

## Como verificar e resolver
1. Preencha a **Descrição**.
2. Informe um **Valor** maior que zero.
3. Peça ao titular para revisar suas permissões em **Equipe e Permissões**.

## Resultado esperado
A despesa é salva e aparece na lista do mês.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
