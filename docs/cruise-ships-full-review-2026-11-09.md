# Revisão integrada dos oito navios — 09/11/2026

## Resultado e correções

Revisados textos de apresentação, experiências, inclusões, cabines, ficha técnica, imagens e estrutura dos roteiros dos oito registros. As fontes e divergências de calendário das revisões anteriores continuam documentadas nos relatórios de calendário e cobertura. Esta revisão não transforma a seleção em inventário completo nem garante disponibilidade comercial.

- Retirada a saída Buenavista de 09/11/2026: o catálogo estático ainda a listava, mas o comunicado da Corazul de 06/11, reproduzido pela imprensa, suspendeu os embarques de Santos de 06 e 09/11 e os correspondentes embarques do Rio. As outras três datas canceladas não constavam da seleção. A retomada anunciada para 13/11 é previsão operacional, não disponibilidade garantida.
- Inclusões do Buenavista passam a explicitar Corazul Plus e seguro viagem, conforme divulgação da temporada brasileira 2026/2027 pela representante R11 Travel. Mantidas condições de cobertura, limites e custo de upgrades; não generalizar a outras temporadas.
- Preservados os mapas separados de Nordeste e Carnaval de sete noites, com cinco saídas documentadas e retorno a Santos no dia 8, conforme brochura Corazul distribuída pela R11.

## Conferência por navio

| Navio | Fotos na galeria | Saídas selecionadas | Dados confrontados |
| --- | ---: | ---: | --- |
| MSC Virtuosa | 18 | 46 | Ficha oficial: 6.334 hóspedes, 2.421 cabines, 331 m; espaços e categorias |
| MSC Divina | 18 | 19 | Ficha oficial: 4.345 hóspedes, 1.751 cabines, 333,30 m; espaços e categorias |
| MSC Musica | 18 | 42 | Ficha oficial: 3.223 hóspedes, 1.275 cabines, 293,80 m; ressalva de renovação e imagens de referência |
| MSC Splendida | 18 | 12 | Ficha oficial: 4.363 hóspedes, 1.637 cabines, 333,30 m; espaços e categorias |
| MSC Seaview | 18 | 27 | Ficha oficial: 5.079 hóspedes, 2.026 cabines, 323 m; espaços e categorias |
| Costa Diadema | 18 | 24 | Página oficial: 756 cabines com varanda, 11 piscinas/hidromassagens, 8 restaurantes, 11 bares |
| Costa Serena | 12 | 8 | Página oficial: 571 cabines com varanda, 7 piscinas/hidromassagens, 8 restaurantes/snack bars, 9 bares/lounges; renovação de 2025 |
| Buenavista | 18 | 31 | Página oficial e representante: ficha, ambientes, inclusões; cancelamento e mapas de sete noites |

Total: 138 fotos e 209 saídas datadas. Os totais de piscinas/hidromassagens da Costa não são apresentados como piscinas isoladas. As divergências numéricas da Corazul permanecem explicadas na ficha técnica.

## Imagens, vídeos e interface

As 138 imagens foram baixadas com HTTP 200 e decodificadas. Conferência visual das oito pranchas completas: não foram identificadas pessoas posando para a câmera nem repetição dentro de cada galeria. SHA-256 único e comparação perceptual dHash sem pares abaixo de distância 8 em cada galeria. Ângulos diferentes de um mesmo ambiente não são automaticamente duplicatas. Imagens ilustrativas/de referência permanecem identificadas. A autorização de uso foi fornecida pelo usuário; esta conferência verifica procedência, não substitui o documento de autorização.

Todos os oito navios têm acionamento de vídeo na capa; galeria abre com vídeo no primeiro item e crédito único abaixo. Os vídeos Costa são visitas completas, mais longas; o Buenavista é um clipe oficial de aproximadamente 3 segundos. Reprodução do Buenavista verificada no navegador (readyState 4, duração 3,04 s).

Navegação pelas oito páginas na prévia: títulos e seletores renderizaram, sem imagens carregadas quebradas nem transbordamento horizontal na janela desktop. Durações são filtradas pela região selecionada; as outras regiões conservam seus roteiros. Não foi realizada nova bateria visual mobile nesta rodada.

## Validação técnica

- 26 testes da coleção brasileira passaram, incluindo vídeo, ficha dos oito navios, cobertura de durações, calendário, mapas de sete noites e preenchimento do orçamento.
- 25 testes adicionais passaram: Harmony (7), itinerários (6) e cabines (12). JSDOM emite aviso conhecido de scrollTo e React Router emite avisos de próxima versão, sem falhas.
- Build da prévia concluído. Nenhum envio real de lead, e-mail ou orçamento: integração validada com mock.
- Nenhum crédito Lovable utilizado; mudanças na branch/PR, sem merge em produção.

## Pendências comerciais explícitas

Continuam sem mapa inventado: Mini Búzios e Ilhabela e Réveillon do Buenavista, por divergências nos detalhes publicados; produto de cinco noites do Divina, sem seleção de datas/escalas suficientemente documentada. As páginas não omitem esses produtos, mas mostram a confirmação necessária. O calendário é amostral, sujeito a alterações e não representa consulta ao estoque em tempo real. Datas e fatos históricos não foram todos reextraídos individualmente: esta rodada aproveita as evidências registradas nas auditorias anteriores, reconsulta fichas oficiais e verifica mudanças relevantes.

## Fontes desta rodada

- Fichas oficiais MSC: https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-virtuosa ; https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-divina ; https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-musica ; https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-splendida ; https://www.msccruzeiros.com.br/nossos-cruzeiros/navios/msc-seaview
- https://www.costacruzeiros.com/navios/diadema.html
- https://www.costacruzeiros.com/navios/serena.html
- https://corazulcruceros.es/pt-br/o-navio/
- https://manualdoagente.com.br/temporada-brasileira/corazul-cruceros-temporada-brasileira/
- https://manualdoagente.com.br/wp-content/uploads/Brochura-Cruzeiros-26-27-2.pdf
- Comunicado da Corazul reproduzido: https://www.panrotas.com.br/mercado/cruzeiros/2026/11/corazul-suspende-2-saidas-do-buenavista-para-ajustes-no-navio-antes-da-alta-temporada_233455.html
- Confirmação jornalística independente: https://www.atribuna.com.br/noticias/portomar/corazul-suspende-cruzeiros-no-porto-de-santos-apos-problemas-em-navio-no-litoral-de-s-o-paulo-1.535933
