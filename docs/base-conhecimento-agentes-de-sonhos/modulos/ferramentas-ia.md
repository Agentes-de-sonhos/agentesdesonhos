# Módulo: Ferramentas de IA

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota hub:** `/ferramentas-ia`. Atalhos para Carteira Digital, Orçamento, Roteiros, Conteúdo, Modelos.
- **Estado:** CONFIRMADO.

## Backends de IA
- `generate-content`, `generate-destination-intro`, `generate-itinerary`, `parse-itinerary-ai`, `refine-itinerary-activity`, `lead-wizard-ai`, `hotel-rx`, `extract-business-card`, `ai-import-service`, `curate-news`, importadores de documento.
- Provedor: Lovable AI Gateway (Gemini).
- Cotas e gates por plano (`SubscriptionGuard`, `FeatureGate`, `daily_feature_usage`).

## Evidências
`src/pages/FerramentasIA.tsx`, `src/pages/CriarConteudo.tsx`, `src/hooks/useDailyLimit.ts`, `useGeneratedContent.ts`.