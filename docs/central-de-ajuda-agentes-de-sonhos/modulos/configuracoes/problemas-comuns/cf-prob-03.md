---
id: cf-prob-03
titulo: Onboarding aparece novamente após eu já ter concluído
modulo: Configurações, Conta e Onboarding
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - onboarding aparece novamente após eu já ter concluído
palavras-chave:
  - Onboarding aparece novamente após eu já ter concluído
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Perfil.tsx | src/pages/MinhaConta.tsx | src/pages/Onboarding.tsx | src/pages/Atualizacoes.tsx | src/components/profile/AgencyBrandColorCard.tsx | src/hooks/useAuth.tsx | src/hooks/useSubscription.ts
---
# Onboarding aparece novamente após eu já ter concluído

## Sintoma
Mesmo tendo finalizado o **Onboarding**, a tela volta a aparecer em logins seguintes.

## Causas possíveis
- Um campo obrigatório foi limpo posteriormente.
- Conta foi reiniciada por suporte.
- Sessão antiga em outro navegador.

## Como verificar
1. Acesse **Perfil** e confira se há campos obrigatórios vazios.
2. Confirme o e-mail logado.

## Solução
1. Preencha novamente os campos exigidos pelo onboarding.
2. Clique em **Concluir**.

## Quando procurar suporte
Se o onboarding reaparecer mesmo com todos os campos preenchidos, abra um chamado em **Suporte**.
