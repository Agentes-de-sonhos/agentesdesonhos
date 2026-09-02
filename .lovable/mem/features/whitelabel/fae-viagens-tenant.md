---
name: Tenant white label Faé Viagens
description: Site white label da Faé Viagens (faeviagens.com.br) — perfil faeCurated, tema wl-fae, hosts em construção sem cutover de DNS
type: feature
---

Hosts: `faeviagens.com.br` (primário) e `www.faeviagens.com.br`.
Slug: `fae-viagens`. Owner/user_id: `c74e800b-7843-4241-98ce-6026be5d2f01`.
Linhas em `agency_public_domains` ativas, com painel `/gestao` habilitado.
Sem publicação/cutover de DNS.

Engine única reutilizada (nenhum condicional de domínio no JSX):
- perfil `faeCurated` em `agencySiteProfile.ts` — ordem: signature, destinations,
  modules, highlights, differentials, about, concierge, faq, newsletter, offers.
  Desligados: dmc, testimonials, team, credentials (nada inventado).
- tema `faeEditorial` (`wl-editorial wl-fae`) em `agencySiteTheme.ts` + tokens em
  `index.css`: roxo profundo (primária), dourado quente nos detalhes, superfícies
  marfim, títulos Cormorant Garamond.
- logotipo oficial: `src/assets/whitelabel/logo-fae-viagens.png.asset.json`.
  `logoIncludesWordmark(hostname)` (metadado reutilizável) evita repetir o nome
  ao lado de logos que já contêm o wordmark (Faé e Paraíso).
- imagens editoriais próprias: `destino-norte-africa`, `destino-escandinavia`,
  `destino-grupos`, `hero-fae` (slots `norteafrica`, `escandinavia`, `grupos`, `fae`).

Status: ambos os hosts em `under_construction` (variante `default`). Só a home é
bloqueada; /orcamento, /roteiro, /carteira, /fatura, /ofertas e /area-do-cliente
seguem livres. Revisão da home completa apenas no host técnico de preview:
`?__agency_host=faeviagens.com.br&__agency_preview=1`.

Posicionamento factual: viagens sob medida, curadoria humana, grupos
acompanhados, cultura/natureza/gastronomia, trajetória desde 2003.
