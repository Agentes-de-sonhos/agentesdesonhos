---
id: dp-bp-01
titulo: Classifique cada despesa como Fixa ou Variável desde o lançamento
modulo: Despesas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - classifique cada despesa como fixa ou variável desde o lançamento
palavras-chave:
  - boa prática
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Classifique cada despesa como Fixa ou Variável desde o lançamento

## Por que importa
A escolha entre fixa e variável determina se a despesa será projetada nos meses futuros. Errar essa marcação compromete o planejamento financeiro do ano.

## Como aplicar no Agentes de Sonhos
- Use **Fixa** apenas para gastos recorrentes (aluguel, sistema, salários).
- Use **Variável** para despesas pontuais (café com fornecedor, evento).
- Quando trocar de tipo, edite a despesa-mãe imediatamente para refletir nas projeções.

## Erros que ajuda a evitar
- Projeções infladas com gastos pontuais.
- Surpresas no fluxo de caixa.
- Necessidade de retrabalho mês a mês.