# Domínio próprio da agência: 100limites.tur.br

Objetivo: fazer `100limites.tur.br` e `www.100limites.tur.br` servirem o site público da agência **100 Limites Viagens** e passar a gerar os links públicos dessa conta nesse domínio — de forma aditiva, sem tocar em autenticação, RLS existente ou nos domínios genéricos atuais.

## O que já existe (verificado)

- Toda a resolução pública é feita no cliente por hostname (`src/App.tsx`, `PublicCodeResolver`, `SlugResolver`, `ProductLandingResolver`, `CarteiraOrVitrineResolver`).
- Os RPCs públicos já são escopados por agência: `get_quote_by_public_code(p_agency_slug, p_code)`, `get_itinerary_by_public_code`, `get_trip_by_public_code`, `get_invoice_by_public_code`. Isso já bloqueia acesso cruzado entre agências — serão reutilizados sem alteração.
- O "site whitelabel" existente da agência é a **Vitrine** (`agency_showcases` + `VitrinePublica`, hoje em `vitrine.tur.br/:slug`). Não haverá site paralelo: no domínio próprio a home passa a renderizar a Vitrine da agência.
- A agência já tem `public_slug = 100-limites-viagens`, logo e telefone em `profiles`.
- Hoje não existe nenhuma tabela de domínios por agência — é a peça que falta.

## Mapeamento hostname → agência

Nova tabela `public.agency_public_domains`:

- `hostname` (único, minúsculo), `user_id` (dono da agência), `agency_slug`, `is_primary`, `is_active`, timestamps.
- Seed: `100limites.tur.br` (primary) e `www.100limites.tur.br` (alias), ambos apontando para `9433421c-…b009e` / `100-limites-viagens`.
- Leitura pública apenas via RPC `get_agency_domain(p_hostname text)` (SECURITY DEFINER, STABLE) devolvendo `{ user_id, agency_slug, agency_name, logo_url, phone, city, is_primary }` — sem expor e-mail ou outros campos sensíveis. A tabela fica com RLS restrita (dono/admin leem; escrita só por admin).
- Cache leve no cliente (React Query, staleTime longo) para não repetir a chamada em cada rota.

Sem hardcode espalhado: a única entrada nova em código é o helper que consulta esse RPC. Novas agências entram com uma linha na tabela + domínio apontado no painel.

## Rotas no domínio da agência

Um resolver único (`src/components/routing/AgencyDomainGate.tsx`) decide o comportamento quando o hostname é um domínio de agência:

```text
/                      -> Vitrine pública da agência (VitrinePublica com slug do domínio)
/orcamento/:codigo     -> OrcamentoPublicoV2  (agency_slug vem do domínio)
/roteiro/:codigo       -> RoteiroPublicoV2
/carteira/:codigo      -> CarteiraPublicaV2
/fatura/:codigo        -> FaturaPublica
qualquer outro         -> fallback seguro ("link indisponível"), sem cair na landing da plataforma
```

Compatibilidade preservada: nos outros hosts, `/orcamento/:token`, `/roteiro/:token`, `/c/:slug`, `/viagem/:token`, `/fatura/:agencySlug/:code`, `/:slug/ofertas` e `/:agencySlug/:accessCode` continuam exatamente como hoje. `/orcamento/:x` e `/roteiro/:x` passam a ser bifurcados por host (comportamento novo só no domínio da agência).

## Geração de links

Novo módulo `src/lib/agencyPublicLinks.ts` + hook `useAgencyPublicDomain()`:

- Se a agência logada tiver domínio primário ativo, os builders retornam `https://<domínio>/orcamento/<código>`, `/roteiro/<código>`, `/carteira/<código>`, `/fatura/<código>`.
- Caso contrário, mantêm o comportamento atual (`seuorcamento.tur.br`, `seuroteiro.tur.br`, `carteiradigital.tur.br`, `/fatura/:slug/:code`).
- Pontos atualizados: `src/lib/orcamento-domain.ts`, `roteiro-domain.ts`, `carteira-domain.ts` (parâmetro opcional de domínio) e chamadores `GerarOrcamento.tsx`, `CriarRoteiro.tsx`, `TripWalletList.tsx`, `ShareTripModal.tsx`, `InvoicesManager.tsx`. `AdminUserProjectsManager` resolve o domínio pela agência do projeto.
- Links já compartilhados não mudam: os antigos seguem válidos nos domínios genéricos.

## Como evitamos exposição cruzada

1. O código público nunca é buscado sem `agency_slug`; no domínio próprio esse slug vem **do domínio**, não da URL.
2. Código de outra agência → o RPC não retorna nada → tela de "link indisponível" no padrão visual atual, sem redirecionar para outro domínio.
3. A Vitrine na home só carrega o showcase do `user_id` vinculado ao hostname.
4. Nenhuma RLS de tabela existente é alterada; só a nova tabela e um RPC de leitura restrita.

## Validação

- Testes unitários novos: mapa hostname→agência (root, www, host desconhecido, host inativo) e builders de link (com e sem domínio próprio).
- Verificação em preview com override de host cobrindo: home = Vitrine da 100 Limites; orçamento/roteiro/carteira/fatura válidos abrindo; código de outra agência rejeitado; rota inexistente com fallback; não-regressão em `seuorcamento.tur.br`, `seuroteiro.tur.br`, `carteiradigital.tur.br`, `vitrine.tur.br` e `/fatura/:slug/:code`.
- `tsgo` + suíte de testes relacionada.
- Publicação: nada vai a produção nesta etapa. O domínio precisa ser conectado em Configurações do Projeto → Domínios (root + `www`); depois da aprovação, publica-se para o domínio servir o app.

## Ordem de execução

1. Migração: tabela `agency_public_domains` + GRANTs + RLS + RPC `get_agency_domain` + seed da 100 Limites.
2. `src/lib/agencyDomains.ts` (resolução/cache) e `useAgencyPublicDomain()`.
3. `AgencyDomainGate` + ajustes de rota em `App.tsx`.
4. Builders de link e chamadores.
5. Testes + validação em preview.

## Suposições

- A home do domínio da agência é a Vitrine existente (`agency_showcases`). Se a expectativa for outra página institucional, aviso antes de implementar.
- O domínio já está/será conectado ao projeto no painel; sem isso o DNS não resolve para o app.