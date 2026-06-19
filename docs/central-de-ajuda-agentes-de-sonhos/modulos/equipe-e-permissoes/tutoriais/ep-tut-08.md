---
id: ep-tut-08
titulo: Excluir um membro definitivamente
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - excluir um membro definitivamente
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Excluir um membro definitivamente

## O que você fará
O login deixa de existir e o membro não consegue mais entrar.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Na lista da equipe, clique no ícone de **lixeira**.
2. Leia o aviso de exclusão.
3. Confirme a exclusão.

## Resultado esperado
O login deixa de existir e o membro não consegue mais entrar.

## Atenção
Exclusão é definitiva. Para preservar o histórico de quem fez o quê, prefira **Bloquear**.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
