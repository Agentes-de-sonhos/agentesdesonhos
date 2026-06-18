---
id: operacoes-prob-03
titulo: Operação não pode ser salva por falta de tarefas
modulo: Operações
tipo: problema-comum
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: criar operações
intencoes: [erro ao salvar, exige tarefa]
palavras-chave: [erro, salvar, tarefa, obrigatória]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-tut-01, operacoes-faq-04]
fonte-interna: src/components/crm/operations/CreateOperationDialog.tsx
---

# Operação não pode ser salva por falta de tarefas

## Sintoma
Ao tentar criar a operação aparece a mensagem **"Adicione ao menos uma tarefa antes de salvar."**.

## Causa
O sistema exige no mínimo uma tarefa para criar a operação.

## Solução passo a passo
1. No formulário **Nova Operação**, localize o campo **Adicionar tarefa...**.
2. Digite o título de pelo menos uma tarefa inicial.
3. Pressione Enter para confirmar.
4. Clique novamente em **Criar**.

## Resultado esperado
A operação é salva e o toast **"Operação criada"** aparece.
