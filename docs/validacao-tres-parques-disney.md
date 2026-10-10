# Três parques Disney — validação

Prévia: `/ads-briefing-preview/briefing-14-v1/ingressos-orlando`. Sem publicação e sem alteração de dados, permissões ou CTAs de envio.

## Fontes e contagens

| Parque | Atrações | Restaurantes | Compras | Total | Recorte nativo |
|---|---:|---:|---:|---:|---|
| EPCOT | 24 | 51 | 13 | 88 | 2325 × 2700 px |
| Disney's Animal Kingdom | 19 | 29 | 8 | 56 | 2520 × 2700 px |
| Disney's Hollywood Studios | 21 | 26 | 18 | 65 | 2325 × 2700 px |

Os três PDFs contêm uma imagem raster de 5925 × 2700 px na página 2. Recortes: `(0,0,2325,2700)` para EPCOT/Hollywood Studios; `(0,0,2520,2700)` para Animal Kingdom. Não houve redução de resolução, reconstrução, fundo de PDF inteiro ou incorporação de site privado. PNGs sem perdas armazenados com ponteiros CDN same-origin.

EPCOT: bytes JPEG CMYK originais (não a conversão automática de extração) transformados de **U.S. Web Coated (SWOP) v2 para sRGB via LittleCMS**. Animal Kingdom/Hollywood Studios: **sRGB IEC61966-2.1**, transformados para sRGB. Conferência visual encontrou a conversão automática de CMYK como risco; substituída pelo fluxo ICC antes do armazenamento final.

## Conferência dos pontos

- OCR dos círculos em resolução nativa e conferência visual de uma prancha de cada parque; corrigidas leituras como 58→53, 11→4, 9→191 e símbolos confundidos com números.
- Legendas ampliadas em três colunas por parque, conferidas visualmente para nome, categoria, descrições, alturas e restrições explícitas. Não foram adicionados horários ou alegações de novidade atual.
- Sequências únicas completas: EPCOT 1–88, Animal Kingdom 1–56, Hollywood Studios 1–65. Nenhum ícone de serviço/animal sem número virou ponto.
- EPCOT 1 Spaceship Earth e 16 Play Zone são atrações; Animal Kingdom 4 Wilderness Explorers é atração. Pontos múltiplos sem número próprio ficam na descrição do ponto correspondente.
- Dados, recortes, perfil de cor e SHA-256 do PDF estão em `public/maps/{park}.json`; somente conteúdo público do guia.
- Desvio entre coordenadas armazenadas e centros identificados: abaixo de 0,000001 px nativo (arredondamento). Conferência DOM de todos os centros: abaixo de 0,1 px nativo. A identificação visual dos círculos tem precisão aproximada de 1–2 px nativos.

## Medições a 100%

| Tela | EPCOT / Hollywood Studios: imagem | Animal Kingdom: imagem |
|---|---|---|
| 1920 × 1080 | 1492 × 1732,64 px | 1492 × 1598,57 px |
| 1366 × 768 | 938 × 1089,28 px | 938 × 1005 px |
| 1024 × 600 | 596 × 692,13 px | 596 × 638,56 px |
| 390 × 844 | 356 × 413,41 px | 356 × 381,42 px |

Em todas: `image.bottom <= frame.bottom`, altura natural proporcional e ausência de overflow horizontal. Desktop: sidebar de 340 px reais. Mobile: imagem inteira acima dos painéis na mesma rolagem vertical.

Marcadores definidos com diâmetro nativo de 58 px, incluindo cobertura da borda original; fonte, borda e realce sob a mesma transformação. Razão diâmetro/largura: EPCOT/Hollywood Studios **2,4946%**; Animal Kingdom **2,3016%**, constante a 100/200% e durante resize. Diâmetros em 1920: 37,22/74,44 px e 34,34/68,68 px.

## Interações e integração

- 16 execuções navegador: quatro parques × quatro telas, a 100/200%. Magic Kingdom HTML e modal originais não modificados.
- Wheel imediato sobre mapa, consumido também em 100/500%; página não rola sob o ponteiro. Wheel fora do mapa rola o documento; lista tem rolagem própria.
- Arraste, reset 100%, filtro combinável, busca vazia, lista→tooltip/detalhe, destaque e desseleção verificados.
- Pinça real por eventos Chrome touch input nos três novos parques; resize de 1920 para 1024 a 200% preserva proporcionalidade.
- X alinhado right:0, acima do iframe/barra, permanece no mesmo bounding box após scroll; Escape no iframe fecha e restaura foco ao logo.
- Quatro logos abrem os respectivos documentos lazy; botões de seleção continuam independentes. Fluxo de orçamento coberto por teste existente sem envio real no navegador.
- Sem erros JavaScript nas execuções. Capturas desktop/mobile/zoom e detalhes inspecionadas visualmente; a imagem completa é alcançada por rolagem vertical, não por contain de altura.
- Validação local intercepta apenas os quatro URLs de imagem com os mesmos PNGs armazenados, pois o servidor Vite não serve o CDN hospedado. Nenhuma alteração de produto para contornar isso.

## Testes

22 testes aprovados em `src/test/disney-park-maps.test.tsx`, `src/test/magic-kingdom-map.test.tsx`, `src/test/orlando-tickets-gallery.test.tsx`; compilação automática sem erros.