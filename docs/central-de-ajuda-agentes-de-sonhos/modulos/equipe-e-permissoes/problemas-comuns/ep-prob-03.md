---
id: ep-prob-03
titulo: Membro vê registros que não deveria ver
modulo: Equipe e Permissões
tipo: problema-comum
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - membro vê registros que não deveria ver
palavras-chave:
  - problema comum
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Membro vê registros que não deveria ver

## Sintoma percebido
O membro consegue abrir clientes, oportunidades ou operações que não deveriam estar visíveis para ele.

## Causas possíveis
- Foi concedido **Acesso total** a Gestão de Clientes quando o ideal era Personalizado.
- As permissões por etapa não foram configuradas e o membro vê todas as etapas.
- Permissão financeira liberada além do necessário.

## Como verificar
- Abra **Minha Conta → Equipe** e confira status, permissões e quota.
- Peça ao membro para descrever exatamente onde a tentativa falha.

## Solução passo a passo
1. Edite o membro e troque para **Personalizado** em Gestão de Clientes.
2. Marque as ações e etapas específicas que ele deve ver e atuar.
3. Desative o acesso financeiro se não for necessário.

## Resultado esperado
O membro passa a visualizar apenas o que está previsto na função dele.

## Quando procurar o Suporte
Documente internamente o nível de acesso por função para manter a coerência.

## Informações não sensíveis a enviar ao Suporte
- Nome (não a senha) do membro envolvido.
- Status atual do membro (ativo/bloqueado).
- Descrição do comportamento esperado e do observado.

## Artigos relacionados
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
