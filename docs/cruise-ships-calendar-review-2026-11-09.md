# Calendários MSC — conferência de 09/11/2026

A consulta interativa oficial carregou nesta revisão e permitiu substituir os resumos sem datas dos quatro navios restantes por seleções de viagens de ida e volta com embarque no Brasil. O Musica também foi ampliado. Não se trata de inventário completo nem de consulta de disponibilidade em tempo real.

| Navio | Saídas datadas | Portos de embarque da seleção |
| --- | ---: | --- |
| MSC Virtuosa | 46 | Santos, Salvador, Maceió |
| MSC Divina | 19 | Santos |
| MSC Musica | 42 | Santos, Rio de Janeiro, Itajaí, Paranaguá |
| MSC Splendida | 12 | Rio de Janeiro |
| MSC Seaview | 27 | Santos, Balneário Camboriú |
| Costa Diadema | 24 | Santos |
| Costa Serena | 8 | Rio de Janeiro |
| Buenavista | 27 | Santos |
| **Total** | **205** | |

## Fontes e método

Datas, duração, navio, origem, retorno e destinos foram lidos nos cartões da consulta interativa oficial. Sequências de exemplos também foram abertas no detalhamento diário: Divina de quatro noites via Ilha Grande e Búzios; Virtuosa de sete noites no Nordeste; Splendida de oito noites; Musica de sete noites com embarque no Rio. As ordens dos cartões foram preservadas, inclusive a inversão Ilha Grande/Búzios em datas específicas do Musica. Nenhuma data foi extrapolada pela frequência semanal.

- Divina: https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-divina/itineraries (duas páginas de resultados da temporada).
- Musica: https://www.msccruzeiros.com.br/our-cruises/navios/msc-musica/itineraries (quatro páginas de resultados até abril/2027).
- Virtuosa: https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-virtuosa → “Ver todos os resultados” (duas páginas; filtro de navio VI).
- Seaview: https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-seaview → “Ver todos os resultados” (três páginas; filtro de navio SV).
- Splendida: https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-splendida → “AMÉRICA DO SUL 2026-27 e 2027-28” → “Ver todos os resultados” (duas páginas; filtros SP/SOA).

O registro estruturado dos novos grupos está em `cruise-ships-msc-calendar-2026-11-09.json`; as sete datas anteriores do Musica foram reconfirmadas na listagem atual e permanecem no arquivo de conteúdo.

## Exclusões e limites

- Não importar trechos com desembarque em porto diferente, travessias oceânicas, embarques fora do Brasil ou temporadas posteriores.
- Não importar cartões sem a sequência completa de destinos (`+1 portos de escala` etc.).
- Saídas especiais com Copacabana como passagem panorâmica permanecem fora da seleção: a interface atual trata os pontos como portos de escala e não deve sugerir desembarque nessa passagem.
- Divina: os cartões de 18/12 (Angra dos Reis) e 21/12 não foram incluídos nesta seleção. Não se presume que a ausência de uma data signifique indisponibilidade.
- Costa e Corazul mantêm a conferência anterior e as exclusões por divergência documentadas em 08/11. Nenhum número conflitante do Buenavista foi reinserido.
- Fotografias e créditos não foram alterados.

## Implementação e verificação

O agrupamento agora inclui os portos inicial e final, além da duração e destinos. Quando há mais de uma origem, as opções identificam o porto de saída. O painel de detalhes mostra o embarque e desembarque do roteiro selecionado, e o formulário recebe somente suas datas e variante. Isso evita apresentar “saída de Santos” em uma opção de Salvador, Maceió, Itajaí ou Paranaguá.

Testes de regressão cobrem as oito páginas, integridade das mídias e coordenadas, retorno ao porto inicial, grupos separados por origem, mudança de origem e transferência correta para o formulário, além do Harmony. Prévia estática regenerada a partir do componente real. Envio de leads permanece desativado apenas na prévia; sem chamadas de construção ao Lovable e sem merge em produção.
