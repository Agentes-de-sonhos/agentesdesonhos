---
id: dp-tut-02
titulo: Registrar uma despesa fixa com data final
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - registrar uma despesa fixa com data final
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Registrar uma despesa fixa com data final

## O que você fará
A despesa é projetada mês a mês até o mês da data final, com badge **Recorrência** nas projeções.

## Antes de começar
- Acesso ao módulo Financeiro/Despesas.
- Saber data inicial, valor mensal e data final.

## Passo a passo
1. Em **Financeiro → Despesas**, clique em **Nova Despesa**.
2. Preencha **Descrição**, **Categoria** e **Valor**.
3. Escolha **Tipo: Fixa (recorrente)**.
4. Em **Duração**, selecione **Até uma data específica** e informe a **Data final**.
5. Clique em **Criar**.

## Resultado esperado
A despesa é projetada mês a mês até o mês da data final, com badge **Recorrência** nas projeções.

## Atenção
- Editar ou excluir no futuro não altera meses já realizados.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
