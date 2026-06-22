# Resumo para Revisão Externa — Subonda 2C

Data: 2026-06-22

## 1. Resumo executivo

A Subonda 2C entregou a documentação aprofundada de **Configurações, Conta e Onboarding** e **Agenda**, com 40 novas FAQs canônicas, 20 tutoriais, 10 problemas comuns e 8 boas práticas, totalizando **78 novos chunks** adicionados ao RAG. O total geral passou de 686 para 764 chunks. Nenhum conteúdo pendente foi incluído.

## 2. Resultado de Configurações, Conta e Onboarding

- 20 FAQs canônicas confirmadas (`cf-faq-01` a `cf-faq-20`).
- 10 tutoriais (`cf-tut-01` a `cf-tut-10`).
- 5 problemas comuns (`cf-prob-01` a `cf-prob-05`).
- 4 boas práticas (`cf-bp-01` a `cf-bp-04`).
- 39 novos chunks no RAG.

## 3. Resultado de Agenda

- 20 FAQs canônicas confirmadas (`ag-faq-01` a `ag-faq-20`), substituindo as 10 perguntas pendentes anteriores (`agenda-faq-01` a `agenda-faq-10`) que permaneceram no índice antigo apenas como histórico.
- 10 tutoriais (`ag-tut-01` a `ag-tut-10`).
- 5 problemas comuns (`ag-prob-01` a `ag-prob-05`).
- 4 boas práticas (`ag-bp-01` a `ag-bp-04`).
- 39 novos chunks no RAG.

## 4. Métricas

- Total de chunks antes: 686.
- Novos chunks: 78.
- Total de chunks depois: 764.
- IDs duplicados: 0.
- Linhas inválidas no JSONL: 0.
- Campos obrigatórios ausentes nos novos chunks: 0.

## 5. Arquivos criados (principais)

- `modulos/configuracoes/00-mapa-onda-2.md`
- `modulos/configuracoes/tutoriais/cf-tut-01.md` a `cf-tut-10.md`
- `modulos/configuracoes/problemas-comuns/cf-prob-01.md` a `cf-prob-05.md`
- `modulos/configuracoes/boas-praticas/cf-bp-01.md` a `cf-bp-04.md`
- `modulos/agenda/00-mapa-onda-2.md`
- `modulos/agenda/tutoriais/ag-tut-01.md` a `ag-tut-10.md`
- `modulos/agenda/problemas-comuns/ag-prob-01.md` a `ag-prob-05.md`
- `modulos/agenda/boas-praticas/ag-bp-01.md` a `ag-bp-04.md`
- `29-RELATORIO-DE-ENTREGA-ONDA-2C.md`
- `30-RESUMO-PARA-REVISAO-ONDA-2C.md`

## 6. Arquivos atualizados

- `modulos/configuracoes/faq/00-perguntas-frequentes.md` (substituído por 20 FAQs canônicas).
- `modulos/agenda/faq/00-perguntas-frequentes.md` (substituído por 20 FAQs canônicas).
- `rag/BASE-RAG.jsonl` (+78 chunks).
- `rag/MANIFESTO-RAG.json` (versão 2.2.0, total 764).
- `rag/INDICE-DE-CHUNKS.md` (nova seção Subonda 2C).

## 7. Decisões tomadas

- Adotado prefixo `cf-` para Configurações e `ag-` para Agenda nos novos artigos e chunks, preservando IDs antigos (`configuracoes-*` e `agenda-*`).
- Os 10 FAQs anteriores de Agenda (`agenda-faq-01..10`), marcados como `revisão-necessária/pendente`, foram **substituídos** pelo novo conjunto canônico `ag-faq-*`.
- Os 74 chunks legados de esquema antigo identificados na Subonda 2B **não foram normalizados** nesta execução, conforme regra para a Subonda 2D.

## 8. Limites aplicados a Configurações, Conta e Onboarding

Ver seção correspondente em `29-RELATORIO-DE-ENTREGA-ONDA-2C.md`.

## 9. Limites aplicados a Agenda

Ver seção correspondente em `29-RELATORIO-DE-ENTREGA-ONDA-2C.md`.

## 10. Divergências encontradas

Nenhuma divergência crítica entre Base de Conhecimento Mestre e implementação. Pontos com requisito de confirmação foram listados como perguntas ao proprietário.

## 11. Perguntas pendentes

Sete decisões listadas em `29-RELATORIO-DE-ENTREGA-ONDA-2C.md`.

## 12. Validação do RAG

- Manifesto JSON: válido.
- JSONL: válido, total de linhas 764, 0 linhas inválidas.
- IDs duplicados: nenhum.
- Campos obrigatórios ausentes nos novos chunks: nenhum.
- Pendência dos 74 chunks legados com esquema antigo: registrada para tratamento na Subonda 2D.

## 13. Três exemplos representativos por módulo

### Configurações, Conta e Onboarding
- `cf-faq-13` — Como acesso o portal de pagamentos e baixo minhas faturas da assinatura?
- `cf-tut-05` — Concluir o onboarding inicial.
- `cf-bp-01` — Mantenha os dados da agência sempre atualizados.

### Agenda
- `ag-faq-10` — Como conecto o Google Calendar à minha Agenda?
- `ag-tut-08` — Conectar o Google Calendar.
- `ag-prob-04` — Sincronização com Google Calendar não atualiza eventos.

## 14. Conteúdos excluídos do RAG

Nenhum nesta entrega.

## 15. Riscos remanescentes

- Sete decisões de produto ainda pendentes podem alterar trechos pontuais dos artigos.
- Os 74 chunks legados continuarão visíveis com esquema antigo até a Subonda 2D.

## 16. Recomendação de prontidão de cada módulo para o chatbot

- **Configurações, Conta e Onboarding:** pronto para uso no chatbot.
- **Agenda:** pronto para uso no chatbot, com ressalva para perguntas específicas de bidirecionalidade do Google Calendar e recorrência (ainda pendentes).
