# Página "Site em construção" por hostname (White Label)

## 1) Vínculo dos quatro hostnames

Consulta em `agency_public_domains` (somente leitura):

- `100limites.tur.br` — ativo, primário, `agency_slug: 100-limites-viagens`, user_id `9433421c…009e`
- `www.100limites.tur.br` — ativo, não primário, mesmo slug/user_id
- `paraisoviagens.com` — **não existe** na tabela
- `www.paraisoviagens.com` — **não existe** na tabela

Consequência: os dois domínios da Paraíso estão apontados para o projeto (domínio da hospedagem), mas não são reconhecidos como tenant. Hoje eles caem no app da plataforma (não no site white label), porque `get_agency_domain` retorna nulo e o gate libera as rotas normais.

A agência existe no cadastro: perfil "Paraiso Viagens" (Daniela Costa Garcez Baiao), user_id `d14b95d2…fb4f`, `public_slug: paraiso-viagens`.

## 2) Dados públicos devolvidos por `get_agency_domain`

Campos: `user_id, agency_slug, hostname, is_primary, agency_name, owner_name, logo_url, cover_image_url, primary_color, phone, city, state, bio, public_slug`.

| Dado | 100 Limites | Paraíso |
|---|---|---|
| agency_name | "100 Limites Viagens" | "Paraiso Viagens" |
| logo_url | existe | existe |
| city/UF | Palhoça / SC | Florianopolis / SC |
| phone | existe | existe |
| CNPJ / razão social | **não é devolvido pelo RPC** | idem |

Observação: a coluna `cnpj` existe em `profiles` e está preenchida nas duas agências, mas o RPC não a expõe hoje. Não existe campo de razão social. Para exibir CNPJ na página será preciso adicionar `cnpj` ao retorno do RPC (dado já público num rodapé comercial) ou configurá-lo de forma declarativa no arquivo de config.

## 3) Roteamento atual e ponto seguro do gate

Fluxo: `App.tsx` → `AgencyDomainGate` (resolve hostname; hosts da plataforma nem chamam a rede) → `AgencyDomainRoutes` que monta `BrowserRouter` com: `/`, `/area-do-cliente`, `/ofertas`, `/orcamento/:code`, `/roteiro/:code`, `/carteira/:code`, `/fatura/:code`, políticas/termos e `*`.

Ponto mais seguro: **dentro de `AgencyDomainRoutes`, apenas na rota `/`** (e opcionalmente `/ofertas`), trocando o elemento `AgencySiteHome` por `AgencyUnderConstruction`. Assim as rotas transacionais por código continuam intactas, pois não passam pelo gate de status.

Não colocar o gate em `AgencyDomainGate` nem antes do `BrowserRouter`: ali não há informação de rota e qualquer bloqueio derrubaria os links públicos.

## 4) Existe configuração de status/publicação por tenant?

Não. `agency_public_domains` tem apenas `hostname, user_id, agency_slug, is_primary, is_active`. `is_active` é liga/desliga do domínio (desligar faz o host cair no app da plataforma, não numa página de construção). Não há coluna de status editorial/publicação.

## 5) Implementação mínima e reutilizável proposta

1. `src/lib/agencySiteStatus.ts` — config declarativa por hostname:
   ```ts
   type AgencySiteStatus = "live" | "under_construction";
   const STATUS_BY_HOST: Record<string, { status: AgencySiteStatus; cnpj?: string }>
   ```
   Entradas iniciais: `paraisoviagens.com`, `www.paraisoviagens.com`, `100limites.tur.br`, `www.100limites.tur.br` como `under_construction`. Normalização de host reaproveitada (mesmo padrão de `agencySiteTheme.ts`). Default: `live` — nenhum outro tenant é afetado.
2. `src/pages/whitelabel/AgencyUnderConstruction.tsx` — página responsiva, tokens semânticos, sem marca Agentes de Sonhos: logo da agência (fallback: inicial do nome), nome, mensagem "Estamos preparando nosso novo site", cidade/UF, CNPJ quando configurado, rodapé com ano e nome da agência. `<title>`/meta description por tenant e `noindex` enquanto em construção.
3. `AgencyDomainRoutes.tsx` — na rota `/`, renderizar `AgencyUnderConstruction` quando o status do hostname for `under_construction`; caso contrário, `AgencySiteHome` como hoje. Nenhuma outra rota muda.
4. Paraíso: para o site aparecer nesses domínios é preciso **cadastrar os dois hostnames** em `agency_public_domains` para o user_id `d14b95d2…fb4f` (migration/dado, feita só quando você autorizar). Sem isso, os domínios continuam abrindo o app da plataforma.
5. Opcional (se quiser CNPJ vindo do banco em vez de config): expandir `get_agency_domain` com `cnpj` e o tipo `AgencyDomainInfo`.

## 6) Preservação das rotas transacionais e ausência de deploy

- O gate vive só no elemento da rota `/`; `/orcamento/:code`, `/roteiro/:code`, `/carteira/:code`, `/fatura/:code` permanecem exatamente como estão, incluindo o `agency_slug` derivado do domínio.
- Testes de rota/hostname a adicionar em `src/test/` cobrindo: hosts em construção, hosts `live` intocados e status irrelevante para rotas de código.
- Trabalho apenas em preview: sem publicar, sem deploy de Edge Functions, sem migration e sem alteração de dados nesta etapa. O cadastro dos hostnames da Paraíso e a mudança do RPC ficam como passos separados, sob autorização explícita.

Nada foi alterado nesta inspeção.
