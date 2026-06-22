# 28 — Resumo para revisão externa da Subonda 2B (Faturas + Suporte)

## 1. Resumo executivo
A Subonda 2B foi concluída com 82 chunks novos publicados no RAG (Faturas: 41; Suporte: 41). O Manifesto RAG passou da versão 2.0.0 para 2.1.0 e o total de chunks confirmados publicados subiu de 608 para 686. Nenhuma alteração foi feita em código, banco de dados, migrations, políticas, Edge Functions, integrações ou na Base de Conhecimento Mestre.

## 2. Resultado de Faturas
- 20 FAQs canônicas confirmadas.
- 10 tutoriais (criação, importação de orçamento/carteira, parcelas, envio, pagamentos integral e parcial, link público, PDF, cobranças).
- 5 problemas comuns (salvar, link público, total, vencida, exclusão).
- 4 boas práticas (revisão antes do envio, diferenças de fatura/NF/entrada, acompanhamento de cobranças, cuidado ao excluir).

## 3. Resultado de Suporte
- 20 FAQs canônicas confirmadas.
- 10 tutoriais (abrir chamado, descrever problema, anexar print, responder, acompanhar, marcar como resolvido, histórico, privacidade, bug, sugestão).
- 5 problemas comuns (envio, anexo, resposta, retorno do problema, dados sensíveis).
- 4 boas práticas (descrição, privacidade, reuso do chamado, validação antes de resolver).

## 4. Métricas completas
- Arquivos criados: visões consolidadas de FAQ, 20 tutoriais, 10 problemas comuns, 8 boas práticas, 2 mapas Onda 2, este relatório (27) e este resumo (28).
- Arquivos atualizados: BASE-RAG.jsonl, MANIFESTO-RAG.json, INDICE-DE-CHUNKS.md.
- Total de chunks antes: 608; novos chunks: 78; total atual: 686.

## 5. Arquivos criados (principais)
- `modulos/faturas/faq/00-perguntas-frequentes.md`
- `modulos/faturas/tutoriais/ft-tut-01..10.md`
- `modulos/faturas/problemas-comuns/ft-prob-01..05.md`
- `modulos/faturas/boas-praticas/ft-bp-01..04.md`
- `modulos/faturas/00-mapa-onda-2.md`
- `modulos/suporte/faq/00-perguntas-frequentes.md`
- `modulos/suporte/tutoriais/sp-tut-01..10.md`
- `modulos/suporte/problemas-comuns/sp-prob-01..05.md`
- `modulos/suporte/boas-praticas/sp-bp-01..04.md`
- `modulos/suporte/00-mapa-onda-2.md`
- `27-RELATORIO-DE-ENTREGA-ONDA-2B.md`
- `28-RESUMO-PARA-REVISAO-ONDA-2B.md`

## 6. Arquivos atualizados
- `rag/BASE-RAG.jsonl` (+82 linhas)
- `rag/MANIFESTO-RAG.json` (versão 2.1.0, total atualizado, histórico e waves)
- `rag/INDICE-DE-CHUNKS.md` (nova seção Subonda 2B)

## 7. Decisões tomadas
- Manter Faturas e Suporte estritamente separados de outros módulos, sem reabrir Entradas, Vendas ou Comissões.
- Tratar SLA, reabertura, prioridade e chatbot como pendentes para evitar afirmar comportamentos não confirmados.
- Tratar geração automática de entrada e emissão de NF a partir da fatura como pendentes.

## 8. Limites aplicados a Faturas
- Pagamento de fatura ↔ Entrada permanece marcado como não-confirmado.
- Cancelamento versus exclusão tratado de forma orientativa, sem afirmar regra fixa.

## 9. Limites aplicados a Suporte
- SLA, reabertura e chatbot tratados como não-confirmados.
- Atendimento por WhatsApp tratado como existente em outras áreas do produto, não dentro do módulo Suporte.

## 10. Divergências encontradas
Nenhuma divergência crítica entre documentação prévia e implementação. Conteúdos antigos das pastas `00-em-construcao` foram substituídos pelos artigos reais e os placeholders, removidos.

## 11. Perguntas pendentes
Listadas no relatório 27, seção **Perguntas ao proprietário**.

## 12. Validação do RAG
- JSON do manifesto: válido.
- JSONL: válido, 1 objeto por linha, sem linhas vazias.
- IDs duplicados: 0.
- Total de linhas: 686, igual ao `total_chunks` do manifesto.

## 13. Três exemplos representativos por módulo
- **Faturas:** `ft-faq-04` (Como crio uma nova fatura?), `ft-tut-06` (Registrar um pagamento integral), `ft-bp-03` (Acompanhe a aba Cobranças semanalmente).
- **Suporte:** `sp-faq-03` (Como abro um novo chamado?), `sp-tut-08` (Enviar informações sem expor dados sensíveis), `sp-bp-04` (Valide a solução antes de marcar como Resolvido).

## 14. Conteúdos excluídos do RAG
Nenhum.

## 15. Riscos remanescentes
- Faturas: respostas sobre integração com Entradas dependem de decisão de produto.
- Suporte: respostas sobre SLA, reabertura, prioridade e chatbot dependem de decisão de produto.

## 16. Recomendação de prontidão para chatbot
- **Faturas:** pronto para uso no chatbot, com as ressalvas de automações marcadas como não-confirmadas.
- **Suporte:** pronto para uso no chatbot, deixando explícito que SLA, reabertura, prioridade e chatbot interno ainda não foram confirmados oficialmente.
