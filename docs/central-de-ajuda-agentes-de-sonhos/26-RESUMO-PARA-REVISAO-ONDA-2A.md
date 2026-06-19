# Resumo para revisão externa — Subonda 2A (Entradas + Despesas)

Data: 2026-06-19

## 1. Resumo executivo
A Subonda 2A produziu documentação aprofundada e independente para os módulos **Entradas** e **Despesas**, abrindo a Onda 2 da Central de Ajuda. Os módulos passaram de "em construção" para **concluídos**, com 82 chunks novos publicados no RAG sem regressões.

## 2. Resultado de Entradas
- 1 visão geral + 1 primeiros passos + 1 mapa Onda 2.
- 20 FAQs canônicas confirmadas (`en-faq-01` a `en-faq-20`).
- 10 tutoriais (`en-tut-01` a `en-tut-10`).
- 5 problemas comuns (`en-prob-01` a `en-prob-05`).
- 4 boas práticas (`en-bp-01` a `en-bp-04`).
- Status: **concluído**.

## 3. Resultado de Despesas
- 1 visão geral + 1 primeiros passos + 1 mapa Onda 2.
- 20 FAQs canônicas confirmadas (`dp-faq-01` a `dp-faq-20`).
- 10 tutoriais (`dp-tut-01` a `dp-tut-10`).
- 5 problemas comuns (`dp-prob-01` a `dp-prob-05`).
- 4 boas práticas (`dp-bp-01` a `dp-bp-04`).
- Status: **concluído**.

## 4. Métricas
- Artigos novos: 60.
- Chunks novos: 82.
- Total de chunks no RAG após a entrega: 608.
- Manifesto: `MANIFESTO-RAG.json` v2.0.0.
- IDs duplicados: 0.
- Linhas inválidas no JSONL: 0.

## 5. Arquivos criados (principais)
- `modulos/entradas/00-visao-geral.md`, `01-primeiros-passos.md`, `00-mapa-onda-2.md`
- `modulos/entradas/faq/00-perguntas-frequentes.md`
- 10 arquivos em `modulos/entradas/tutoriais/`
- 5 arquivos em `modulos/entradas/problemas-comuns/`
- 4 arquivos em `modulos/entradas/boas-praticas/`
- Mesma estrutura espelhada em `modulos/despesas/`

## 6. Arquivos atualizados
- `rag/BASE-RAG.jsonl` (+82 linhas)
- `rag/INDICE-DE-CHUNKS.md`
- `rag/MANIFESTO-RAG.json` (v1.5.0 → v2.0.0)
- `08-RELATORIO-DE-COBERTURA.md` (linhas dos novos módulos)

## 7. Decisões tomadas
- Separar definitivamente Entradas e Despesas em módulos independentes para reduzir ambiguidade.
- Manter a pasta legada `entradas-despesas/` apenas como referência histórica até decisão formal de remoção.
- Não tratar "marcação como paga" em Despesas como recurso existente, dado que a interface atual não possui essa ação.

## 8. Limites aplicados a Entradas
- Não aprofunda Vendas, Faturas, Comissões nem o dashboard global.
- Recorrência nativa não foi documentada porque não existe na interface.

## 9. Limites aplicados a Despesas
- Não aprofunda Comissões (cálculo) nem Faturas.
- "Pagamento parcial" e "baixa por status" não foram documentados — não existem hoje.

## 10. Divergências encontradas
- O nome legado "Entradas e Despesas" continua no relatório de cobertura e no manifesto técnico para preservar histórico, mas no produto e nos novos artigos é tratado em módulos separados.

## 11. Perguntas pendentes
Listadas em `25-RELATORIO-DE-ENTREGA-ONDA-2A.md` e replicadas em `23-DECISOES-PENDENTES-PROPRIETARIO.md` quando aplicável.

## 12. Validação do RAG
- `MANIFESTO-RAG.json`: parse JSON OK.
- `BASE-RAG.jsonl`: 608 linhas, todas parseáveis.
- IDs únicos: confirmado.
- Sem conteúdos `revisão-necessária` ou `bloqueado-por-informação` incluídos.

## 13. Três exemplos representativos por módulo

### Entradas
- `en-faq-06` — Diferença entre "Já recebi" e "Vou receber".
- `en-tut-03` — Marcar uma entrada como recebida.
- `en-prob-04` — Entrada criada como "Atrasada" sem motivo aparente.

### Despesas
- `dp-faq-07` — Configurar despesa fixa recorrente com tipo de duração.
- `dp-tut-10` — Identificar e revisar despesa de comissão de vendedor.
- `dp-bp-03` — Evitar duplicidade entre comissão e despesa manual.

## 14. Conteúdos excluídos do RAG
Nenhum nesta subonda.

## 15. Riscos remanescentes
- O nome legado da pasta `entradas-despesas/` pode causar ambiguidade até a decisão de remoção.
- Mudanças futuras no produto (baixa por status em Despesas, recorrência em Entradas, anexos) exigirão reabrir a documentação.

## 16. Recomendação de prontidão para o chatbot
- **Entradas:** PRONTO para uso pelo chatbot.
- **Despesas:** PRONTO para uso pelo chatbot.
