---
id: en-prob-02
titulo: A entrada não aparece no mês esperado
modulo: Entradas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - a entrada não aparece no mês esperado
palavras-chave:
  - problema
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# A entrada não aparece no mês esperado

## Sintoma
A entrada criada não consta nos cards ou na lista do mês.

## Causas possíveis
- A **data** ou a **data prevista** está em outro mês.
- O filtro de mês selecionado é diferente do mês da entrada.
- A entrada foi salva como **A receber** e você está olhando para a aba **Recebidas**.

## Como verificar e resolver
1. Edite a entrada e revise as datas.
2. Mude a navegação por mês para o período correto.
3. Use a aba **Todas** ou **A Receber** para localizar a entrada.

## Resultado esperado
A entrada aparece no card e na aba correspondentes ao seu status e data.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
