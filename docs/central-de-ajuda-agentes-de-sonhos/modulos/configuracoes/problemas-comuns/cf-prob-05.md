---
id: cf-prob-05
titulo: Membro da equipe não consegue alterar dados da agência
modulo: Configurações, Conta e Onboarding
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - membro da equipe não consegue alterar dados da agência
palavras-chave:
  - Membro da equipe não consegue alterar dados da agência
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Perfil.tsx | src/pages/MinhaConta.tsx | src/pages/Onboarding.tsx | src/pages/Atualizacoes.tsx | src/components/profile/AgencyBrandColorCard.tsx | src/hooks/useAuth.tsx | src/hooks/useSubscription.ts
---
# Membro da equipe não consegue alterar dados da agência

## Sintoma
Um membro da equipe abre **Perfil**, mas os campos da agência aparecem como somente leitura.

## Causas possíveis
- O membro não possui permissão de titular para editar dados da agência.
- O perfil tem alcance restrito a dados pessoais.

## Como verificar
1. Confirme o perfil do membro em **Equipe**.
2. Verifique se o titular precisa atualizar a permissão.

## Solução
1. O titular deve ajustar a permissão do membro em **Equipe** se for o caso.
2. Caso a permissão seja intencional, peça ao titular para alterar os dados.

## Quando procurar suporte
Se a permissão estiver correta e ainda assim os campos não puderem ser editados, abra um chamado em **Suporte**.
