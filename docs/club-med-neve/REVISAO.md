# Club Med na neve — revisão de apresentação e fotografias

Referências de apresentação: `nannaiFixture.ts`, Tivoli em `resortsTexts.json` e `HotelDetailsView.tsx`. O texto de apresentação passa pelo mesmo renderizador de parágrafos dos resorts brasileiros; as seções adicionais foram retiradas. Benefícios de neve, destaques, dados compactos de esqui, mapa, avaliações e orçamento permanecem.

## Fotografias

Todas as 23 páginas (21 resorts e 2 produtos de chalés) usavam fotos recebidas do Google sem curadoria. A origem foi retirada de cards e galerias. Também foi retirada a busca de fotos do servidor: a implantação da Edge Function é separada da publicação do frontend. O frontend já descarta fotos de uma versão antiga do servidor.

As páginas oficiais responderam à consulta de 12/11/2026. O arquivo `fotos-auditoria.json` lista URLs de imagens publicadas nos sites oficiais, sem baixar ou publicar as imagens. **São candidatas, não uma galeria aprovada:** as páginas incluem imagens de atividades, campanhas e hotéis recomendados. Aparição na página não confirma associação ao hotel, ausência de pessoas nem licença comercial. Nenhuma candidata foi marcada como visualmente revisada.

É necessário obter o material liberado para agências no portal Club Med ou a autorização aplicável às imagens antes de preencher `OFFICIAL_SNOW_PHOTOS`. Não há fallback para Google, banco genérico ou outro hotel. Até isso ocorrer, esta revisão deixa os hotéis sem galeria e os cards com ícone de neve. Não foi preservada uma galeria com imagens não verificadas apenas para completar 18 fotos.

Canais oficiais encontrados:
- https://corporate.clubmed/section/media-hub/media-library/?lang=eng
- https://portal.api.clubmed/en-US/scenarios/resort-media
- https://www.clubmed.pt/l/contacto (seção para agências)

| Hotel | Imagens candidatas na página | Aprovadas para publicação |
|---|---:|---:|
| Club Med Tomamu Hokkaido | 37 | 0 |
| Club Med Hokkaido Sahoro | 38 | 0 |
| Club Med Kiroro Grand | 42 | 0 |
| Club Med Kiroro Peak | 37 | 0 |
| Club Med Yabuli | 36 | 0 |
| Club Med Beidahu | 35 | 0 |
| Club Med Changbaishan | 35 | 0 |
| Club Med Alpe d'Huez | 44 | 0 |
| Club Med Grand Massif Samoëns Morillon | 51 | 0 |
| Club Med La Plagne 2100 | 41 | 0 |
| Club Med La Rosière | 40 | 0 |
| Club Med Les Arcs Panorama | 45 | 0 |
| Club Med Peisey-Vallandry | 45 | 0 |
| Apartamentos-Chalés de Grand Massif Samoëns Morillon | 36 | 0 |
| Club Med Serre Chevalier | 44 | 0 |
| Club Med Tignes | 40 | 0 |
| Club Med Val d'Isère | 38 | 0 |
| Club Med Val Thorens Sensations | 40 | 0 |
| Club Med Valmorel | 51 | 0 |
| Apartamentos-Chalés de Valmorel | 39 | 0 |
| Club Med Pragelato Sestriere | 47 | 0 |
| Club Med Saint-Moritz Roi Soleil | 42 | 0 |
| Club Med Québec Charlevoix | 46 | 0 |
