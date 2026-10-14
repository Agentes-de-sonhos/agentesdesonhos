# Validação — Bardelli apresentação completa

## Entrega
URL: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/bardelli-completa-v1

Matriz completa de origem, composição e estados: `docs/padrao-ouro-sites.md`. Perfil isolado `bardelliPresentation`, hostname sintético `bardelli-presentation.preview.local`; nenhum registro ou integração real alterado. Raiz/domínios/gestão/senha da Bardelli preservados. Não houve publicação ou deploy.

## Verificações
- `bunx vitest run src/test/gold-standard-template.test.ts src/test/ads-briefing-preview.test.tsx src/test/agency-dmc-100-limites.test.ts src/test/us-visa-landing.test.tsx src/test/us-visa-home-teaser.test.tsx src/test/agency-google-reviews.test.tsx src/test/agency-resorts-section.test.tsx src/test/xcaret-landing-render.test.tsx src/test/xcaret-booking-bar.test.tsx`: **9 arquivos, 48 testes aprovados**.
- Teste legado do fechamento Xcaret atualizado para a posição do selo já aprovada anteriormente; nenhum selo real removido/alterado na Ju.
- Compilação automática do harness: `build OK` no sinal disponível; não executado build/typecheck manual conforme regras do ambiente.
- Referências extraídas `EDITORIAL_ROSE` e `EDITORIAL_DMC` comparadas por conteúdo com `git show a64d6d66b:src/lib/agencySiteProfile.ts`: ambos os objetos idênticos. Apenas extração para evitar importação circular de conteúdo.
- Playwright Chromium local: desktop 1440×1100 e mobile 390×844. Assets da infraestrutura CDN encaminhados no harness de teste para o hostname técnico deste projeto; sem editar URLs do app.
- Home: seções Xcaret, Orlando, visto, destinos, momentos, resorts, cruzeiros, Portugal, Sobre, diferenciais, credenciais, equipe, atendimento, avaliações, FAQ, newsletter, ofertas presentes; carrossel de campanhas também renderizado (sem `section[id]`).
- Imagens Xcaret, cruzeiros, Sobre e avaliações sem arquivos quebrados; galeria/cruzeiros e avaliações inspecionados visualmente. O play Xcaret no mobile foi reposicionado só na apresentação para não cobrir o texto; ausência de sobreposição confirmada por posições renderizadas e screenshot.
- Páginas: home, Xcaret, visto, Portugal, resorts, resort Arcobaleno, ingressos, blog, artigo Portugal e ofertas abriram sem erro. Nenhuma menção a Juliana/Amanda/Destinos com a Ju/100 Limites no texto renderizado destas páginas.
- Pop-up B1/B2 abriu com conteúdo neutro Bardelli; nenhuma referência a Amanda/100 no formulário.
- Carrinho Portugal: inserir Grupos com 15/12/2026, ler item no carrinho, preencher contato de exemplo e clicar enviar; item/data lidos, envio bloqueado, zero requisições ao backend. Item editor local é a única submissão permitida; checkout tem também guard explícito próprio.
- Link “Voltar ao site” da página Xcaret navegou para a URL técnica da apresentação, não para o site real.
- Zero erros JavaScript e zero requisições REST/funções do backend nas páginas verificadas. Nenhum JSON-LD de avaliação ou nota; zero scripts JSON-LD na apresentação testada.
- Mobile: sem overflow horizontal em home, Xcaret, visto e Portugal. Avaliações claramente rotuladas como exemplo, sem estrelas, nota, Google Maps ou atribuição real.
- Testes da allowlist recusam domínio real com/sem www, domínio publicado, outro tenant, outro preview, www técnico, prefixos/sufixos enganosos. O helper global não foi alterado.

## Arquivos
- Modelo/referências/identidade: `src/lib/goldStandardSiteTemplate.ts`, `src/lib/agencyReferenceProfiles.ts`, `src/lib/agencySiteProfile.ts`, `src/lib/adsBriefingPreview.ts`, `src/lib/agencySiteTheme.ts`.
- Apresentação e navegação: `src/pages/adsPreview/AdsBriefingPreview.tsx`, `src/components/whitelabel/AgencyPresentationPages.tsx`, `src/components/whitelabel/AgencySiteLayout.tsx`, `src/hooks/usePresentationTextRewrite.ts`.
- Home/continuidade: `src/pages/whitelabel/AgencySiteHome.tsx`, `XcaretLandingPage.tsx`, `UsVisaLandingPage.tsx`, `DmcPortugalLandingPage.tsx` (estes três no mesmo diretório).
- Seções: `src/components/whitelabel/AgencyGoogleReviewsSection.tsx`, `DmcRequestCart.tsx`, `UsVisaHomeTeaser.tsx`, `UsVisaProposalDialog.tsx`; `src/components/resorts-brasil/AgencyResortsSection.tsx`; `src/components/orlando/OrlandoEditorialGallery.tsx`, `OrlandoTicketsSection.tsx`.
- Acabamento exclusivo: `src/index.css` (seletores `data-ads-preview="bardelli-completa-v1"`).
- Assets CDN novos: `src/assets/presentation/cruise-company-{0..4}.webp.asset.json`, `xcaret-presentation.jpg.asset.json`. Montagem mantém proporção 1223×827 e quatro fotos pertinentes de produto, sem foto pessoal/selo.
- Testes: `src/test/gold-standard-template.test.ts`, `agency-dmc-100-limites.test.ts`, `xcaret-landing-render.test.tsx`.
- Regras/documentação: `AGENTS.md`, `docs/padrao-ouro-sites.md`, este relatório, `roadmap.md`, memória persistente do modelo completo.

## Pendências reais e limites
Antes de promover qualquer conteúdo ao site real, Fernando/agência precisam confirmar serviços/capacidades Portugal, equipe, certificados, ofertas, textos legais e eventuais depoimentos reais. A apresentação não ativa esses serviços nem cria registros. O blog e ofertas possuem continuidade editorial local ilustrativa, não integração nova; área do cliente/legal preservam limites e não exibem dados privados. Não foi testada gestão autenticada, porque esta entrega não altera gestão nem conta.

A URL técnica usa o código de revisão do projeto; nenhum teste removeu/descobriu/contornou a senha real de `/preview`. Interações comerciais permanecem deliberadamente bloqueadas, inclusive WhatsApp, leads, newsletter e checkout. A verificação visual foi no harness local, não no domínio publicado.
