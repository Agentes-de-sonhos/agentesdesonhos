# Módulo: EducaTravel Academy

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/educa-academy`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Trilhas (`learning_trails`) com treinamentos (`trail_trainings`), materiais (`trail_materials`, `trail_linked_materials`), palestrantes (`trail_speakers`).
- Quizzes/exames (`trail_exam_questions`, `trail_exam_options`, `quiz_questions`, `quiz_options`, `user_quiz_attempts`, `user_exam_attempts`).
- Certificados (`user_certificates`, `generateCertificatePdf`).
- Destinos vinculados a trilhas (`academy_destinations`).
- Iframe de vídeo limitado a 90vh.
- Plano Start: limite de 3 trilhas (auto-enforcement).

## Evidências
`src/pages/EducaAcademy.tsx`, `src/components/academy/*`, `src/types/academy.ts`, `src/lib/generateCertificatePdf.ts`.