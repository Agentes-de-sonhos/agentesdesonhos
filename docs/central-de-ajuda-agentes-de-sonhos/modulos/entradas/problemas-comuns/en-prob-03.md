---
id: en-prob-03
titulo: Marquei como recebida mas o valor continua em 'A caminho'
modulo: Entradas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - marquei como recebida mas o valor continua em 'a caminho'
palavras-chave:
  - problema
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Marquei como recebida mas o valor continua em 'A caminho'

## Sintoma
Mesmo após dar baixa, o valor não migra para o card **Já no bolso**.

## Causas possíveis
- A página não foi recarregada.
- A entrada estava com data prevista em outro mês.
- Filtro de mês está em outro período.

## Como verificar e resolver
1. Atualize a tela e reabra **Financeiro → Entradas**.
2. Verifique se o mês exibido é o atual.
3. Confirme se o status na lista mudou para **Recebida**.

## Resultado esperado
O valor passa para **Já no bolso** e sai de **A caminho**.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
