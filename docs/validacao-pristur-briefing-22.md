# Pristur Viagens — briefing-22-v1

Prévia técnica: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-22-v1

## Escopo e isolamento
- Fixture local única com host `briefing-22-v1.preview.local`, UUID sintético exclusivo, slugs vazios e nenhum CNPJ/profile real importado. Vinculação real permanece pendente.
- Engine existente `AdsBriefingPreview` → `buildGoldStandardProfile` → `AgencySiteLayout`/`AgencySiteHome`; tema `siteBaseEditorial`. Sem clone ou alterações em gates, domínio, banco, acesso, cobrança ou tenants ativos.
- Wordmark textual; tons neutros equivalentes aos fallbacks compartilhados `wl-site-base`, não apresentados como marca oficial. Aviso permanente de marca/paleta/vinculação pendentes.
- Somente fatos autorizados do briefing, ano 2009, Priscila Vasconcelos e contatos públicos. Sem dados legais/residenciais, ofertas/preços, avaliações, equipe ou certificações inventadas. Imagens genéricas existentes; nenhuma imagem externa pesquisada ou baixada.
- Seções com alegações não autorizadas desativadas somente nesta fixture. Nenhuma página interna comercial ou gestão disponibilizada. Fluxos/CTAs externos e submits permanecem bloqueados pelo mecanismo existente.

## Evidência — 04/11/2026 UTC
- `bunx vitest run src/test/pristur-preview.test.tsx src/test/ads-briefing-preview.test.tsx src/test/gold-standard-template.test.ts`: **45 testes aprovados**, 3 arquivos; 13 testes focados na nova fixture.
- Testes: resolução exata, identidade sintética, tema/wordmark, dados públicos autorizados, seções não autorizadas desligadas, resolução preservada dos demais perfis, rejeição de cinco hosts públicos/não autorizados, rejeição de `/gestao`, bloqueio de chamadas de leitura/escrita, formulário, link comercial e `window.open`.
- Playwright no endereço real local `/ads-briefing-preview/briefing-22-v1`: título correto, home e FAQ renderizados; FAQ abre; clique no Instagram não sai da prévia. **Zero requests** para `/auth/v1`, `/rest/v1` ou `/functions/v1`, **zero erros JavaScript**.
- Desktop 1280×1800 e celular 390×844: wordmark e banner conferidos por screenshot; sem overflow horizontal na página ou rodapé; e-mail completo cabe no celular.
- Último sinal automático consultado: `build OK` em 2026-11-04T03:41:13Z.

## Limitações
- Os arquivos locais do banner/campanhas renderizam; o servidor localhost não entrega os pointers CDN `/__l5e/assets-v1` dos logos e imagens de Orlando (retorna fallback HTML). A renderização dessas mídias no host técnico hospedado permanece não verificada; os pointers existentes foram preservados, sem criar imagens substitutas ou buscar imagens externas.
- Testes de React emitem avisos `act(...)` já presentes na suíte; não há testes falhando.
- Nenhuma publicação, deploy ou chamada de escrita/configuração foi executada.