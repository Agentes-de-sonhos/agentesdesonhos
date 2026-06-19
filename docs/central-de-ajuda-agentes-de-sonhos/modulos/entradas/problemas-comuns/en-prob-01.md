---
id: en-prob-01
titulo: A entrada não é salva ao clicar em Criar
modulo: Entradas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - a entrada não é salva ao clicar em criar
palavras-chave:
  - problema
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# A entrada não é salva ao clicar em Criar

## Sintoma
O botão **Criar** fica desabilitado ou não conclui o salvamento.

## Causas possíveis
- Valor zerado ou em branco.
- Tipo **Vou receber** sem **data prevista**.
- Perfil sem permissão no módulo Financeiro.

## Como verificar e resolver
1. Confirme se o **Valor** é maior que zero.
2. Se o tipo for **Vou receber**, preencha a **Data prevista**.
3. Peça ao titular para revisar suas permissões em **Equipe e Permissões**.

## Resultado esperado
A entrada é salva e aparece na lista com o status escolhido.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
