# Módulo: Notícias do Trade (Radar do Turismo)

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/noticias`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Feed curado com IA (`curate-news`, `news_curation_feedback`).
- Pipeline em camadas: `noticias_brutas` → `noticias_dashboard` → `news`.
- Likes (`news_likes`).

## Evidências
`src/pages/Noticias.tsx`, `src/components/news/*`, `src/hooks/useNewsLikes.ts`.