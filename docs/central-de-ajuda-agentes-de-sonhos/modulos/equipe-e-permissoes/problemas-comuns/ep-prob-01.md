---
id: ep-prob-01
titulo: Membro não consegue entrar com o login
modulo: Equipe e Permissões
tipo: problema-comum
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - membro não consegue entrar com o login
palavras-chave:
  - problema comum
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Membro não consegue entrar com o login

## Sintoma percebido
O membro digita login e senha e recebe mensagem de credenciais inválidas ou não avança da tela de acesso.

## Causas possíveis
- Login digitado incorretamente (com espaços, caixa alta diferente).
- Senha alterada pelo titular sem aviso ao membro.
- Membro com status **Bloqueado**.
- Membro excluído por engano.

## Como verificar
- Abra **Minha Conta → Equipe** e confira status, permissões e quota.
- Peça ao membro para descrever exatamente onde a tentativa falha.

## Solução passo a passo
1. Confirme em **Minha Conta → Equipe** se o membro aparece como **Ativo**.
2. Reveja o **login** exibido na lista.
3. Redefina a senha e combine a nova com o membro.

## Resultado esperado
O membro entra normalmente com as credenciais combinadas.

## Quando procurar o Suporte
Se mesmo assim não entrar, abra um chamado no Suporte com login do membro e horário aproximado da tentativa.

## Informações não sensíveis a enviar ao Suporte
- Nome (não a senha) do membro envolvido.
- Status atual do membro (ativo/bloqueado).
- Descrição do comportamento esperado e do observado.

## Artigos relacionados
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)
