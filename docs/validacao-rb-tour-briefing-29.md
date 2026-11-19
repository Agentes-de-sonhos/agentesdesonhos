# RB TOUR — ADS_JOB:briefing-29-v1

## Resumo
Uma apresentação técnica local, completa e revisável, sem vinculação de identidade. Reutiliza `buildGoldStandardProfile`, `AdsBriefingPreview`, `AgencySiteLayout`, `AgencySiteHome` e os catálogos existentes. Nenhum componente, projeto ou engine foi clonado.

URL: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-29-v1

## Isolamento
- Chave exata `briefing-29-v1`; hostname sintético `briefing-29-v1.preview.local`; UUID local reservado `00000000-0000-0000-0000-00000000ad29`, sem registro correspondente criado/consultado.
- Slug vazio, public_slug null, is_primary false; domínio rbtour.com.br não registrado nem mapeado.
- `presentation: true`, `demo: false`, `strictBackendBlock: true`, noindex/nofollow; allowlist existente do host técnico exato, localhost e 127.0.0.1, sem mudança nos gates.
- Entrada adicionada à seleção existente anterior aos providers de tenant/auth/cobrança. Nenhuma consulta autenticada, escrita, RPC, função, registro, domínio, permissão, cobrança, publicação ou deploy executado.
- Proteções compartilhadas intactas: fetch do backend rejeitado, abertura externa recusada, submissões capturadas e hook de pedidos recusa o hostname sintético. Links internos ficam no prefixo técnico.
- Logo CDN enviado por Fernando e favicon raster quadrado com proporções preservadas; favicon associado somente ao hostname sintético. Favicon global/index.html preservados para não alterar outros tenants.

## Conteúdo aplicado
Nome, frase, posicionamento, promessa, trajetória desde 1997 e criação em 2004, Regis Brissi, Barueri/SP, canais e contatos públicos, especialidades, perfis, prioridades e diferenciais informados no briefing.

Três slides; central compartilhada de oito serviços sem envio; assinatura editorial; seis especialidades; cinco destinos; três momentos de viagem; Sobre em três parágrafos; quatro diferenciais; quatro etapas de atendimento; sete FAQs; newsletter demonstrativa; rodapé. Xcaret, Orlando, visto americano, resorts, cruzeiros, Portugal ilustrativo, ofertas de inspiração e blog preservam o inventário compartilhado. Club Med e neve tem acesso no submenu.

Cadastur `26.005703.10.0001-1` renderizado apenas como texto na seção compartilhada de credenciais, sem selo, certificado, imagem ou consulta documental. Equipe nominal/fotos e avaliações desativadas; não há fotos pessoais, avaliações ou certificações atribuídas à agência. Catálogos identificados como inspiração, sem preços ou disponibilidade fictícios. Sem CPF, CNPJ, endereço residencial ou dados contratuais. Mídias de produtos reaproveitadas do acervo, sem importar URLs do briefing.

## Testes e conferência — 19/11/2026
- `bunx vitest run src/test/rb-tour-preview.test.tsx src/test/roteiros-da-terra-preview.test.tsx src/test/viaje-na-magia-preview.test.tsx`: **23/23 aprovados** (9 RB TOUR + 14 regressões).
- RB TOUR: chave/rota exata, entrada anterior aos providers, paleta/terciária derivada/favicon isolado, identidade sintética sem slug, conteúdo sem dados privados, Cadastur textual, inventário completo, referências Ju/100 Limites preservadas, rejeição de produção/domínios enganosos, recusa de pedidos e bloqueios de GET/POST/RPC/funções/formulários/links externos, noindex/nofollow.
- Catálogo antigo `preview-catalog-navigation.test.tsx`: **19/20 aprovados** em execução isolada; teste da temporada Arena não encontra o título esperado. Na execução combinada, 18/20 passaram. Falha fora deste job; arquivos de catálogo/temporada/gates não alterados.
- Build automático: última entrada observada **build OK**.
- Playwright localhost 1280×1800 e 390×844: RB TOUR renderiza, FAQ expande, aba Hospedagem selecionável e Revisar sem envio; navegação pelo menu até /ofertas; e-mail bloqueado; Cadastur textual presente; /resorts-brasil, /club-med-neve, /ofertas e /blog mantêm a fixture e o prefixo. Zero chamadas ao backend e zero erros JavaScript. Celular sem overflow horizontal.

## Limitações
- Host hospedado respondeu HTTP 401 sem sessão/permissão Lovable; acesso ao conteúdo hospedado não foi validado.
- CDN `/__l5e/assets-v1/` não entrega várias imagens no localhost: 25 imagens não carregadas na home, incluindo logo e banners. Pointer gerado pelo CLI; logo e banners não puderam ser confirmados visualmente no host hospedado. Fotos do catálogo Club Med carregaram no teste local. Não substituídas por imagens artificiais ou URLs externas.
- Formulários deliberadamente não gravam nada; não há teste de recebimento real, pois é proibido neste job. Cadastro, vínculo de conta/domínio e qualquer ativação futura exigem autorização e entrega separadas.

## Arquivos
- `src/App.tsx`
- `src/lib/adsBriefingPreview.ts`
- `src/lib/agencySiteBrand.ts`
- `src/lib/agencySiteProfile.ts`
- `src/lib/agencySiteTheme.ts`
- `src/assets/ads-preview/briefing-29-v1-logo.png.asset.json`
- `public/rb-tour/favicon.png`
- `src/test/rb-tour-preview.test.tsx`
- `docs/validacao-rb-tour-briefing-29.md`
- `roadmap.md`

Decisão arquitetural já coberta pelas regras ADS e branding do AGENTS.md; nenhuma nova engine ou gate introduzido.