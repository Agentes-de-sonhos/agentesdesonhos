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
- Vermelho do preset editorial = `#F40000` (`hsl(0 100% 48%)`) em `--primary`/`--ring`/`--wl-red`; usado em ícones, kickers, estados ativos e CTAs secundários.
- CTAs de comando ("Atendimento" no header, "Solicitar cotação") em grafite `--wl-ink` com texto branco.
- Botões "Falar no WhatsApp" em verde acessível `--wl-whatsapp: 152 62% 30%` com texto branco.
- Rodapé editorial voltou ao grafite escuro com texto branco e logo dentro de cartão branco.
- Cards de "Destaques" todos brancos (sem alternância de cinza) com hover de elevação/sombra (motion-safe, md+).
