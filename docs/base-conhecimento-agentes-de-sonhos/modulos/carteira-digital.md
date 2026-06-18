# Módulo: Carteira Digital

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota interna:** `/ferramentas-ia/trip-wallet[/id]` · **Pública V2:** resolvida por `PublicCodeResolver` em `carteiradigital.tur.br` · **Legada:** `/c/:slug` e `/viagem/:token`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Dados da viagem (`trips`), passageiros (`travelers` + `traveler_documents`).
- Serviços por categoria: aéreo, hospedagem, transfer, passeio, ingresso, seguro, locação (`trip_services`).
- Roteiro dia a dia integrado (`trip_itinerary_activities`, `trip_itinerary_period_images`).
- Documentos/vouchers em bucket privado, servidos via `serve-voucher` ou `get-secure-voucher`.
- PWA instalável (`wallet-manifest.json`).
- Carteira pública pode ter senha; bloqueio após 3 tentativas inválidas.
- Cards destacados: **Próximo Serviço Contratado**, **Próxima Atividade do Roteiro**, **Meu Orçamento**, **Checklist da Viagem**, **Conversor de Medidas**, **Calculadora de Gorjeta**.
- Categorias com muitos itens usam `CategoryServiceView` (resumo + cards).
- Reminders (`trip_reminders`) e popups baseados na data da viagem.
- Importação de documentos por IA para criar serviços (`import-hotel-document`, `import-airfare-document`, etc.).

## Regras
- Cliente obrigatório.
- Carteira é a SOT da experiência do viajante.
- Datas calculadas em timezone local (parsing manual `YYYY-MM-DD`).
- Sessão da carteira pública não compartilha com `app.agentesdesonhos.com.br`.

## Evidências
`src/pages/TripWallet.tsx`, `CarteiraPublica*.tsx`, `ViagemPublica.tsx`, `src/components/wallet/*`, `src/components/wallet/category/*`, `src/components/trip/*`, `src/lib/carteira-domain.ts`, `src/lib/secureVoucher.ts`.