# Módulo: Cursos e Mentorias

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Cursos:** `/cursos`, `/cursos/:id`, `/cursos/:id/editar`.
- **Mentorias:** `/mentorias`, `/mentorias/:id`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Marketplace de cursos com módulos, aulas, progresso, matrículas, reuniões, comentários (`marketplace_*`).
- Checkout via Stripe (`create-course-checkout`).
- Aprovação admin para cursos publicados.
- Mentorias com módulos, vídeos, materiais, encontros (`mentorship_*`).
- Thumbnails 16:9, CTAs inteligentes.

## Evidências
`src/pages/CursosMarketplace.tsx`, `CursoDetalhe.tsx`, `CursoEditar.tsx`, `Mentorias.tsx`, `MentoriaDetail.tsx`, `src/components/marketplace/*`, `src/types/marketplace.ts`, `src/types/mentorship.ts`.