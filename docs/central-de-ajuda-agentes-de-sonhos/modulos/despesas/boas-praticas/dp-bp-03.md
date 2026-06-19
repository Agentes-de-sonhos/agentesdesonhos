---
id: dp-bp-03
titulo: Evite duplicidade entre comissão e despesa manual
modulo: Despesas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - evite duplicidade entre comissão e despesa manual
palavras-chave:
  - boa prática
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Evite duplicidade entre comissão e despesa manual

## Por que importa
A comissão paga ao vendedor já gera uma despesa automática. Criar uma despesa manual para o mesmo pagamento dobra o gasto contabilizado.

## Como aplicar no Agentes de Sonhos
- Confira em **Filtrar** se já existe a despesa **Comissão - Nome do Vendedor** antes de lançar manualmente.
- Quando precisar ajustar valor, edite a despesa existente em vez de criar uma nova.
- Documente exceções para a equipe.

## Erros que ajuda a evitar
- Inflação dos custos no dashboard.
- Conferências repetidas.
- Pagamentos calculados em duplicidade.