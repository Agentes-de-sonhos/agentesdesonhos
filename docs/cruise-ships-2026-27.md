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
- Fontes oficiais consultadas em 06/11/2026 registradas nos dados e em `cruise-ships-2026-27-media.json`. Imagens remotas; não se presume licença comercial por estarem disponíveis publicamente.
- Números e infraestrutura usam a ficha de cada companhia. Musica explicita a renovação anunciada e a possibilidade de a ficha preceder a configuração final.
- Opções de temporada são resumos oficiais, sem datas, sequência de portos ou mapas inventados. Os feeds de saídas permanecem vazios até importação de calendários verificados. O explorador original do Harmony permanece intacto.
- Imagens de categorias/ambientes genéricos são identificadas como ilustrativas/de referência. Cabines sem imagem verificada recebem apresentação textual.
- Vídeo opcional: nunca mostra um player sem mídia; galerias de fotos circulam sem entrar em um vídeo inexistente.
- Trocar de navio reinicia o estado da página. O interesse no roteiro sazonal é enviado no resumo e nos detalhes do pedido existente, sem mudar o destino do tenant.

## Validação e limites

- 17 testes de regressão: Harmony, oito novas páginas, integridade das mídias e navegação da galeria sem vídeo.
- Build Vite passou; avisos preexistentes de CSS e tamanho de chunks.
- Imagens selecionadas conferidas por download e folhas de contato; referências que responderam 403 não foram utilizadas.
- A prévia gerenciada não iniciou: `Failed to load native binding` em `@swc/core`. Revisão responsiva no navegador ainda pendente.
- Confirmar autorização comercial das mídias antes de colocar essas páginas em produção. Este desenvolvimento é entregue em PR de rascunho, sem merge e sem publicação automática.
- Pendências para equivalência completa com o Harmony: calendários/mapas por saída, fotos das categorias ainda sem mídia e revisão visual responsiva.
