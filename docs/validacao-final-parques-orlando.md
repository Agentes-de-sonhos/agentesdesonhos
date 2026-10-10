# Etapa final — LEGOLAND, Kennedy e ICON Park

Implementação exclusivamente frontend/assets, sem publicação, banco, permissões ou alteração do orçamento. Os 14 mapas anteriores continuam independentes; os três novos reutilizam o motor e modal compartilhados.

## Fontes e cobertura

| Parque | Fonte autorizada | Imagem PNG | Atrações | Alimentação | Compras | Itens / âncoras |
|---|---|---|---:|---:|---:|---:|
| LEGOLAND Florida | mapa-legoland-florida.pdf, página única vetorial | 5130 × 7290, 360 dpi | 58 | 21 | 8 | 87 / 90 |
| Kennedy Space Center | PARKMAP.pdf, raster original extraído | 4800 × 2698 | 20 | 9 | 4 | 33 / 33 |
| ICON Park | mapa-icon-park.png | 1512 × 1460, crop nativo | 15 | 20 | 3 | 38 / 38 |

Total: **158 entradas únicas e 161 âncoras**. PNGs lossless, sem recriação/IA/upscale raster. Pointers em `src/assets/orlando/maps`, URLs same-origin; HTML e imagem montados somente ao abrir o respectivo mapa. Hash SHA-256 da fonte e configuração completa registrados nos JSONs.

### LEGOLAND

Página integral a 360 dpi: o desenho cruza os dois lados, com parque aquático no topo e hotéis/acessos na base; um crop menor retiraria geografia. Legendas e restrições originais permanecem visíveis. Coordenadas derivadas dos glyphs vetoriais dos números no desenho, não da legenda; referência C tem quatro localizações.

- Omitidos serviços 3/4/W1/W2/W4/W9. Hotéis 1/2 não classificados como atrações; restaurantes de hotel agrupados no local confirmado, sem referência numérica falsa.
- Compras: 5/7/13/34/37/43/52/W3, conforme a legenda; 7 é LEGO Factory Experience na categoria de compras indicada pela fonte.
- Restaurantes A–S; no parque aquático **H Beach-N-Bricks Grill, I Beach Bar e J Beach Street Bites**, não L/M/N.
- Grupos 32 Imagination Zone, 42 NINJAGO World e W7 Creative Cove mantidos como entradas únicas, sem inventar números para componentes. MINILAND 15–22 preservado.
- 33 Galacticoaster, 61 Masters of Flight e 62 Battle of Bricksburg conferidos. Alturas mínimas incluídas apenas onde o símbolo individual e valor foram confirmados; valores de acompanhante não apresentados como mínimo. 33 indica mínimo 36 e máximo 77 polegadas; Driving School indica 6–13 anos. Demais símbolos/restrições completos na imagem original.

### Kennedy

Página integral mantém Main Visitor Complex e inset Bus Tour. Números 1–20 atrações, 21–29 alimentação, 30–33 compras. Centros refinados nos círculos coloridos originais e registrados em `sourceAnchors.centerPx`.

19/20/29/32/33 ancorados **somente no inset**. 19 é parada 1 The Gantry at LC-39; 20 parada 2 Apollo/Saturn V Center. Os círculos menores do inset usam tamanho local opcional, multiplicado pelo mesmo fator de escala da imagem; mapas anteriores sem esse campo permanecem iguais. ATX/Chat With an Astronaut: ingresso separado e reserva antecipada; HYPERDECK: reserva. Simuladores 4/17: mínimo de 44 polegadas. Nenhum horário ou status NEW convertido em alegação atual.

### ICON Park

Crop `[0,0,1512,1460]` remove listas/banner inferiores, preservando o desenho inteiro: StarFlyer à esquerda, SlingShot 37 à direita, entradas e prédios periféricos. As referências 8/13 sem nome e 35 ilegível foram omitidas/documentadas, não inventadas.

11 Tin Roof, 28 helena e 34 Ole Red têm uma entrada/pino por local: categoria restaurante, subtipo música ao vivo. The Lawn Bar/Wheelhouse Bar e StarFlyer usam símbolos sem numeração falsa. **A fonte identifica 36 como Playground Pearl Express e 38 como Bungee Pearl Express**, não Buccaneer Bay; o dataset segue o logo legível enviado. Texto “coming soon” impresso não é reproduzido como status atual.

## Layout e medições

Quatro telas: 1920×1080, 1366×768, 1024×600, 390×844; zoom 100/200% e resize. Mapa segue largura e altura natural completa, raio 18 px, página iframe com rolagem vertical; sidebar desktop medida em 340 px. Razão diâmetro/largura permanece constante no zoom/resize: LEGOLAND 57/5130, Kennedy 61/4800 (inset 31/4800), ICON 43/1512.

Bounding boxes **dentro do modal**, em 100%, `image.bottom / frame.bottom`:

| Tela | LEGOLAND | Kennedy | ICON |
|---|---|---|---|
| 1920×1080 | 2145,20 / 2146,20 | 863,63 / 864,63 | 1465,69 / 1466,69 |
| 1366×768 | 1357,94 / 1358,94 | 552,22 / 553,22 | 930,73 / 931,73 |
| 1024×600 | 871,94 / 872,94 | 360,00 / 361,00 | 600,50 / 601,50 |
| 390×844 | 518,89 / 519,89 | 213,09 / 214,09 | 356,75 / 357,75 |

Imagem termina sempre dentro do frame (1 px de borda). Quando o documento excede a tela, rolagem externa revela o restante. X alinhado à extremidade direita: diferença medida **0 px** em todos os 12 casos; acima do iframe e sempre visível.

## Verificações

- 63 testes automatizados aprovados em seis arquivos: datasets/contagens/categorias, centros Kennedy, refs omitidas, múltiplas âncoras, assets, HTML/config sincronizados, lazy mount, mensagem origin/source, 17 logos e regressões Disney/United/Universal/galeria.
- Browser local: 12 combinações mapa/tela a 100/200%; 632 escolhas de itens (158 × 4) verificando detalhe, tooltip e destaque de todas as âncoras; busca, categorias combinadas, hover, desseleção em área livre, pan, pinch por PointerEvents, reset e resize.
- Wheel sobre o mapa altera zoom sem deslocar scroll, inclusive no limite 100%; fora do mapa rola documento. Motor preserva limite 500% e listener não passivo. Console dos mapas sem erros.
- Galeria técnica: 17 logos abrem os respectivos documentos, sem selecionar orçamento. X e Esc fecham; foco retorna ao logo nas quatro telas. Screenshots e medições durante validação em `/tmp/browser/final-parks` (evidência local, não assets publicados).
- Browser usou os PNGs originais interceptados nas respectivas URLs same-origin para não depender de latência do CDN durante medições; isso não altera o código servido nem constitui validação de disponibilidade externa do CDN.

## Prévia

`/ads-briefing-preview/briefing-14-v1/ingressos-orlando` abre o fluxo público de seleção; logos de experiências abrem mapas sem alterar seleção. A galeria com os 17 logos está na seção Orlando da home `/ads-briefing-preview/briefing-14-v1`. Ações comerciais da prévia continuam bloqueadas; sem publicar.