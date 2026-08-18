---
name: White-label Request Microtransition
description: Overlay animado de ~3s entre o formulário inicial e o modal da jornada de cotação nos sites white label
type: feature
---
`ServiceRequestTransition` (+ `src/lib/serviceRequestTransition.ts`) mostra overlay de ~3s SOMENTE após validação bem-sucedida da primeira etapa e apenas antes da PRIMEIRA abertura de `AgencyQuoteJourney`. Nunca nas etapas internas.

Regras de conteúdo: proibido qualquer linguagem de busca automática (ofertas, disponibilidade, "encontramos", percentuais, barra de progresso, tempo estimado). Título fixo "Estamos preparando sua solicitação" + 3 mensagens consultivas em fade. Ilustração vetorial Lucide por categoria (motif). Herda tokens da agência, respeita prefers-reduced-motion, aria-live="polite", bloqueia o fundo.
