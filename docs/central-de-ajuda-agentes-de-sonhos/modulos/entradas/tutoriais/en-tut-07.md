---
id: en-tut-07
titulo: Consultar entradas atrasadas
modulo: Entradas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - consultar entradas atrasadas
palavras-chave:
  - tutorial
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Consultar entradas atrasadas

## O que você fará
Você passa a ter visibilidade clara do que está vencido e pode priorizar a cobrança.

## Antes de começar
- Ter entradas com tipo **Vou receber** cadastradas.
- Acesso ao módulo Financeiro/Entradas.

## Passo a passo
1. Em **Financeiro → Entradas**, abra a aba **A Receber**.
2. Identifique entradas com badge **Atrasada**.
3. Use o card **Atrasadas** no topo para ver o valor total e a quantidade.
4. Tome ação: cobrar o cliente, marcar como recebido ou ajustar a data prevista.

## Resultado esperado
Você passa a ter visibilidade clara do que está vencido e pode priorizar a cobrança.

## Atenção
- A marcação 'Atrasada' é automática quando a data prevista é anterior a hoje.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
