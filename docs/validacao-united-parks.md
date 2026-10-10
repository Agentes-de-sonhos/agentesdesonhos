# United Parks — validação da prévia

Implementação frontend, sem publicação, alterações de banco ou ativação de recursos. Os seis Disney continuam com os próprios dados; Magic Kingdom não foi editado.

## Dados e imagens

| Parque | Atrações¹ | Alimentação | Compras | Itens únicos | Âncoras | Imagem renderizada |
|---|---:|---:|---:|---:|---:|---|
| SeaWorld Orlando | 31 | 21 | 17 | 69 | 73 | 2000×1556, integral |
| Busch Gardens Tampa Bay | 33 | 18 | 14 | 65 | 67 | 960×653, integral |
| Aquatica Orlando | 17 | 10 | 3 | 30 | 30 | 800×648, integral |
| Discovery Cove | 11 | 4 | 2 | 17 | 17 | 1569×618, crop nativo |
| Total | 92 | 53 | 36 | 181 | 187 | |

¹ Inclui shows, habitats e experiências, com subtipo apresentado no detalhe.

Anexos SeaWorld/Busch/Aquatica têm codificação WebP apesar das extensões PNG/JPG: os assets conservam exatamente os bytes, sem recompressão, upscale ou conversão CMYK. Conferência HTTP dos quatro assets na prévia confirmou identidade dos bytes. Discovery original 2008×1143: recorte `[45,40,1614,658]`, sem legenda direita ou cartas inferiores. Comparação pixel a pixel confirmou igualdade entre crop PNG e área original decodificada. Não há transformação ICC necessária na fonte RGB fornecida.

## Referências e limites reais

- IDs incluem categoria/referência; números reiniciados em Busch não colidem. SeaWorld conserva A–U para alimentação e números originais de lojas. Grupos 1/2, 3/4, 5/6 e 7/8 têm uma entrada na lista e referências individuais em seus dois pinos. Todas as âncoras do item selecionado recebem destaque.
- Atrações sem número usam símbolo de categoria, nunca numeração inventada. Discovery tem dois ícones de compras sem nome; seus rótulos são apenas geográficos. Ponto de bebidas sem nome junto a Flamingo Point identificado como tal. Serviços e cabanas excluídos.
- SeaWorld: manchas ocultam referências de Journey To Atlantis/Penguin; nomes de legenda foram mantidos e a localização parcial não é apresentada como acesso confirmado. Alimentação U sem nome legível tem descrição explícita. Shopping 10 agrupa nomes sem posições separadas comprováveis. Fragmentos ilegíveis não foram completados. `limitations` no JSON conserva as ressalvas da transcrição.
- Busch: shopping 3 e alimentação 3 têm nomes não legíveis; mantidas referências com rótulo explícito de leitura limitada. Alimentação 17 tem leitura limitada na legenda, não completada por conhecimento externo. Shopping 1 agrupa nomes em uma entrada. Fontes pequenas não justificam alegar transcrição certificada de todo texto.
- Aquatica: removido Kata’s Kookaburra Cove porque não aparece legível no anexo; Tuga’s Kid Cove é o nome visível. Nomes são os da fonte, inclusive Reel Plunge.
- Discovery: Monkey Island aparece nas cartas inferiores sem posição própria confirmada; não foi inventado um pin separado. Otter corresponde à área Freshwater Oasis. Horários impressos foram omitidos.
- Expedition Odyssey e SeaQuest são apresentados somente conforme o guia; não há afirmação de disponibilidade atual. Nenhum horário, preço ou restrição ausente foi criado.

## Verificações

- 39 testes automatizados aprovados: integridade dos datasets, IDs, categorias, âncoras, HTML/config, assets same-origin, isolamento de seleção/orçamento e regressão dos seis Disney.
- 16 execuções de popup: quatro parques × 1920×1080, 1366×768, 1024×600 e 390×844, cada uma a 100%/200%; nenhuma exceção JavaScript.
- Imagem inteira em 100%: `image.bottom <= viewport.bottom` em todas; largura igual à coluna menos bordas. Exemplo desktop: imagem 1492 px, sidebar 340 px; SeaWorld altura 1160,77 px e frame 1162,77 px. Scroll vertical permitido. Mobile: imagem 356 px; Discovery altura 140,22 px, frame 142,22 px.
- Razão diâmetro/largura estável no zoom e resize: SeaWorld 1,6%; Busch 1,45833%; Aquatica 1,875%; Discovery 1,52964%. Posição DOM de cada âncora coincide com coordenada configurada com erro inferior a 0,1 pixel nativo; isso não elimina as incertezas de leitura/posição da fonte listadas acima.
- Wheel sobre mapa altera zoom sem mover scroll, inclusive limites 100/500; fora rola normalmente. Drag, reset, filtros combináveis, busca sem resultados, lista→tooltip/detalhe, destaque e clique livre→desseleção conferidos.
- Pinça real via eventos touch Chrome nos quatro mapas; resize durante 200%, tooltip e detalhes conferidos.
- X fixo alinhado à borda direita, acima do iframe e inalterado após scroll; Esc dentro do iframe fecha e restaura foco. Raio 18 px, filtros separados, sidebar 340 e layout natural preservados.
- Capturas e medições da sessão em `/tmp/browser/united-parks/`, incluindo `measurements.json` e imagens por parque/tela/zoom.

## Prévia

https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-14-v1/ingressos-orlando

Os assets estão hospedados same-origin; imagem e iframe são montados apenas ao abrir o respectivo popup. Não publicado.