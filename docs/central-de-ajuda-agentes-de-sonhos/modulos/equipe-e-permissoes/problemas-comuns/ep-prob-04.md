---
id: ep-prob-04
titulo: Permissão por etapa do funil não está sendo aplicada
modulo: Equipe e Permissões
tipo: problema-comum
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - permissão por etapa do funil não está sendo aplicada
palavras-chave:
  - problema comum
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Permissão por etapa do funil não está sendo aplicada

## Sintoma percebido
Mesmo após marcar uma etapa, o membro ainda não vê registros ou continua vendo etapas que não deveria.

## Causas possíveis
- O membro precisa sair e entrar novamente para sincronizar as permissões.
- Foi marcada apenas a permissão de **Editar** ou **Mover**, sem **Ver**.
- A etapa exibida no funil é de outro pipeline (Oportunidades vs Operações).

## Como verificar
- Abra **Minha Conta → Equipe** e confira status, permissões e quota.
- Peça ao membro para descrever exatamente onde a tentativa falha.

## Solução passo a passo
1. Confirme as marcações nas seções de **Oportunidades** e **Operações** separadamente.
2. Inclua **Ver** sempre que conceder **Editar** ou **Mover**.
3. Salve e peça ao membro para entrar novamente.

## Resultado esperado
As etapas e ações configuradas passam a refletir corretamente.

## Quando procurar o Suporte
Caso a etapa exigida tenha sido renomeada, revise a configuração após a mudança.

## Informações não sensíveis a enviar ao Suporte
- Nome (não a senha) do membro envolvido.
- Status atual do membro (ativo/bloqueado).
- Descrição do comportamento esperado e do observado.

## Artigos relacionados
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
