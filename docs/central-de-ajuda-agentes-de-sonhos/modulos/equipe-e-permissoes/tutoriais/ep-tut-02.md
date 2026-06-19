---
id: ep-tut-02
titulo: Editar dados e cargo de um membro
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - editar dados e cargo de um membro
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Editar dados e cargo de um membro

## O que você fará
As alterações passam a valer no próximo carregamento da página do membro.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Em **Minha Conta → Equipe**, clique no ícone de **lápis** ao lado do membro.
2. Altere **Nome completo**, **Cargo / Função** ou **Permissões**.
3. Clique em **Salvar**.

## Resultado esperado
As alterações passam a valer no próximo carregamento da página do membro.

## Atenção
O **Login** do membro não pode ser alterado pela tela de edição.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
