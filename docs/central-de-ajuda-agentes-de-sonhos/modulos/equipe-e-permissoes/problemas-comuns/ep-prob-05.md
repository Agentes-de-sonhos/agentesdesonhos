---
id: ep-prob-05
titulo: Limite de membros da equipe foi atingido
modulo: Equipe e Permissões
tipo: problema-comum
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - limite de membros da equipe foi atingido
palavras-chave:
  - problema comum
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Limite de membros da equipe foi atingido

## Sintoma percebido
O botão **Novo usuário** está desabilitado e aparece o contador (ex.: **3/3**) no topo da página de equipe.

## Causas possíveis
- A conta atingiu a quota de membros do plano atual.
- Existem membros bloqueados ocupando vagas.

## Como verificar
- Abra **Minha Conta → Equipe** e confira status, permissões e quota.
- Peça ao membro para descrever exatamente onde a tentativa falha.

## Solução passo a passo
1. Avalie se algum membro pode ser **excluído** definitivamente para liberar vaga.
2. Caso precise manter o histórico, considere ampliar o plano em **Minha Conta → Assinatura**.

## Resultado esperado
O contador volta a apresentar vaga disponível e o botão **Novo usuário** fica habilitado.

## Quando procurar o Suporte
Se a dúvida envolver mudança de plano, fale com o Suporte antes de excluir membros importantes.

## Informações não sensíveis a enviar ao Suporte
- Nome (não a senha) do membro envolvido.
- Status atual do membro (ativo/bloqueado).
- Descrição do comportamento esperado e do observado.

## Artigos relacionados
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
