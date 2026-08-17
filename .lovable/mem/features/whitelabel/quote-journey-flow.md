---
name: White-label Quote Journey Flow
description: Máquina de estados do pop-up de cotação dos sites white label (primary → pick → additional → contact → review) e campos essenciais por serviço
type: feature
---
Fluxo único no mesmo modal (`AgencyQuoteJourney`), estados em `src/lib/agencyJourneyFlow.ts`:
`primary` (complemento do serviço da primeira dobra) → `pick` (cards quadrados multi-seleção; clicar só marca) → `additional` (um serviço por vez, "Serviço N de M") → `contact` → `review` (opcional, com Editar por seção e inclusão tardia de serviços).

Regras:
- Primeira dobra (ServiceInitialFields/TravelersFields/TripDatePicker/LocationSearchInput/DestinationTagsInput) nunca é alterada; seus dados entram preenchidos e não são pedidos de novo.
- Campos essenciais por serviço em `ESSENTIAL_FIELDS`; Aéreo = adultos, crianças, idades, flexibilidade (obrigatória), classe, observações. Bagagem e voo direto não são pedidos (seguem no schema/payload).
- Serviços adicionais não repetem viajantes/idades nem dados herdados; só campos obrigatórios ausentes + essenciais.
- Contato: nome obrigatório + ao menos WhatsApp OU e-mail + consentimento. Canal preferido e melhor horário não aparecem (derivados no payload para compatibilidade).
- Navegar dentro do modal nunca fecha nem apaga dados.
