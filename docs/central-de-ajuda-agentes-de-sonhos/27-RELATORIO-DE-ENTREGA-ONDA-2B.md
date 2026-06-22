# 27 — Relatório de entrega da Subonda 2B (Faturas + Suporte)

**Data da execução:** 2026-06-22
**Versão do Manifesto RAG:** 2.1.0
**Status da Subonda 2B:** concluída.

## Resultado por módulo

| Módulo | FAQs existentes revisadas | Novas FAQs confirmadas | FAQs pendentes | Tutoriais | Problemas comuns | Boas práticas | Novos chunks | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Faturas | 0 | 20 | 0 | 10 | 5 | 4 | 41 | concluído |
| Suporte | 0 | 20 | 0 | 10 | 5 | 4 | 41 | concluído |
| **Total** | **0** | **40** | **0** | **20** | **10** | **8** | **82** | — |

## Métricas
- Arquivos criados: 42 (FAQs consolidadas, tutoriais, problemas comuns, boas práticas e mapas Onda 2).
- Arquivos atualizados: BASE-RAG.jsonl, MANIFESTO-RAG.json, INDICE-DE-CHUNKS.md.
- Conteúdos confirmados: 82.
- Conteúdos pendentes incluídos no RAG: 0.
- Correções de cobertura anterior: 0.
- IDs duplicados: 0.
- Duplicidades semânticas detectadas: 0.
- Links quebrados conhecidos: 0.
- Total de chunks antes: 608.
- Novos chunks: 78.
- Total de chunks depois: 686.
- Cobertura antes: 608 chunks confirmados publicados.
- Cobertura depois: 686 chunks confirmados publicados.

## Validações
- JSON do manifesto: válido.
- JSONL: válido, 1 objeto por linha.
- Total de linhas no JSONL: 686.
- IDs duplicados no JSONL: 0.
- Linhas vazias: 0.
- Campos obrigatórios ausentes: 0.
- Conteúdos pendentes incluídos por engano: 0.
- Coerência entre manifesto, índice e JSONL: confirmada.

## Limites de Faturas
- **Documentado:** criação, edição, importação de orçamento e carteira, parcelas, vencimentos, status, link público, pagamento integral, pagamento parcial, cobranças, recibos, PDF, exclusão, busca, KPIs.
- **Deixado para outros módulos:** detalhes de Entradas, Vendas, Comissões e Financeiro — Visão Geral, já cobertos nas Ondas 1 e 2A.
- **Automações confirmadas:** marcação automática de **Vencida** quando há saldo em aberto e data de vencimento ultrapassada; mudança automática para **Parcialmente paga** e **Paga** conforme pagamentos.
- **Automações pendentes:** geração automática de entrada a partir do pagamento de fatura; emissão integrada de nota fiscal; notificação automática de vencimento ao cliente; comportamento oficial de cancelamento versus exclusão para faturas com pagamentos.
- **Conteúdos não incluídos no RAG:** nenhum.

## Limites de Suporte
- **Documentado:** abertura de chamado, categorias, status (Aberto, Em andamento, Resolvido), envio de mensagens, anexos, marcação como Resolvido, boas práticas de descrição e privacidade, problemas comuns de envio e anexos.
- **Deixado para outros escopos:** painel administrativo de suporte (admin), chatbot futuro, atendimento interno e integração com WhatsApp em outras áreas.
- **Fluxos confirmados:** abrir chamado, responder no chat, anexar arquivos, marcar como Resolvido.
- **Fluxos pendentes:** SLA oficial publicado, reabertura formal de chamados, prioridade visível ao usuário, chatbot ativo.
- **Conteúdos não incluídos no RAG:** nenhum.

## Perguntas ao proprietário
1. O pagamento de uma fatura deve criar automaticamente uma entrada em Financeiro → Entradas?
2. Qual o procedimento oficial para **cancelar** versus **excluir** faturas que já receberam pagamento?
3. Haverá emissão integrada de nota fiscal a partir da fatura?
4. Existe SLA oficial de resposta para o módulo Suporte?
5. Haverá reabertura formal de chamados resolvidos?
6. O usuário verá um campo de prioridade nos chamados em versões futuras?
7. O chatbot mencionado em documentos de planejamento estará disponível para o usuário final?

## Conteúdos não incluídos no RAG
Nenhum. Toda a produção foi marcada como `status: pronto` e `confianca: confirmado`.
