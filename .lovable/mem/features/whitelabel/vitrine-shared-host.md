---
name: Vitrine shared host (Sites ADS)
description: vitrine.tur.br/{agency_slug} como domínio compartilhado canônico dos Sites ADS, com fallback para a Vitrine de Ofertas
type: feature
---
`vitrine.tur.br` é o host CANÔNICO dos Sites ADS (`www.` redireciona para o apex em `src/main.tsx`).

- `/{agency_slug}` abre o site white label completo quando a agência tem Sites ADS ativo; caso contrário mantém a Vitrine de Ofertas atual (fallback para as rotas da plataforma em `AgencyDomainGate`).
- Rotas filhas sob o slug: `/ofertas`, `/gestao/*`, `/area-do-cliente/*`, `/orcamento/:codigo`, `/roteiro/:codigo`, `/carteira/:codigo`, `/fatura/:codigo`.
- **Sinal de "Sites ADS ativo"** (escolha documentada): existência de linha ativa em `agency_public_domains` com aquele `agency_slug`, resolvida no servidor por `get_agency_by_slug` — a mesma fonte usada pela gestão Sites ADS. Nunca hardcode de slug/nome.
- `sites.agentesdesonhos.com.br` continua como host técnico interno e é sempre noindex; no host canônico o noindex vale só para áreas privadas/técnicas (`shouldNoindexAgencyPath`).
- Prefixo de rotas/links vem de `agencyRouteBasePath` + `agencySiteHref`; domínios próprios seguem sem prefixo e `?__agency_host` continua válido só em hosts técnicos.
