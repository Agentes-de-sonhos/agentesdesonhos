---
id: ep-tut-09
titulo: Liberar acesso ao Financeiro para um membro
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - liberar acesso ao financeiro para um membro
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Liberar acesso ao Financeiro para um membro

## O que você fará
O membro passa a ver e usar o menu **Financeiro**.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Edite o membro.
2. Ative a chave **Gestão Financeira — Acesso total**.
3. Clique em **Salvar**.

## Resultado esperado
O membro passa a ver e usar o menu **Financeiro**.

## Atenção
Não há, hoje, permissão financeira granular por sub-recurso. Conceda apenas a quem realmente precisa.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
