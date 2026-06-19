---
id: ep-tut-06
titulo: Desativar (bloquear) um membro
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - desativar (bloquear) um membro
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Desativar (bloquear) um membro

## O que você fará
O membro perde o acesso imediatamente, mas o cadastro e o histórico permanecem.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Em **Minha Conta → Equipe**, localize o membro.
2. Clique na ação **Bloquear**.
3. Confirme a operação.

## Resultado esperado
O membro perde o acesso imediatamente, mas o cadastro e o histórico permanecem.

## Atenção
Use bloqueio para afastamentos temporários; prefira não excluir para preservar a auditoria.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
