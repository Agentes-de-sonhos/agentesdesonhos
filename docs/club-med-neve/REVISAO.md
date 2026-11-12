# Club Med na neve — revisão de apresentação e fotografias

Referências de apresentação: `nannaiFixture.ts`, Tivoli em `resortsTexts.json` e `HotelDetailsView.tsx`. O texto de apresentação passa pelo mesmo renderizador de parágrafos dos resorts brasileiros; as seções adicionais foram retiradas. Benefícios de neve, destaques, dados compactos de esqui, mapa, avaliações e orçamento permanecem.

## Atualização vigente — fotos oficiais (12/11/2026)

A pedido do proprietário, capas e galerias das 23 opções agora usam exclusivamente fotos das respectivas páginas oficiais do Club Med. Foram examinadas 972 imagens candidatas das galerias do próprio produto, acomodações e gastronomia, excluindo campanhas e recomendações de outros hotéis. A seleção tem 405 imagens: 18 por opção, exceto Sahoro e Chalés Valmorel (15), Saint-Moritz (16) e Chalés Grand Massif (17). Priorizados ambientes vazios, arquitetura, quartos e paisagens; excluídas as fotografias com modelos em destaque. Os chalés têm seleção própria; áreas compartilhadas só entram quando apresentadas em sua página oficial.

O manifesto vigente é `src/lib/clubMedSnow/officialPhotos.json`, com origem por produto, data e asset oficial por foto. Não depende da autoria nem da validade das URIs temporárias do Google. As fotos ficam no CDN oficial Club Med, com crédito e link para a página de origem. Essa atribuição não representa declaração de licença comercial aberta; o uso de imagens oficiais foi solicitado pelo proprietário.

A página de catálogo não consulta mais Google para carregar capas. As páginas individuais conservam avaliações e localização via Google, mas não acrescentam suas fotos às galerias. Os filtros territoriais e a ausência de notas nos cards foram preservados. Nenhuma alteração nos resorts nacionais ou consulta paga ao Google foi feita nesta revisão.

Validação: 13 testes passaram; build concluído; todas as 405 imagens selecionadas carregaram durante a revisão visual em 400 px, e 69 amostras (capa, segunda e última foto por produto) responderam HTTP 200 em 1600 px. Abaixo está o histórico da seleção anterior; suas pendências de galerias foram substituídas por esta atualização. Atualização de frontend para prévia pelo GitHub, sem créditos Lovable.

## Histórico — Fotografias — segunda revisão (Google, 12/11/2026)

O proprietário autorizou a seleção de imagens publicadas por perfis identificados como os hotéis no Google, excluindo colaboradores particulares e autoria desconhecida. Reutilizada a coleta existente; nenhuma nova chamada à Places API, nenhum crédito Lovable, nenhuma escrita no banco.

Das 230 posições nas 23 páginas, 70 estão atribuídas a colaboradores particulares. Outras 160 são candidatas com nomes Club Med, e **87 fotos em 13 páginas** passaram pela seleção visual e conferência pública de nome/perfil/associação ao estabelecimento. Essa conferência não constitui certificação de propriedade da conta pelo Google. Os créditos continuam visíveis, com link para o perfil. Não alegamos que a ausência de autoria indique foto oficial.

A nova seleção exige simultaneamente slug correto, perfil exato, crédito exato e resumo SHA-256 da URI da imagem revisada. Não usa índices, prefixo Club Med ou fotos anônimas como aprovação automática. Novas imagens, mudança da URI temporária ou respostas stale ficam bloqueadas até nova revisão. Nenhum arquivo de imagem, URI de mídia ou photo resource name do Google foi adicionado ao repositório. Os contatos de revisão foram temporários em scratch.

**Limitação operacional:** esta é uma curadoria da coleta atual, não uma galeria permanente. As URIs do Google são temporárias. A revisão não implanta um processo pago de renovação automática de fotos nem aprova imagens futuras do mesmo perfil. Quando as URIs/cache expirarem, as galerias podem voltar a ficar sem fotos até uma nova revisão ou obtenção de material oficial com uso autorizado. A função de servidor não faz novas consultas de fotos nesta alteração. Sua implantação é separada da publicação do frontend; a filtragem no cliente também protege contra respostas do servidor anterior.

Pendências:

- Beidahu, Changbaishan e Yabuli: nenhuma imagem do hotel identificada na coleta.
- Valmorel: a coleta aponta para os Chalés de Valmorel. Não usar automaticamente na página do resort.
- Chalés de Grand Massif: coleta compartilha o perfil do resort, sem confirmação de imagens específicas dos chalés.
- Serre Chevalier: sete das oito candidatas não carregaram; a única visível tem pessoas em destaque.
- Tignes, Tomamu, Val d'Isère e Val Thorens: seleção visual preliminar possível, mas conferência pública do perfil não concluída. O Google apresentou erro em Tignes/Tomamu e falha de navegação seguida de bloqueio da política do navegador em Val d'Isère. Não houve tentativa de contornar esse bloqueio. Essas quatro páginas ficam fora da lista liberada.

`google-fotos-auditoria.json` registra os totais e índices exclusivamente para auditoria da coleta de 12/11, não para aplicação automática em próximas consultas. `supabase/functions/_shared/clubMedGooglePhotoReviews.json` é a única seleção do Google consumida pelo servidor e pelo cliente.

A primeira pesquisa de fontes oficiais continua em `fotos-auditoria.json`; suas URLs são candidatas não selecionadas, com direitos e associação pendentes. Nenhuma delas é publicada.

Validação: sete testes do catálogo e da seleção individual passaram; build e diff-check conferidos. Mudanças em PR de revisão, sem publicação em produção. Resorts nacionais não foram alterados.
