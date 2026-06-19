---
id: ep-prob-02
titulo: Membro não enxerga um módulo que deveria ver
modulo: Equipe e Permissões
tipo: problema-comum
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - membro não enxerga um módulo que deveria ver
palavras-chave:
  - problema comum
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Membro não enxerga um módulo que deveria ver

## Sintoma percebido
O menu do módulo (ex.: Clientes ou Financeiro) não aparece para o membro, mesmo após login.

## Causas possíveis
- Permissão do módulo não foi marcada.
- Em Gestão de Clientes, o nível está em **Sem acesso** ou em **Personalizado** sem nenhuma ação marcada.
- Em Financeiro, a chave **Acesso total** está desligada.

## Como verificar
- Abra **Minha Conta → Equipe** e confira status, permissões e quota.
- Peça ao membro para descrever exatamente onde a tentativa falha.

## Solução passo a passo
1. Edite o membro em **Minha Conta → Equipe**.
2. Ajuste o nível de Gestão de Clientes ou ative o Financeiro.
3. Salve e peça ao membro para recarregar a página.

## Resultado esperado
O menu correto passa a aparecer para o membro.

## Quando procurar o Suporte
Se ainda não aparecer, peça ao membro para sair e entrar novamente.

## Informações não sensíveis a enviar ao Suporte
- Nome (não a senha) do membro envolvido.
- Status atual do membro (ativo/bloqueado).
- Descrição do comportamento esperado e do observado.

## Artigos relacionados
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
