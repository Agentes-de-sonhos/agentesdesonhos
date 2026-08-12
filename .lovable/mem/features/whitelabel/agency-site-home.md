---
name: White-label Agency Site Home
description: Home do site white label da agência (100limites.tur.br) — hero/carrossel, Central de Solicitações de 8 serviços e integração segura com o CRM
type: feature
---
# Site white label da agência — Home

## Estrutura
- Rotas em `AgencyDomainRoutes` (hostname → agência via `get_agency_domain`): `/`, `/ofertas`, `/area-do-cliente`, `/orcamento|roteiro|carteira|fatura/:codigo`, privacidade e termos.
- Home: `src/pages/whitelabel/AgencySiteHome.tsx` — hero/carrossel (1–5 banners, respeita `prefers-reduced-motion`) + card branco da **Central de Solicitações** avançando sobre o banner.
- Seções, módulos temáticos, destaques, diferenciais e FAQ centralizados em `src/lib/agencySiteConfig.ts` (`resolveSections`/`resolveModules` permitem ativar/ocultar/ordenar por agência). Nada hardcoded nas seções.
- "Ofertas em destaque" só aparece se existir `agency_showcases` ativa para o slug da agência; `/ofertas` continua existindo.

## Central de Solicitações
- `src/components/whitelabel/AgencyRequestCenter.tsx`: 8 abas (aéreo, hospedagem, carro, transfer, ingressos, seguro, cruzeiros, pacotes), formulário em 2 etapas (dados da viagem → contato) com resumo antes do envio.
- Schemas declarativos + validação em `src/lib/agencySiteRequests.ts`. Exige nome, consentimento e **WhatsApp OU e-mail**. Valores preservados por serviço ao trocar aba/etapa.

## Integração CRM (segura)
## Preset visual (Rodada 1)
- `src/lib/agencySiteTheme.ts`: `resolveSiteTheme(hostname)` → `classic` (todos os tenants) ou `travelEditorial` (apenas `100limites.tur.br` / `www.100limites.tur.br`).
- Tokens do preset em `src/index.css` (`.wl-editorial`, `--wl-navy`, `--wl-sand`, fonte Manrope); a classe é aplicada na raiz por `AgencySiteLayout`.
- No preset editorial: cabeçalho alto sem bordas, hero editorial, cotação rápida com abas maiores, DMC como faixa navy em 2 colunas, destinos em grid editorial e Destaques com ícone semântico por card (rota/avião/escudo). Sem "título + tracinho".
- Rodada 2 (editorial): Experiências e campanhas viraram rail fotográfico 4:5 com scroll-snap (`AgencyCampaignRail`, imagem por módulo definida em `DEFAULT_MODULES.image`); Sobre em 2 colunas com número destacado extraído do próprio bio; Diferenciais em lista editorial 2 colunas com ícone semântico único (`DEFAULT_DIFFERENTIALS.icon`); Atendimento humano em 2 colunas com passos numerados sobre faixa areia.
- Rodada 3 (editorial, fechamento): FAQ em 2 colunas (coluna lateral sticky com orientação + CTA WhatsApp real, accordion sem cards, divisores discretos); bloco "Receba novidades" virou faixa areia com painel navy e o mesmo CTA `openRequest("pacotes")`; rodapé editorial em 4 colunas (identidade, navegação, atendimento, legal) sobre navy, usando apenas dados reais do perfil (logo, cidade/UF, telefone, WhatsApp) e ano dinâmico.
- Textos institucionais vindos do perfil passam por `normalizeInstitutionalText` (remove emojis e converte Unicode estilizado para ASCII) antes de aparecer no site.
- Rodada 4 (identidade vermelha): o preset editorial usa o vermelho do logotipo (`--primary: 0 72% 42%`, `--wl-red`) com grafite neutro (`--wl-navy: 220 10% 14%`), areia e branco. Nada de hex azul nos componentes. Faixa própria para a cotação (HERO → COTAÇÃO → DMC, sem margem negativa), categorias em linha única com rail e setas, rails sem scrollbar via classe `.wl-rail` e rodapé claro em areia com logo em cartão branco.

- Envio via Edge Function `submit-agency-site-request` (rate limit por IP, honeypot, tempo mínimo 3s, idempotência) → RPC `submit_agency_site_request(p_hostname, p_payload)` (apenas `service_role`).
- O tenant vem SEMPRE do hostname no servidor; o browser nunca escolhe `agency_id`/`user_id` nem grava em `clients`/`opportunities`.
- Persistência em `agency_site_requests`; cliente/oportunidade criados por `ensure_client_and_opportunity_for_lead` (dedupe por telefone normalizado, oportunidade na primeira coluna do funil).
- Limitação atual: não há e-mail automático de notificação para este canal (as tabelas de notificação existentes são vinculadas a `form_id`/landing).

## Rodada 5 (ajustes finais de cor)
## Rodada 6 (primeira dobra editorial)
- Hero compacto (`md:min-h-[500px]`), conteúdo em bloco à esquerda `md:max-w-[60%]`, scrim horizontal (esquerda escura, direita da foto visível) + leve gradiente inferior.
- Central de Solicitações sobrepõe a base do hero: `-mt-10 sm:-mt-14 md:-mt-[80px] lg:-mt-[100px]` com `z-10` na faixa areia; sem faixa areia vazia entre hero e card.

- Vermelho do preset editorial = `#F40000` (`hsl(0 100% 48%)`) em `--primary`/`--ring`/`--wl-red`; usado em ícones, kickers, estados ativos e CTAs secundários.
- CTAs de comando ("Atendimento" no header, "Solicitar cotação") em grafite `--wl-ink` com texto branco.
- Botões "Falar no WhatsApp" em verde acessível `--wl-whatsapp: 152 62% 30%` com texto branco.
- Rodapé editorial voltou ao grafite escuro com texto branco e logo dentro de cartão branco.
- Cards de "Destaques" todos brancos (sem alternância de cinza) com hover de elevação/sombra (motion-safe, md+).

## Ciclo de vida da home (status por hostname)
- `src/lib/agencySiteStatus.ts` é a ÚNICA fonte de verdade: `resolveSiteStatus(hostname)` → `live` (default) ou `under_construction`; opcionalmente um `cnpj` de fallback por host. Para liberar um site, basta remover o host do mapa — nenhum condicional espalhado em componentes.
- Em `under_construction`, `AgencyDomainRoutes` renderiza `src/pages/whitelabel/AgencyUnderConstruction.tsx` SOMENTE na rota `/`, fora do `AgencySiteLayout` (sem cabeçalho/menu/rodapé do site completo). Todas as outras rotas continuam dentro do layout via rota-pai com `Outlet`.
- O status governa apenas a home: `/orcamento/:code`, `/roteiro/:code`, `/carteira/:code`, `/fatura/:code`, `/area-do-cliente`, `/ofertas`, privacidade e termos nunca são bloqueados. O gate NÃO fica em `AgencyDomainGate`.
- Página temporária: identidade só da agência (nunca "Agentes de Sonhos"), logo com fallback de inicial, cidade/UF, CNPJ formatado (`formatCnpj`), CTA WhatsApp, rodapé com © ano + nome + CNPJ, `title`/description por agência e `<meta name="robots" content="noindex,nofollow">` inserida e removida no cleanup (não contamina outras rotas SPA).
- `get_agency_domain` passou a devolver `cnpj` (de `profiles.cnpj`); `AgencyDomainInfo.cnpj` reflete isso. Não existe campo de razão social.
- Hosts em construção hoje: `100limites.tur.br`, `www.100limites.tur.br`, `paraisoviagens.com`, `www.paraisoviagens.com`.
- PENDÊNCIA Paraíso Viagens: os hostnames `paraisoviagens.com`/`www.paraisoviagens.com` ainda NÃO estão em `agency_public_domains` (owner `d14b95d2…fb4f`, slug `paraiso-viagens`). Enquanto não forem cadastrados, esses domínios abrem o app da plataforma. O cadastro só deve ser feito DEPOIS de publicar o frontend com o gate de construção já ativo.

## Perfis editoriais + tema (engine única)
- Três camadas separadas: PERFIL (`src/lib/agencySiteProfile.ts`: seções, ordem, conteúdo), TEMA (`agencySiteTheme.ts`: tokens/fontes) e DADOS REAIS do cadastro. `AgencySiteHome` continua sendo a única engine — proibido duplicar a home por tenant.
- `AgencySiteProfileKey = "classic" | "editorialDmc" | "luxuryCurated"`; `resolveProfileKey(hostname)`. 100limites → `editorialDmc`; paraisoviagens.com → `luxuryCurated`.
- `AgencySiteThemeKey` ganhou `"luxuryEditorial"`; `siteThemeRootClass(hostname)` devolve `""`, `wl-editorial` ou `wl-editorial wl-luxury`. `.wl-luxury` (index.css) é camada fina: marinho, sálvia, marfim, radius 0.25rem, títulos Cormorant Garamond e corpo/formulários Manrope.
- `resolveSections` aceita `boolean` (legado) OU `{enabled, order}`; `resolveModules`/`resolveDestinations` aceitam conjunto próprio por perfil. Seções genéricas novas: `signature` e `credentials` (off por padrão).
- Paraíso: sem DMC, sem depoimentos, sem equipe; ordem signature → destinos → coleções → destaques → diferenciais → história → credenciais (Luxperts) → concierge → FAQ → newsletter → ofertas (nunca lidera). Redação prudente: 1997 sem atribuir fundação a Mariana/Daniela, sem VIP/upgrades, sem preços.
- Preview seguro: `isConstructionPreviewBypass(actualHostname, search)` só libera a home em construção em hosts técnicos (`id-preview--*`/`preview--*.lovable.app` e localhost) com `?__agency_preview=1`. Nunca nos domínios reais nem no publicado. `STATUS_BY_HOST` permanece intacto.
