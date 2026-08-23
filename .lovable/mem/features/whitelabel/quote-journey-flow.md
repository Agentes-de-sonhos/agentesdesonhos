---
name: White-label Quote Journey Flow
description: Assistente em modal único da solicitação nos sites white label (primary → pick → additional → contact), com ocorrências múltiplas e sem etapa de revisão
type: feature
---
Fluxo único no mesmo modal (`AgencyQuoteJourney`), estados: `primary` (complemento do serviço clicado) → `pick` ("Quais outros serviços você deseja incluir?", multi-seleção) → `additional` (um serviço por vez) → `contact`, que já envia.

Regras:
- NÃO existe intersticial "Estamos preparando sua solicitação" (`ServiceRequestTransition` removido) nem tela de revisão. Clicar em "Solicitar" abre o assistente direto.
- Primeira dobra nunca é alterada nem repetida; seus dados entram preenchidos.
- Campos essenciais por serviço em `ESSENTIAL_FIELDS`; Aéreo = adultos, crianças, idades, flexibilidade, classe, observações.
- Todo serviço tem ação inline "+ Adicionar outro X" (`agencyJourneyOccurrences.ts`): ocorrências numeradas ("Hospedagem 1/2"), removíveis; extras herdam só os viajantes.
- Payload: 2ª ocorrência em diante recebe sufixo `_2`, `_3` para não quebrar solicitações antigas.
- Contato: nome + WhatsApp OU e-mail + consentimento. CTA final "Enviar solicitação".
- Rascunho em `sessionStorage` por hostname+serviço: voltar, fechar e reabrir não perde dados.
- UI: superfície branca única, backdrop escurecido, "Etapa X de Y", tokens do tema da agência (sem cor hardcoded), rodapé fixo com safe-area no mobile.
