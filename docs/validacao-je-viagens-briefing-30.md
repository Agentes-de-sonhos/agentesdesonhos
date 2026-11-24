# JE VIAGENS — briefing-30-v1

## Prévia técnica
- URL: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-30-v1
- Host de identidade local: `briefing-30-v1.preview.local`; UUID exclusivamente sintético, sem slug público nem associação ao cadastro existente.
- Fixture path-keyed via `buildGoldStandardProfile`, renderizada por `AdsBriefingPreview`, `AgencySiteLayout` e `AgencySiteHome`. Nenhuma página ou componente clonado.
- Apenas wordmark textual JE VIAGENS. Logo e favicon específicos não criados nem buscados. Vinculação de tenant/domínio e logotipo permanecem pendentes.
- Cores autorizadas #164f76 / #39b7d4 via tokens da engine SiteLab; terciária calculada por `deriveTertiaryColor`. Nenhum novo default para outros sites.

## Conteúdo e inventário
- Fatos: Santo André/SP, fundada em 2017, atendimento personalizado, experiências de viagem, viagens nacionais/internacionais, lazer, roteiros personalizados, grupos, suporte ao viajante e referência textual a jeviagens.tur.br.
- Nenhum dado jurídico/privado, nome pessoal, telefone, e-mail, certificação ou domínio vinculado importado.
- Inventário integral de `GOLD_STANDARD_SECTION_ORDER` e `docs/padrao-ouro-sites.md`: hero Ju com três slides; assinatura, seis campanhas, Xcaret compartilhado, Orlando, cinco destinos, três momentos de viagem, resorts, cruzeiros, Portugal ilustrativo, Sobre em três parágrafos, quatro diferenciais, confiança baseada em fatos autorizados, atendimento sem pessoas inventadas, quatro etapas, avaliações explicitamente demonstrativas, sete FAQs, newsletter e ofertas ilustrativas.
- Continuidade compartilhada: Xcaret, visto americano, Orlando, resorts, Club Med/neve, cruzeiros, Portugal, blog e ofertas locais. Produtos não apresentados como especialização certificada ou disponibilidade comercial confirmada.
- Fotografias e mídias exclusivamente do acervo já presente; nenhuma aquisição externa ou logo de cadastro/URL.

## Isolamento
- Rota antecipada em `App` antes de providers de tenant, autenticação e cobrança, inclusive com `?__agency_host=...`.
- `strictBackendBlock: true`: sem exceção para avaliações ou Google/Club Med; mesmos interceptores e bloqueio independente de `useAgencySiteRequest`.
- Testes exercitam GET/POST, RPC, funções, submissão DOM, abertura externa, host publicado, domínios reais, sufixo enganoso e rota de gestão recusados.
- Nada publicado ou deployado. Nenhuma migration, alteração de acesso, cobrança, domínio, gate, dados públicos ou chamada administrativa ao backend.

## Evidências
- `bunx vitest run src/test/je-viagens-preview.test.tsx src/test/rb-tour-preview.test.tsx src/test/roteiros-da-terra-preview.test.tsx src/test/viaje-na-magia-preview.test.tsx`: **38/38 aprovados**, incluindo 15 da JE VIAGENS.
- `bunx vitest run src/test/preview-catalog-navigation.test.tsx -t 'enables shared pages|retains the preview prefix|passes the ship'`: **18 aprovados, 3 não executados**. Inclui registro JE VIAGENS no catálogo e continuidade compartilhada.
- Rodada ampliada com `ads-briefing-preview.test.tsx`: 59 aprovados e 5 falhas em expectativas antigas de Bagagem na Mão/Curti (fixtures e testes não modificados nesta tarefa). A seleção ampliada do catálogo também encontrou uma falha antiga de montagem assíncrona da temporada Arena. Nenhuma dessas expectativas foi alterada para forçar aprovação.
- Build automático: `build OK` em 24/11/2026, 22:41:52 UTC.
- Playwright local, 1280×1800 e 390×844: home e catálogo `/resorts-brasil` abrem; FAQ de Santo André expande; sem overflow horizontal, sem erros de execução e **zero requisições de auth/REST/funções** observadas.
- Capturas temporárias: `/tmp/browser/je-viagens/{1280,390}-home.png`, `{1280,390}-resorts.png`, `{1280,390}-faq.png`; log `results.log` no mesmo diretório.

## Limites da conferência
- Mídias CDN compartilhadas não foram entregues pelo localhost (imagens com `naturalWidth=0`), limitação já observada nas prévias anteriores. Composição/textos/wordmark foram conferidos; fotografias no host hospedado ainda precisam de revisão visual.
- Nenhum formulário comercial foi enviado. Clique no botão de revisão com dados vazios não confirmou submissão; bloqueios de envio com evento real e do hook foram verificados pelos testes.
- A URL hospedada foi fornecida para revisão, não validada com sessão de publicação. Nenhum acesso ao site público jeviagens.tur.br foi necessário.