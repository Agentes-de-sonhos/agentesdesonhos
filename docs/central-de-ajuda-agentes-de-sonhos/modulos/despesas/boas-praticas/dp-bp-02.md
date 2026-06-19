---
id: dp-bp-02
titulo: Mantenha as categorias de despesa consistentes
modulo: Despesas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - mantenha as categorias de despesa consistentes
palavras-chave:
  - boa prática
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Mantenha as categorias de despesa consistentes

## Por que importa
Categorias bem aplicadas geram relatórios comparáveis ao longo do tempo. Misturar categorias prejudica o entendimento da composição de custos.

## Como aplicar no Agentes de Sonhos
- Aceite a sugestão automática quando ela for adequada.
- Padronize internamente onde lançar cada tipo de gasto.
- Reveja periodicamente as despesas em **Outros** para reclassificar.

## Erros que ajuda a evitar
- Relatórios sem comparabilidade.
- Dificuldade em identificar o maior centro de custo.
- Decisões de corte sem base sólida.