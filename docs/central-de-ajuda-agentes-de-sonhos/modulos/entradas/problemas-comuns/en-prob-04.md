---
id: en-prob-04
titulo: A entrada aparece como Atrasada sem motivo
modulo: Entradas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - a entrada aparece como atrasada sem motivo
palavras-chave:
  - problema
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# A entrada aparece como Atrasada sem motivo

## Sintoma
Uma entrada nova ou recém-criada já entra com badge **Atrasada**.

## Causas possíveis
- A **Data prevista** informada é anterior à data de hoje.
- O tipo escolhido foi **Vou receber** e a data ficou retroativa.

## Como verificar e resolver
1. Edite a entrada e ajuste a **Data prevista** para um dia futuro.
2. Se o valor já foi recebido, mude o tipo para **💰 Já recebi**.
3. Salve as alterações.

## Resultado esperado
A entrada deixa de aparecer no card **Atrasadas**.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
