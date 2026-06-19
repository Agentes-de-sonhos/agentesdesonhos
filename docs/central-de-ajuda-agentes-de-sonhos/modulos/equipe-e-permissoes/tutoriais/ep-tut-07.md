---
id: ep-tut-07
titulo: Reativar um membro bloqueado
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - reativar um membro bloqueado
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Reativar um membro bloqueado

## O que você fará
O membro volta a entrar com o login e a senha já cadastrados.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Na lista da equipe, localize o membro com status **Bloqueado**.
2. Clique em **Reativar**.
3. Confirme.

## Resultado esperado
O membro volta a entrar com o login e a senha já cadastrados.

## Atenção
Reativação restaura as permissões existentes; reveja-as se necessário.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
