---
id: ep-tut-10
titulo: Testar o acesso de um membro após configurar permissões
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - testar o acesso de um membro após configurar permissões
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Testar o acesso de um membro após configurar permissões

## O que você fará
O acesso real do membro é validado antes de ele iniciar o trabalho.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Saia da sua sessão de titular ou abra uma janela anônima.
2. Entre com o **login** e **senha** do membro.
3. Verifique se os menus, etapas e ações disponíveis correspondem ao planejado.
4. Caso algo esteja diferente, volte como titular e ajuste.

## Resultado esperado
O acesso real do membro é validado antes de ele iniciar o trabalho.

## Atenção
Faça o teste sempre após alterar permissões críticas (financeiro, exclusão, etapas).

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
