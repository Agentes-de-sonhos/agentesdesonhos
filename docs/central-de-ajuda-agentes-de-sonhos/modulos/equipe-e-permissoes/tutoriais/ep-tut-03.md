---
id: ep-tut-03
titulo: Configurar permissões por módulo
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - configurar permissões por módulo
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Configurar permissões por módulo

## O que você fará
O menu lateral do membro exibe apenas os módulos liberados.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Edite o membro em **Minha Conta → Equipe**.
2. Na seção **Gestão de Clientes**, escolha **Acesso total** ou **Personalizado**.
3. Em **Personalizado**, marque apenas as ações desejadas (visualizar, criar, editar, excluir) para Clientes, Oportunidades, Operações e Metas.
4. Ative **Gestão Financeira — Acesso total** se o membro precisa entrar no Financeiro.
5. Clique em **Salvar**.

## Resultado esperado
O menu lateral do membro exibe apenas os módulos liberados.

## Atenção
Permissões financeiras são concedidas em bloco, não por sub-recurso.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
