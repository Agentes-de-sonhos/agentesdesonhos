# Páginas da temporada brasileira 2026/2027

Implementação no componente compartilhado do Harmony. Sem chamadas de construção ao Lovable.

| Navio | Rota |
| --- | --- |
| MSC Virtuosa | `/cruzeiros/msc/msc-virtuosa` |
| MSC Divina | `/cruzeiros/msc/msc-divina` |
| MSC Musica | `/cruzeiros/msc/msc-musica` |
| MSC Splendida | `/cruzeiros/msc/msc-splendida` |
| MSC Seaview | `/cruzeiros/msc/msc-seaview` |
| Costa Diadema | `/cruzeiros/costa/costa-diadema` |
| Costa Serena | `/cruzeiros/costa/costa-serena` |
| Buenavista | `/cruzeiros/corazul/buenavista` |

## Conteúdo e implementação

- Galeria por categoria, ficha técnica, experiências, cabines e formulário existente de solicitação de cruzeiros.
- Fontes oficiais consultadas em 06/11/2026 registradas nos dados e em `cruise-ships-2026-27-media.json`. Imagens remotas de fontes oficiais; Fernando confirmou expressamente a autorização de uso comercial em 07/11/2026 (UTC).
- Números e infraestrutura usam a ficha de cada companhia. Musica explicita a renovação anunciada e a possibilidade de a ficha preceder a configuração final.
- Opções MSC usam resumos oficiais enquanto faltam calendários verificáveis. Costa e Corazul possuem feeds selecionados de saídas documentadas, detalhados abaixo. O explorador original do Harmony permanece intacto.
- Imagens de categorias/ambientes genéricos são identificadas como ilustrativas/de referência. Cabines sem imagem verificada recebem apresentação textual.
- Vídeo opcional: nunca mostra um player sem mídia; galerias de fotos circulam sem entrar em um vídeo inexistente.
- Trocar de navio reinicia o estado da página. O interesse no roteiro sazonal é enviado no resumo e nos detalhes do pedido existente, sem mudar o destino do tenant.

## Validação e limites

- 18 testes de regressão: Harmony, oito novas páginas, integridade das mídias, feeds de saídas e navegação da galeria sem vídeo.
- Build Vite passou; avisos preexistentes de CSS e tamanho de chunks.
- Imagens selecionadas conferidas por download e folhas de contato; referências que responderam 403 não foram utilizadas.
- O servidor de desenvolvimento da prévia falhou em `@swc/core`. Revisão visual realizada em prévia estática compilada do componente real; escopo detalhado abaixo.
- Autorização comercial das mídias confirmada pelo responsável pelo projeto nesta conversa. Este desenvolvimento é entregue em PR de rascunho, sem merge e sem publicação automática.
- Pendências de conteúdo: calendários/mapas MSC, saídas com divergências nas fontes.

## Continuação — 07/11/2026

- Todas as 33 categorias de cabine agora têm imagem. Foram adicionadas dez imagens das páginas oficiais `cabins-suites` da MSC, conferidas por download e folha de contato. A interna do Divina usa a referência do Preziosa que a própria MSC apresenta nessa página, identificada no texto e na galeria; não é apresentada como fotografia do Divina. A suíte do Musica é referência do Yacht Club após a renovação.
- 60 saídas com datas e ordem de portos: Diadema 25, Serena 8 e Buenavista 27. O explorador existente já suporta os novos feeds sem duplicação de componentes. Formulário recebe a combinação, a ordem e a data escolhidas.
- Costa: catálogo oficial da Costa Extra, edição março/2026, páginas 6 e 8. A data de consulta não torna esse catálogo um inventário em tempo real. Seleção de embarques em Santos (Diadema) e Rio (Serena); travessias, outros portos de embarque e o trecho Serena de 13/03 com ano contraditório não importados. `Agra dos Reis` no catálogo foi normalizado para Angra dos Reis. Repetições reais de Ilhabela foram preservadas.
- Corazul: listagem e páginas detalhadas atuais em português, saídas futuras a partir de 07/11. Mini Búzios, Mini Camboriú, Mini Ilhabela, Mini Cabo Frio e Natal importados. O mapa exibe somente portos, sem inventar dias de navegação ou horários.
- A geografia local em `public/maps/cruise-south-america.geojson` é uma seleção dos países da América do Sul de Natural Earth, escala 1:110 milhões. Fonte: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson . Dados geográficos Natural Earth em domínio público; essa licença não se aplica às fotos dos navios. Coordenadas são aproximações da cidade/porto para visualização esquemática, não terminais nem rotas de navegação.

### Divergências preservadas fora do calendário

| Produto | Motivo |
| --- | --- |
| Buenavista Mini Búzios e Ilhabela · 20/11/2026 | Página detalhada menciona Cabo Frio e duplica o dia 4; título e sequência não concordam. |
| Buenavista Nordeste · 04, 11, 18 e 25/01/2027 | Produto anunciado com sete noites termina no dia 7 em Ilhabela no detalhamento, sem retorno documentado a Santos. |
| Buenavista Carnaval · 05/02/2027 | Mesmo problema de duração/porto final do Nordeste. |
| Buenavista Réveillon · 30/12/2026 | Texto coloca a celebração de Réveillon no dia 3, incompatível com a data de embarque. |
| Costa Serena · 13/03 | O catálogo imprime 2026 para esse trecho em meio à programação de 2027. |

Não foi possível obter calendários MSC completos e atuais pelas páginas de itinerários: respostas sem saídas, conteúdo dinâmico incompleto e brochuras anteriores à mudança de programação de Divina/Musica/Seaview. Os cinco navios mantêm resumos da temporada do comunicado oficial de 31/08/2026. Para completar as datas/mapas MSC, falta uma exportação ou tabela oficial atualizada de saídas, com sequência de portos. Não transpor automaticamente datas de um navio para outro.

### Verificação atual

- Build Vite aprovado novamente após os novos feeds e imagens; avisos preexistentes de CSS e tamanho de chunks.
- 18 testes passaram: regressão Harmony, oito páginas, galerias, seleção de roteiro/datado, fontes e coordenadas dos feeds e exclusão das inconsistências conhecidas.
- Revisão visual do componente compartilhado em prévia estática de QA (serviços externos substituídos por mocks que bloqueiam envio): oito páginas renderizadas no desktop; layout em iframe de 390 px (375 px úteis) conferido no Serena sem overflow horizontal; navegação, mapa e transferência de seleção ao formulário conferidos no Diadema; mapa do Buenavista conferido. Isso não equivale a testar entrega real de leads nem o cabeçalho/rodapé de cada tenant.
- O erro nativo do servidor de desenvolvimento continua restrito à infraestrutura de preview. A revisão estática usa o componente real compilado, sem alteração na configuração de produção.
- As pendências anteriores de fotos de cabine e revisão visual básica foram resolvidas. Permanecem os calendários MSC, divergências explicitadas acima. PR mantido em rascunho.

## Revisão de imagens e créditos — 07/11/2026

- Autorização comercial registrada conforme confirmação expressa de Fernando; não inferida da disponibilidade pública.
- Removidas cinco seleções promocionais com pessoas: MSC Musica p26, Costa Diadema p107/p109 e Costa Serena p106/p107. Mantidas cenas de atividades e espetáculos sem modelos posando para a câmera, além de ambientes e cabines.
- Créditos por companhia com link à página oficial abaixo da galeria principal, do álbum, da galeria ampliada, do conjunto de cabines e da foto de experiência. Nenhum crédito repetido em cada miniatura.
- Corrigidas as fotos das experiências de descanso para acompanhar seu conteúdo, sem substituir ambientes por fotos de outros navios.

## Correção da prévia em branco — 07/11/2026

O deploy Cloudflare Pages estava servindo o `index.html` de desenvolvimento, com `/src/main.tsx`, sem compilar a aplicação. A confirmação de deploy não comprovava a renderização da página.

A prévia possui agora um artefato estático em `preview/navios/`, gerado por `node tools/cruise-preview/build.mjs`. Ele reutiliza `CruiseShipsPreview` e `CruiseShipPage`, com dados das oito páginas. Somente esse build substitui o módulo de solicitações por um bloqueio sem backend e usa a base cartográfica local. Não altera a configuração de produção nem o fluxo das agências. Regerar o artefato após mudanças nas páginas antes de atualizar o link de revisão.

## Conferência editorial — 08/11/2026

A revisão atual está em [cruise-ships-content-audit-2026-11-08.md](cruise-ships-content-audit-2026-11-08.md). São 66 saídas selecionadas: Musica 7, Diadema 24, Serena 8 e Buenavista 27. Esta revisão substitui as contagens e pendências de calendário descritas acima: quatro MSC permanecem sem datas e o Musica tem seleção parcial. Números contraditórios do Buenavista foram omitidos.

## Calendários MSC — 09/11/2026

Os oito navios agora possuem seleções datadas no explorador, totalizando 205 saídas. A pendência de ausência de calendário nos quatro MSC foi resolvida para o escopo de viagens selecionadas de ida e volta com embarque no Brasil. O inventário continua explicitamente parcial. Fontes, contagens, exclusões e mudanças estão em [cruise-ships-calendar-review-2026-11-09.md](cruise-ships-calendar-review-2026-11-09.md).
