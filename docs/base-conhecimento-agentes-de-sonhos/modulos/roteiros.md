# Módulo: Roteiros

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota interna:** `/ferramentas-ia/criar-roteiro[/id]` · **Modelos:** `/ferramentas-ia/modelos-roteiros` · **Público:** `/roteiro/:token` em `seuroteiro.tur.br`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Roteiro dia a dia com períodos (manhã/tarde/noite).
- Modelos reutilizáveis (`itinerary_templates` + `itinerary_template_activities`).
- Sistema híbrido em 3 camadas: **Auto / IA / Manual** com coluna `origin` por atividade.
- Geração e refinamento por IA (`generate-itinerary`, `refine-itinerary-activity`, `parse-itinerary-ai`).
- Imagens por período (`itinerary_period_images`).
- Compartilhamento por link público.

## Regras
- Cliente obrigatório.
- Camada de origem rastreada para evitar sobrescrita de edições manuais.

## Evidências
`src/pages/CriarRoteiro.tsx`, `ModelosRoteiros.tsx`, `RoteiroPublico*.tsx`, `src/components/itinerary/*`, `src/lib/roteiro-domain.ts`, tabelas `itineraries`, `itinerary_days`, `itinerary_activities`, `itinerary_templates`, `itinerary_template_activities`, `itinerary_period_images`.