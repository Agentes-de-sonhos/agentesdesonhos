# Validação — Drica Viagens, apresentação integral

## Entrega e isolamento
URL exata: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/drica-completa-v1

Fixture independente `drica-completa-v1`, perfil `dricaPresentation`, hostname sintético `drica-presentation.preview.local`. O rascunho `briefing-16-v1` permanece inalterado para comparação. Reuso de `buildGoldStandardProfile`, referências e engine white-label. Nenhuma publicação/deploy, alteração de DNS/domínio, banco, permissões, entitlement, conta, contrato ou CRM.

O acesso ao novo conteúdo aceita somente o hostname técnico exato acima, localhost e 127.0.0.1. Domínios reais Drica (com/sem www), host publicado, outros previews e sufixos enganosos recusados. `noindex,nofollow`; formulários e links externos bloqueados; telefone do contexto de ação é null. Contatos confirmados aparecem editorialmente, não acionam WhatsApp/e-mail. Não existe link para navegar ao domínio real; o endereço de e-mail usa o domínio apenas como contato.

## Inventário concluído
Home: três slides; central de oito serviços/campos/pop-ups; assinatura; seis campanhas fotográficas; Xcaret e Orlando; visto; cinco destinos (Orlando, Londres, Leste Europeu/Praga, Disney Cruise Line, Japão/Kyoto); três momentos; resorts/mapa; cruzeiros/quatro vídeos/cinco logos; Portugal ilustrativo; Sobre em três parágrafos; quatro diferenciais; quatro etapas; credenciais/equipe explicitamente para validação; três avaliações ilustrativas; sete FAQs; newsletter demonstrativa; Instagram confirmado; ofertas e rodapé legal.

Continuidades sob o mesmo prefixo: `/xcaret`, `/ingressos-orlando`, `/visto-americano`, `/resorts-brasil`, `/resorts-brasil/{slug}`, `/dmc-portugal`, `/ofertas`, `/blog`, `/blog/orlando-no-seu-ritmo`, `/blog/londres-e-turismo-esportivo`, `/blog/japao-sob-medida`. Blog e ofertas têm três itens locais, não preços ou disponibilidade inventada. Legal/área do cliente não consultam dados privados.

Identidade: logo original briefing 16; vinho/azul/branco; Adriana Martins; Rio de Janeiro; desde 2010; razão social e CNPJ confirmados. Sem CPF, endereço residencial ou dados financeiros. Sobre preserva integralmente o parágrafo do rascunho; descreve explicitamente que incidentes recebem suporte direto do fornecedor, com acompanhamento/auxílio da Drica. Sem selo Expert, foto pessoal de outra agência, certificação Cadastur ou narrativa de experiência fabricada. Portugal claramente ilustrativo, sem atribuir operação própria.

## Testes automáticos
Comando executado:
```sh
bunx vitest run src/test/drica-complete-presentation.test.ts src/test/gold-standard-template.test.ts src/test/ads-briefing-preview.test.tsx src/test/agency-dmc-100-limites.test.ts src/test/us-visa-landing.test.tsx src/test/us-visa-home-teaser.test.tsx src/test/agency-google-reviews.test.tsx src/test/agency-resorts-section.test.tsx src/test/xcaret-landing-render.test.tsx src/test/xcaret-booking-bar.test.tsx
```
Resultado final: **10 arquivos / 54 testes aprovados**. Cobrem composição, três parágrafos, preservação do rascunho, identidade, hostname/rota, recusa em produção, noindex, fetch/open/submit bloqueados e regressões de referência. Avisos React preexistentes de act/fetchPriority aparecem, sem falhas. Compilação automática: último sinal **build OK (15/10/2026 13:18:52 UTC)**, após corrigir compatibilidade de strings; nenhum build/typecheck manual executado.

## QA real no navegador
Playwright Chromium local, desktop 1440×1100, celulares 390×844 e 360×844. Pointers CDN encaminhados ao hostname técnico só no harness de teste; nenhuma URL do app modificada. Evidências temporárias em `/tmp/browser/drica/` (`results.log`, `interactions.log`, `controls.log`, screenshots).

- Home e subpáginas Xcaret, Portugal, resorts, Arcobaleno, Orlando, blog, artigo Japão e ofertas abriram; zero erros JavaScript e zero chamadas REST/funções nas verificações principais.
- Menu Visto navegou pelo link real para a subpágina do prefixo técnico. Popup B1/B2 abriu com consentimento Drica, sem Amanda/100 Limites/Bardelli. Link do blog abriu artigo Japão sob o mesmo prefixo.
- Oito abas de serviço selecionáveis (aria-selected true); três slides trocaram títulos; FAQ expandiu; ausência de rolagem horizontal em home/Xcaret/visto/Portugal nas duas larguras móveis. Screenshots conferidos de home, Sobre, destinos, Xcaret, cruzeiros, avaliações e carrinho.
- Fotografias dos cinco destinos carregaram com naturalWidth > 0; Praga foi substituída após inspeção de imagem inadequada. Logo, Xcaret, páginas verificadas e resorts sem imagens quebradas detectadas.
- Avaliações: três exemplos rotulados; sem estrelas/notas/Google real e zero scripts JSON-LD na home.
- Carrinho Portugal: clicar Solicitar Grupos, informar 15/12/2026 e quantidades, adicionar, abrir carrinho e ler item/data; preencher nome/e-mail fictícios, consentir e tentar Enviar. Sem sucesso falso, item preservado e **zero chamadas ao backend**.
- Clique Instagram bloqueado sem navegação; fetch de prova rejeitado localmente pelo guard, sem requisição. Zero links HTTPS apontando ao domínio real Drica.
- Corpo renderizado das páginas verificadas sem Bardelli, Juliana, Amanda, Destinos com a Ju ou 100 Limites.

## Limitações e validação editorial
Não publicar antes da revisão de Fernando/agência. Credenciais, equipe, avaliações, newsletter, ofertas, blog e capacidades/fornecedores Portugal permanecem exemplos para validação, sem registros ou compromissos reais. A experiência comercial não foi enviada justamente por estar bloqueada. Gestão autenticada fora do escopo e não testada.

Os quatro vídeos de cruzeiro estão presentes no perfil e conservam os arquivos das referências. O arquivo Disney Wish foi baixado e validado por ffprobe (H.264/AAC, 68,59 s, 29.857.321 bytes), mas o Chromium do harness retornou media error 4 ao reproduzir; reprodução audiovisual não foi comprovada nesse navegador. Não houve substituição ou recompressão de mídia das referências. Os demais três vídeos não tiveram reprodução individual verificada. O QA foi local, não validação no domínio publicado; imagens via infraestrutura CDN técnica foram inspecionadas.

## Arquivos principais
- `src/lib/adsBriefingPreview.ts`, `agencySiteProfile.ts`, `agencySiteTheme.ts`, `agencySiteConfig.ts`.
- `src/pages/adsPreview/AdsBriefingPreview.tsx`, `src/pages/whitelabel/AgencySiteHome.tsx`, `DmcPortugalLandingPage.tsx`.
- `src/components/whitelabel/AgencySiteLayout.tsx`, `AgencyPresentationPages.tsx`, `UsVisaProposalDialog.tsx`; `src/components/orlando/OrlandoEditorialGallery.tsx`, `OrlandoTicketsSection.tsx`.
- `src/index.css`, pointers `src/assets/presentation/drica/*`.
- `src/test/drica-complete-presentation.test.ts`, `ads-briefing-preview.test.tsx`; `AGENTS.md`, inventário padrão ouro, memória de identidade e `roadmap.md`.

## 15/10/2026 — Seções retiradas a pedido
Removidas da apresentação `drica-completa-v1`: Xcaret (bloco da home e página `/xcaret`), Visto americano (seção da home e `/visto-americano`), Portugal — planejamento no seu ritmo (`/dmc-portugal`), Credenciais e conexões e Equipe e consultores. O menu foi ajustado em conjunto e a grade "Tudo para a sua viagem" (6 serviços) passou a ocupar o lugar do bloco Xcaret na home. Menção a Xcaret permanece apenas como inspiração de destino no texto Sobre. Nada foi publicado; rascunho `briefing-16-v1` intacto. Testes: 19 aprovados; typecheck OK.

## 15/10/2026 — Logotipo dobrado no cabeçalho e no rodapé
Aplicado preset próprio de cabeçalho para os hosts da Drica (`drica-presentation.preview.local`, `dricaviagens.rio`, `www.dricaviagens.rio`) em `src/lib/agencySiteBrand.ts`: a caixa do logotipo passou de `h-12`/`max-w-[200px]` para `h-20` no celular e `h-24`/`max-w-[340px]` no computador, e a altura do cabeçalho de `h-20` para `h-24`/`h-[112px]`. O rodapé editorial reusa essa mesma caixa, então o logotipo dobra também no rodapé. Medido no navegador: logotipo 48 → 96 px no computador e 48 → 80 px no celular, sem sobreposição do menu nem corte; demais agências seguem com a caixa anterior. Testes de cabeçalho/rodapé: 16 aprovados; apresentação Drica: 4 aprovados; build OK. Nada foi publicado.
