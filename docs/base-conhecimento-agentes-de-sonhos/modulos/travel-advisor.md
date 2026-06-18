# Módulo: Travel Advisor (Dream Advisor)

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota base:** `/dream-advisor`. Páginas específicas: HotelAdvisor, DiningAdvisor, ShoppingAdvisor, ExperienceAdvisor, AttractionAdvisor (existem mas não estão roteadas como raiz no `App.tsx` — PENDENTE).
- **Estado:** CONFIRMADO (entrada principal).

## Funcionalidades
- Sugestões curadas com IA + Google Places.
- Reviews em tempo real, contadores de likes, auto-edição (`advisor_reviews`).
- Sugestões dos usuários (`advisor_suggestions`).

## Evidências
`src/pages/DreamAdvisor.tsx`, `Hotel/Dining/Shopping/Experience/AttractionAdvisor.tsx`, `src/components/advisor/*`, `src/hooks/useAdvisorReviews.ts`, `useAdvisorSuggestions.ts`.