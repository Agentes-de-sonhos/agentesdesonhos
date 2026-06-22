---
id: cf-prob-04
titulo: Não consigo abrir o portal de pagamentos
modulo: Configurações, Conta e Onboarding
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - não consigo abrir o portal de pagamentos
palavras-chave:
  - Não consigo abrir o portal de pagamentos
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Perfil.tsx | src/pages/MinhaConta.tsx | src/pages/Onboarding.tsx | src/pages/Atualizacoes.tsx | src/components/profile/AgencyBrandColorCard.tsx | src/hooks/useAuth.tsx | src/hooks/useSubscription.ts
---
# Não consigo abrir o portal de pagamentos

## Sintoma
Você clica em **Pagamentos e faturas** em **Minha Conta**, mas o portal não abre.

## Causas possíveis
- Bloqueador de pop-ups do navegador.
- Sessão expirada.
- Sua assinatura não é paga (plano gratuito não exibe portal).

## Como verificar
1. Verifique se o navegador bloqueou um pop-up.
2. Verifique no cartão **Plano atual** se você está em um plano pago.

## Solução
1. Permita pop-ups do domínio da plataforma.
2. Faça logout e login novamente.
3. Se for plano gratuito, faça upgrade em **Planos** antes de acessar o portal.

## Quando procurar suporte
Se o portal continuar inacessível mesmo em plano pago e com pop-ups liberados, abra um chamado em **Suporte**.
