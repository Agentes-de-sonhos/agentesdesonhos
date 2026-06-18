# Módulo: Planos e Assinatura

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rotas:** `/planos` (pública) e `/minha-conta` (portal).
- **Estado:** CONFIRMADO.

## Funcionalidades
- Três planos: **Start**, **Profissional**, **Premium**.
- `SubscriptionGuard` + `FeatureGate` controlam telas e quotas de IA.
- Onboarding diverge: Free (signup) vs Pago (checkout first) para garantir o plano correto.
- Stripe webhook mapeia preço → plano e envia e-mail Resend.
- Auto-downgrade para Start em caso de falha de pagamento/cancelamento.
- Dashboard Start é dedicado (`/dashboard-start`) com upsell.
- Simulador admin de planos para testar gates sem trocar de conta.

## Evidências
`src/pages/Planos.tsx`, `Desconto30Off.tsx`, `src/components/subscription/*`, `src/hooks/useSubscription.tsx`, `src/types/subscription.ts`, Edge Functions Stripe.