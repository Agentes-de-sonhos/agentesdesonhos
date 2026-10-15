
# Padrão ouro de novos sites — união completa das referências

## Regra de geração ADS
Todo novo briefing começa por `buildGoldStandardProfile(key, overrides, agencyName)`, com a união integral de Destinos com a Ju (`EDITORIAL_ROSE`) e **100 Limites** (`EDITORIAL_DMC`). Os perfis de referência permanecem íntegros em `src/lib/agencyReferenceProfiles.ts`. Não aplicar novos defaults aos tenants existentes.

Briefing incompleto não desliga seções na primeira apresentação. Preencher composição, extensão editorial e mídia de produto; Fernando/agência decidem depois o que manter e personalizar. O builder carrega conteúdo, não apenas chaves `enabled`. Nunca atribuir fotos pessoais, avaliações, tempo de experiência, certificados ou histórico das referências à nova agência.

O modelo é de **apresentação técnica**, não de publicação: `presentation: true`, hostname sintético, identidade local, `noindex`, rede e ações comerciais bloqueadas. Conteúdo ilustrativo não entra em tabelas, avaliações reais, JSON-LD Review/AggregateRating ou badges verificados. Nenhuma ativação de entitlement é necessária. Promoção para o site real exige validação editorial separada e autorização; domínio, conta, gestão e publicação não são alterados por este modelo.

## Inventário da união e origem escolhida
Fonte: perfis e componentes atuais do repositório, incluindo renderização fora do loop. Seções de função equivalente usam uma única versão inteira, não duas versões reduzidas.

| Seção / continuidade | Referência escolhida | Componente | Apresentação Bardelli / densidade |
|---|---|---|---|
| Cabeçalho, navegação, área do cliente | Ju | `AgencySiteLayout` | Logo Bardelli; menu e submenus; links técnicos; nenhuma sessão real |
| Banner principal | Ju | `AgencySiteHome`, hero compartilhado | 3 slides, mesmos controles e composição; castelo genérico substitui foto pessoal |
| Central de solicitações | Ju | `AgencyQuickQuote` | 8 serviços, campos e pop-ups; nenhum envio real |
| Assinatura editorial | Ju | `AgencySiteHome`, `signature` | Kicker, título e parágrafo integral adaptado |
| Especialidades / campanhas | Ju | `AgencyCampaignRail` | 6 itens no carrossel com fotografias e CTAs; não substituem seções de produto |
| Xcaret home | Ju | `AgencyFeaturedExperienceSection` | Mesma grade editorial; título, parágrafo, 4 destaques, CTA; montagem com 4 fotos de produto sem selo |
| Xcaret landing | Ju | `XcaretLandingPage`, `XcaretBookingBar` | 6 banners, vídeo, reserva, galeria de 3 fotos, descobertas, parques, passeios, 3 hotéis, inclusões, roteiro, FAQ e encerramento; fotos genéricas substituem Juliana; sem Expert atribuído |
| Orlando home + landing | Ju/100, engine idêntica | `OrlandoTicketsSection`, `OrlandoEditorialGallery` | Logos, cálculo de dias, etapas, seleção, 17 mapas existentes; galeria de 9 experiências na página interna; orçamento preservado nos tenants reais |
| Visto home + landing | 100 | `UsVisaHomeTeaser`, `UsVisaLandingPage`, `UsVisaProposalDialog` | Faixa independente, conteúdo completo, FAQ e pop-up B1/B2; sem fila consular real ou promessa operacional na apresentação |
| Descoberta de destinos | 100 | `AgencySiteHome`, `destinations` | 5 destinos, destaque e navegação aleatória por carregamento |
| Uma viagem para cada momento | 100 | `AgencySiteHome`, `highlights` | 3 cards fotográficos: família, lua de mel, amigos |
| Resorts home + mapa + detalhe | Ju/100, engine idêntica | `AgencyResortsSection`, `BrazilResortsMap`, `AgencyResortPage` | Catálogo integral, logos maiores só na apresentação, mapa e páginas dos resorts |
| Cruzeiros | Ju | `AgencySiteHome`, `AuthorityVideoGallery` | Faixa escura, título Cruzeiros, 2 parágrafos equivalentes, 4 vídeos, CTA e 5 logos Disney/MSC/Norwegian/Royal/Costa |
| Portugal home | 100 | `AgencyDmcSection` | Grade integral, foto Sintra, 4 serviços ilustrativos, CTA e ressalva |
| Portugal landing | 100 | `DmcPortugalLandingPage`, `DmcRequestCart` | Hero, serviços, estrutura expansível, Lisboa, Portugal, grupos, Europa, pet friendly, etapas, tarifário, sobre, FAQ e contato; capacidades a confirmar; carrinho local sem envio |
| Sobre | Ju | `AgencySiteHome`, `about` | Fotografia pertinente, 3 parágrafos de extensão equivalente e assinatura Bárbara; nenhum ano ou histórico inventado |
| Diferenciais | Ju | `AgencySiteHome`, `differentials` | 4 itens com ícones e textos adaptados |
| Atendimento | Ju | `AgencySiteHome`, `concierge` | Grade de texto/etapas, 4 etapas e carrossel de 4 itens; ações de revisão sem envio |
| Avaliações | Ju/100, engine idêntica | `AgencyGoogleReviewsSection` | 3 cards e carrossel integral, todos “Avaliação ilustrativa — exemplo de apresentação”; sem estrelas, nota, link Google ou atribuição falsa |
| FAQ | Ju | `AgencySiteHome`, Accordion | 7 perguntas e respostas equivalentes adaptadas |
| Newsletter | Ju | `AgencySiteHome` | Faixa completa, campos e apresentação do fluxo; inscrição bloqueada |
| Redes sociais | 100 | `SocialStrip` | Mesma faixa; apenas Instagram conhecido da Bardelli, sem links inventados |
| Ofertas home + continuidade | Ju/100, dependente de vitrine publicada | `AgencySiteHome`, `AgencyPresentationPages` | 3 cards ilustrativos com fotografias; sem preço ou disponibilidade fictícia; nenhuma vitrine publicada consultada |
| Blog + artigos | 100 | `AgencyPresentationPages` | Continuidade editorial local com 3 artigos de exemplo; sem habilitar módulo Blog ou criar registros |
| Rodapé legal + Cadastur | Ju/100, engine idêntica | `AgencySiteLayout`, `CadasturSeal` | Razão social/CNPJ/endereço/contatos Bardelli; certificado não inventado; sem abrir certificado de outra agência |
| Credenciais e equipe | Extensão máxima do engine (desligadas nas duas referências) | `AgencySiteHome`, `credentials`/`team` | Representadas adicionalmente: 2 itens documentais e 1 card de consultoria, explicitamente ilustrativos, sem selo ou pessoa fictícia |
| Depoimentos equivalentes | Ambas desligam `testimonials` | `AgencyGoogleReviewsSection` | Deduplicado em Avaliações; não repetir depoimentos pessoais nem ligar uma segunda seção da mesma função |

`visaConsult` não existe nos perfis atuais destas duas referências; a implementação completa de visto escolhida é a da 100 Limites. Faixa de países visitados não é ativada sem países realmente informados pela agência. Nenhuma seção ativa das referências é substituída por um card genérico.

## URL e isolamento
Apresentação completa: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/bardelli-completa-v1

Continuidade no mesmo prefixo: `/xcaret`, `/visto-americano`, `/ingressos-orlando`, `/resorts-brasil`, `/resorts-brasil/{slug}`, `/dmc-portugal`, `/blog`, `/blog/{slug}`, `/ofertas`. Links legais/área do cliente explicam a limitação de apresentação, sem consultar dados privados.

Allowlist estrita exclusiva desta apresentação: o hostname técnico acima, `localhost` e `127.0.0.1`; hostname de produção, domínio real Bardelli, `www`, outro preview e sufixos enganosos são recusados. A senha e as rotas reais `/preview` e `/preview/gestao` continuam intactas; a raiz Bardelli permanece em construção. Nenhuma publicação/deploy ou escrita no banco foi realizada.

## Aplicação Drica Viagens — briefing 16
- Apresentação integral: `/ads-briefing-preview/drica-completa-v1`, hostname sintético `drica-presentation.preview.local`. Rascunho `/ads-briefing-preview/briefing-16-v1` preservado.
- Mesmo inventário integral da matriz acima, via `buildGoldStandardProfile`; alterações só por opt-in do perfil sintético. Três slides, oito serviços, seis campanhas, cinco destinos, três momentos, quatro vídeos/cinco logos, Sobre em três parágrafos, quatro diferenciais/quatro etapas, sete FAQs, três avaliações ilustrativas.
- Identidade e copy confirmadas pelo briefing Drica, sem importar histórico, pessoas ou certificações das referências. Sobre preserva o texto do rascunho e acrescenta dois parágrafos. Portugal permanece ilustração, com títulos neutros e nenhuma operação própria atribuída. Cadastur não exibido.
- Novos slots opt-in `dricaLondon`, `dricaJapan`, `dricaPrague`: fotos de Londres, Kyoto e Praga via pointers CDN em `src/assets/presentation/drica/`. Fontes Unsplash: `photo-1513635269975-59663e0ac1ad`, `photo-1493976040374-85c8e12f0c0e`, `photo-1541849546-216549ae216d`. Inspeção visual corrigiu uma imagem inicial inadequada antes da entrega.
- Blog/ofertas têm três itens locais próprios (Orlando multigeracional, Londres/turismo esportivo, Japão); não ativam módulos ou consultam registros reais. Layout, páginas e mecanismos de segurança seguem compartilhados; estilos vinho/azul são exclusivos `wl-drica`/`data-ads-preview="drica-completa-v1"`.
- Evidências, testes e limitações: `docs/validacao-drica-apresentacao-completa.md`.
