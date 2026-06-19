---
id: ep-tut-04
titulo: Configurar permissões por etapa do funil
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - configurar permissões por etapa do funil
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Configurar permissões por etapa do funil

## O que você fará
O membro passa a ver e atuar apenas nas etapas marcadas.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Edite o membro.
2. Na seção de **permissões por etapa**, escolha o funil (Oportunidades ou Operações).
3. Para cada etapa, marque **Ver**, **Editar** e/ou **Mover** conforme a função do colaborador.
4. Clique em **Salvar**.

## Resultado esperado
O membro passa a ver e atuar apenas nas etapas marcadas.

## Atenção
Sem nenhuma etapa marcada, o membro pode não enxergar registros do funil mesmo com permissão de módulo.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
