# Disney — snapshot Google Places (pendência antes de publicar)

- Fotos, nota, total e avaliações dos hotéis Disney vêm de uma importação única do Google Places feita em 20/10/2026 (commit 3246f344), guardada em `disneyHotelsGoogleData.json` e imagens otimizadas.
- As páginas mostram crédito de cada foto, autor de cada avaliação, link para o Google Maps e a data da consulta. `relativeTime` ("há 2 meses") é relativo a 20/10/2026; não há data individual das avaliações e nenhuma foi inventada.
- Polynesian Villas & Bungalows usa a ficha do Polynesian Village Resort (aviso exibido). BoardWalk Inn não tem nota na ficha consultada: nenhuma nota exibida.

## Pendência (bloqueia publicação)
Os termos do Google Maps Platform limitam cache/armazenamento de conteúdo do Places (só `place_id` pode ser guardado indefinidamente). O armazenamento estático deste snapshot **não foi validado** quanto a licença/retenção. Antes de publicar: validar com Fernando uma alternativa compatível (renovação periódica autorizada, busca sob demanda pelo backend sem retenção, ou fotos licenciadas/próprias). Nenhuma API nova foi chamada nesta revisão.
