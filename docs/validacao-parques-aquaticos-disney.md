# Validação — Typhoon Lagoon e Blizzard Beach

Implementação completa na seção compartilhada de ingressos das agências, sem publicação, alterações de banco ou envio de orçamento real.

## Fonte e imagens

PDF `typhoon-lagoon-blizzard-beach.pdf`, SHA256 `3ff0e6dee2c421ef3257e58538fa9e02930457ea871e5be79b8f48e74215ad79`.

Extração do raster original de cada página (5925×2700), conversão gerenciada por LittleCMS do ICC U.S. Web Coated (SWOP) v2 para sRGB e recorte à esquerda, sem redução de resolução ou recriação do desenho. Títulos e transporte preservados; legenda à direita excluída. PNGs armazenados via ponteiros do projeto, URLs same-origin, carregados apenas na abertura do respectivo popup.

| Parque | Página | Crop nativo | Atrações | Restaurantes | Compras | Itens únicos | Âncoras |
|---|---:|---|---:|---:|---:|---:|---:|
| Typhoon Lagoon | 1 | (0,0,2873,2700), 2873×2700 | 12 | 13 | 1 | 26 | 30 |
| Blizzard Beach | 2 | (0,0,2986,2700), 2986×2700 | 12 | 11 | 2 | 25 | 31 |
| Total | | | 24 | 24 | 3 | 51 | 61 |

## Conferência de conteúdo e círculos

Legendas transcritas por OCR e conferência visual; nomes oficiais mantidos, detalhes em português limitados ao PDF. Alturas mínimas/máximas, proibição de bebês, necessidade de caminhar e cuidados físicos incluídos quando sinalizados; sem horários, datas atuais ou alegações inventadas.

Castaway Creek (#2) tem cinco âncoras; Cross Country Creek (#2), sete. Cada atração aparece uma única vez na lista e todas as suas âncoras destacam ao selecionar. Tooltip segue a âncora interagida; clique na lista escolhe a primeira na ordem determinística (de cima para baixo, desempate à esquerda). Sem centros duplicados; ícones B/U/P e serviços não se tornam atrações.

**Divergência verificada no anexo:** a indicação de um segundo círculo de Mayday Falls (#5) não foi confirmada no raster enviado. A inspeção da imagem completa, candidatos Hough e candidatos por cor encontrou um único círculo #5, aproximadamente (588,1638). O candidato OCR “5 5” em (768,1124) é um prédio/ponte sem círculo ou número; não foi inventada uma segunda âncora nesse local. O motor suporta múltiplas âncoras para qualquer ID, inclusive #5, caso uma segunda seja demonstrada em outra fonte.

Os JSONs de configuração contêm todos os nomes, categorias e coordenadas auditadas, e são idênticos à configuração embarcada nos HTMLs. Erro de posicionamento DOM versus coordenadas nativas: <0,1 px para todas as âncoras.

## Layout e medidas reais

Mapa pela largura, altura natural integral, sem fit pela altura. A 100%, `image.bottom <= frame.bottom` em todas as telas; rolagem vertical do documento iframe quando necessário. Sidebar desktop 340px, filtros separados, lista com rolagem própria, fontes sans, fundo preto e raio 18px. Zoom 200% usa a janela de navegação inicial; reset retorna a imagem inteira. Diâmetro nativo 58px; tamanho renderizado = 58 × largura real / largura nativa, sem zoom duplicado.

| Parque | Tela (largura) | Imagem largura | Imagem altura | Bottom imagem ≤ frame | Marcador 100% / 200% | Razão marcador/imagem |
|---|---:|---:|---:|---|---|---|
| typhoon-lagoon | 1920 | 1492.00 | 1402.16 | 1427.16 ≤ 1428.16 | 30.12 / 60.24 | 2.01879% |
| blizzard-beach | 1920 | 1492.00 | 1349.09 | 1374.09 ≤ 1375.09 | 28.98 / 57.96 | 1.94240% |
| typhoon-lagoon | 1366 | 938.00 | 881.52 | 906.52 ≤ 907.52 | 18.94 / 37.87 | 2.01880% |
| blizzard-beach | 1366 | 938.00 | 848.16 | 873.16 ≤ 874.16 | 18.22 / 36.44 | 1.94240% |
| typhoon-lagoon | 1024 | 596.00 | 560.11 | 585.11 ≤ 586.11 | 12.03 / 24.06 | 2.01880% |
| blizzard-beach | 1024 | 596.00 | 538.91 | 563.91 ≤ 564.91 | 11.58 / 23.15 | 1.94240% |
| typhoon-lagoon | 390 | 356.00 | 334.56 | 347.56 ≤ 348.56 | 7.19 / 14.37 | 2.01879% |
| blizzard-beach | 390 | 356.00 | 321.89 | 334.89 ≤ 335.89 | 6.91 / 13.83 | 1.94240% |

## Validações executadas

- `bunx vitest run src/test/disney-park-maps.test.tsx src/test/magic-kingdom-map.test.tsx src/test/orlando-tickets-gallery.test.tsx`: **30 testes aprovados**.
- Browser Chromium: 1920×1080, 1366×768, 1024×600 e 390×844; seis parques, 24 combinações, screenshots em 100% e 200%, sem erros de execução JavaScript.
- Wheel imediato sobre o mapa, sem deslocar scroll do documento, inclusive limites 100%/500%; wheel fora do mapa rola normalmente.
- Arraste em zoom, reset, touch pinch real via CDP, resize em 200% com razão proporcional constante.
- Todas as 61 âncoras: hover e ativação por teclado; todos os 51 itens: clique na lista, detalhe, tooltip, âncora previsível e destaque simultâneo dos repetidos.
- Categorias combinadas e busca normalizada; ocultação de todos os marcadores de um item filtrado; clique livre desseleciona.
- Seis logos abrem seus HTMLs corretos; montagem lazy, X fixo na borda direita e acima do iframe ao rolar, Escape fecha e foco retorna ao logo. Testes de origem/source para mensagens de fechamento.
- Seleção de orçamento permanece independente; parques aquáticos ficam na etapa “Mais experiências” existente. Magic Kingdom não foi editado; três parques anteriores mantêm seus dados, imagens e aparência, usando fallback de uma âncora por item.
- Evidências locais: `/tmp/browser/disney-water/{results,extra,anchors}.log`, `measurements.json` e screenshots; comparação visual dos crops em `/tmp/water-maps/*-audit.jpg`.

## Prévia

https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-14-v1/ingressos-orlando

Nada publicado automaticamente.
