# Módulo: Marketing — Vitrine, Cartão e Lâminas

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rotas:** `/minha-vitrine`, `/meu-cartao[/id]`, `/criar-cartao`, `/personalizador-laminas`. **Públicas:** `contato.tur.br`, `vitrine.tur.br`, `lp.vitrine.tur.br`.
- **Estado:** CONFIRMADO.

## Vitrine de Ofertas
- `agency_showcases`, `showcase_items`, `showcase_auto_overrides`, `vitrine_categories`.
- Carrosséis horizontais por categoria.
- Auto mode com overrides drag-and-drop.
- Disclaimer padrão configurável.

## Cartão de Visitas
- `business_cards`, `business_card_stats`, `card_activations`.
- Wizard 5 passos. URL pública em `contato.tur.br`. QR Code.
- Edge Function `create-business-card` (rate limit 5/min). PDF interativo via html2canvas + jsPDF.
- Open Graph via `card-og-image`.

## Lâminas
- Personalizador de imagens promocionais.
- Salva no Media Manager (`media-files`).

## Evidências
`src/pages/MinhaVitrine.tsx`, `MeuCartao*.tsx`, `CriarCartao.tsx`, `PersonalizadorLaminas.tsx`, `src/components/showcase/*`, `src/components/card-wizard/*`, `src/lib/cardShareUrl.ts`, `src/lib/generateBusinessCardPdf.ts`.