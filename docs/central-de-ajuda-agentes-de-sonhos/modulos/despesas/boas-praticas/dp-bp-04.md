---
id: dp-bp-04
titulo: Antes de excluir uma despesa, prefira editar
modulo: Despesas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - antes de excluir uma despesa, prefira editar
palavras-chave:
  - boa prática
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Antes de excluir uma despesa, prefira editar

## Por que importa
Excluir uma despesa apaga o histórico do gasto. Em recorrentes, também encerra as projeções futuras. Em muitos casos a correção é mais segura.

## Como aplicar no Agentes de Sonhos
- Use **Editar** para corrigir valor, data ou categoria.
- Reserve a exclusão para lançamentos realmente equivocados.
- Combine na equipe quem está autorizado a excluir despesas pagas.

## Erros que ajuda a evitar
- Perda de rastreabilidade.
- Distorções no fechamento.
- Conflitos sobre quem alterou o que.