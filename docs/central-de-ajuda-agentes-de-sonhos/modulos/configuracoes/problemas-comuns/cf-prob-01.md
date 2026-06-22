---
id: cf-prob-01
titulo: Alteração no Perfil não foi salva
modulo: Configurações, Conta e Onboarding
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - alteração no perfil não foi salva
palavras-chave:
  - Alteração no Perfil não foi salva
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Perfil.tsx | src/pages/MinhaConta.tsx | src/pages/Onboarding.tsx | src/pages/Atualizacoes.tsx | src/components/profile/AgencyBrandColorCard.tsx | src/hooks/useAuth.tsx | src/hooks/useSubscription.ts
---
# Alteração no Perfil não foi salva

## Sintoma
Você edita um campo no **Perfil** e clica em **Salvar alterações**, mas o valor não persiste após recarregar a página.

## Causas possíveis
- Campo obrigatório vazio.
- Formato inválido (ex.: CPF/CNPJ/CEP).
- Conexão de internet instável durante o envio.

## Como verificar
1. Reabra **Editar perfil** e verifique se há marcações de erro nos campos.
2. Confirme se sua internet está ativa.
3. Tente novamente.

## Solução
1. Corrija os campos sinalizados.
2. Garanta conexão estável.
3. Clique em **Salvar alterações**.

## Quando procurar suporte
Se a mensagem de erro persistir e nenhum campo estiver marcado, abra um chamado em **Suporte** descrevendo o campo alterado e o horário.
