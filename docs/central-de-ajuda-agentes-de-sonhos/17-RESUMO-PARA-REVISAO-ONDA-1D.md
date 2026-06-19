# Resumo para Revisão Externa — Subonda 1D

**Data:** 2026-06-19
**Escopo:** Roteiros e Financeiro — Visão Geral

## 1. Resumo executivo
A Subonda 1D entregou documentação aprofundada e confirmada para Roteiros e Financeiro — Visão Geral, adicionando 40 FAQs canônicas, 16 tutoriais, 10 artigos de problemas comuns e 8 artigos de boas práticas. Todos os 74 conteúdos foram promovidos ao RAG. Restam apenas decisões de produto.

## 2. Resultado de Roteiros
- 20 novas FAQs (`rt-faq-21..40`) cobrindo criação, IA, dias, atividades, períodos, fotos, modelos, link público, vínculo com Carteira Digital, permissões e versões públicas.
- 8 tutoriais (`rt-tut-01..08`).
- 5 problemas comuns (`rt-prob-01..05`).
- 4 boas práticas (`rt-bp-01..04`).
- Pendência: definição oficial entre V1 (rota tradicional) e V2 (white-label).

## 3. Resultado de Financeiro — Visão Geral
- 20 novas FAQs (`fin-faq-21..40`) cobrindo navegação, conceitos (venda, entrada, despesa, fatura, comissão), filtros, exportações, leitura do dashboard, perfis e plano.
- 8 tutoriais (`fin-tut-01..08`).
- 5 problemas comuns (`fin-prob-01..05`).
- 4 boas práticas (`fin-bp-01..04`).
- Pendência: confirmação das fórmulas dos demais indicadores.

## 4. Métricas
- Arquivos criados: 70
- Arquivos atualizados: 10
- FAQs revisadas: 20 (Financeiro)
- Novas FAQs confirmadas: 40
- FAQs pendentes: 0
- Tutoriais: 16
- Problemas comuns: 10
- Boas práticas: 8
- Correções de cobertura anterior: 0
- Novos chunks: 74
- Total atual de chunks: 408
- Cobertura anterior: Onda 1 + 1B + 1C (334 chunks)
- Cobertura atual: + Roteiros + Financeiro Visão Geral (408 chunks)

## 5. Arquivos criados (principais)
- `modulos/roteiros/faq/00-perguntas-frequentes.md` (reescrita completa)
- `modulos/roteiros/tutoriais/rt-tut-01..08.md`
- `modulos/roteiros/problemas-comuns/rt-prob-01..05.md`
- `modulos/roteiros/boas-praticas/rt-bp-01..04.md`
- `modulos/financeiro/tutoriais/fin-tut-01..08.md`
- `modulos/financeiro/problemas-comuns/fin-prob-01..05.md`
- `modulos/financeiro/boas-praticas/fin-bp-01..04.md`
- `16-RELATORIO-DE-ENTREGA-ONDA-1D.md`
- `17-RESUMO-PARA-REVISAO-ONDA-1D.md`

## 6. Arquivos atualizados
- `modulos/roteiros/00-mapa-onda-1.md`
- `modulos/financeiro/00-mapa-onda-1.md`
- `modulos/financeiro/faq/00-perguntas-frequentes.md` (append 20 FAQs)
- `rag/BASE-RAG.jsonl` (+74 linhas)
- `rag/INDICE-DE-CHUNKS.md` (nova seção Subonda 1D)
- `rag/MANIFESTO-RAG.json` (version 1.3.0, total 408)
- `08-RELATORIO-DE-COBERTURA.md`
- `09-MANIFESTO-DE-CONTEUDO.md`

## 7. Decisões tomadas
- Mapas de Roteiros e Financeiro promovidos de `bloqueado-por-informação` para `concluído com pendências pontuais`.
- Arquivos `00-em-construcao.md` removidos após substituição pelo conteúdo real.
- Padrão editorial idêntico às Subondas 1B/1C.

## 8. Auditoria resumida das versões públicas de Roteiros
- `RoteiroPublico.tsx` (V1) é renderizada na rota direta `/roteiro/:token`.
- `RoteiroPublicoV2.tsx` (V2) é renderizada via `PublicCodeResolver` quando o domínio white-label `seuroteiro.tur.br` resolve um itinerário.
- Versão oficial **não confirmada** pelo proprietário. Conteúdos foram escritos de forma neutra para servir ambas.

## 9. Limites aplicados ao Financeiro — Visão Geral
- Documentada apenas a visão consolidada e os conceitos transversais.
- Não foram detalhados procedimentos de criação/edição de vendas, entradas, despesas, faturas e comissões.
- Submódulos serão tratados em subondas dedicadas.

## 10. Divergências encontradas
Nenhuma divergência crítica.

## 11. Perguntas pendentes
1. Versão pública oficial do roteiro (V1 vs V2)?
2. Cota diária de IA em Roteiros por plano?
3. Fórmulas dos demais indicadores do dashboard financeiro?

## 12. Validação do RAG
- JSON válido (version 1.3.0).
- 408 linhas no JSONL, todas parseáveis.
- 0 IDs duplicados.
- 0 linhas inválidas.
- 0 referências quebradas.

## 13. Exemplos representativos
### Roteiros
- `rt-faq-27` — Como uso a IA para gerar o roteiro?
- `rt-tut-08` — Vincular o roteiro a uma Carteira Digital.
- `rt-prob-05` — Alterações no roteiro não aparecem no link público.

### Financeiro — Visão Geral
- `fin-faq-29` — Como é calculado o lucro líquido?
- `fin-tut-02` — Filtrar o dashboard por período.
- `fin-prob-02` — Números divergentes entre Visão Geral e Vendas.

## 14. Conteúdos excluídos do RAG
Nenhum.

## 15. Riscos remanescentes
- Caso o proprietário confirme que apenas V2 do Roteiro é oficial, as FAQs precisarão ser revisadas para mencionar elementos específicos da V2 (baixo impacto).
- Caso o cálculo de algum indicador secundário do dashboard difira do exposto em FAQs futuras de Vendas/Entradas/Despesas, será necessário ajuste cruzado.

## 16. Recomendação de prontidão para o chatbot
- **Roteiros:** PRONTO para chatbot, com nota interna de que perguntas sobre limites exatos de IA devem incluir disclaimer "consulte seu plano".
- **Financeiro — Visão Geral:** PRONTO para chatbot. Perguntas detalhadas sobre submódulos devem ser respondidas indicando que a documentação aprofundada está prevista em próximas subondas.
