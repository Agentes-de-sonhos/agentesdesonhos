# Relatório de entrega — Onda 2 / Subonda 2A (Entradas + Despesas)

Data: 2026-06-19
Status global da Subonda 2A: **concluído**.

## Tabela consolidada

| Módulo | FAQs existentes revisadas | Novas FAQs confirmadas | FAQs pendentes | Tutoriais | Problemas comuns | Boas práticas | Novos chunks | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Entradas | 0 | 20 | 0 | 10 | 5 | 4 | 41 | concluído |
| Despesas | 0 | 20 | 0 | 10 | 5 | 4 | 41 | concluído |
| **Total** | **0** | **40** | **0** | **20** | **10** | **8** | **82** |  |

> A pasta legada `modulos/entradas-despesas/` (combinada) permanece como redirecionamento histórico. A Subonda 2A criou duas pastas independentes `modulos/entradas/` e `modulos/despesas/`, alinhadas ao escopo aprovado.

## Métricas

- Arquivos criados: 60 novos arquivos (`entradas/`: 30, `despesas/`: 30).
- Arquivos atualizados: `rag/BASE-RAG.jsonl`, `rag/INDICE-DE-CHUNKS.md`, `rag/MANIFESTO-RAG.json`, `08-RELATORIO-DE-COBERTURA.md`.
- Conteúdos confirmados: 82 chunks (todos com `status: pronto` e `confianca: confirmado`).
- Conteúdos pendentes: 0.
- Correções de cobertura anterior: 0 (não foram identificadas FAQs confirmadas órfãs do RAG).
- IDs duplicados detectados: 0.
- Duplicidades semânticas detectadas: 0.
- Links quebrados detectados: 0 dentro dos novos artigos.
- Total de chunks antes: 526.
- Novos chunks: 82.
- Total de chunks depois: 608.
- Cobertura antes: Entradas e Despesas marcados como "em construção" no relatório de cobertura.
- Cobertura depois: Entradas e Despesas marcados como "Pronto" e migrados para módulos independentes.

## Validações

- JSON do manifesto (`MANIFESTO-RAG.json`): válido após parse com `json.loads` durante a geração.
- JSONL (`BASE-RAG.jsonl`): 608 linhas válidas — cada linha foi parseada como objeto JSON na geração.
- Total de linhas: 608.
- IDs duplicados: 0.
- Linhas vazias relevantes: 0.
- Campos obrigatórios ausentes: 0.
- Status inválidos: 0.
- Conteúdos pendentes incluídos por engano: 0.
- Coerência entre índice, manifesto e JSONL: confirmada (manifesto v2.0.0 reflete `total_chunks: 608`).

## Limites de Entradas

- Documentados: criação, edição, exclusão, tipos 'Já recebi' / 'Vou receber', baixa por botão **Recebido**, cards do mês, badges (A receber, Recebida, Atrasada, Automática), vínculo com venda, filtros por aba, exportação, mensagens de validação e permissão geral via Financeiro.
- Deixado intencionalmente para outros módulos:
  - **Vendas:** geração de venda e gestão da venda em si.
  - **Faturas:** ciclo de cobrança/parcelas (Subonda 2B).
  - **Comissões e Vendedores:** cálculo e regras de comissão.
  - **Financeiro — Visão Geral:** fórmulas e composição global do dashboard.
- Automações confirmadas: entrada automática a partir de venda (badge **⚡ Automática**), marcação automática de "Atrasada" quando `expected_date < hoje`.
- Automações que permaneceram pendentes: criação automática a partir de fatura (ainda não documentado nesta subonda — pertence a 2B).
- Conteúdos que não entraram no RAG por ausência de confirmação: nenhum.

## Limites de Despesas

- Documentados: criação, edição, exclusão, categorias, tipos **Fixa** e **Variável**, recorrência (sem data final / até data / parcelas), projeções (badge **Recorrência**), filtro por vendedor, exportação, cards do mês, sugestão automática de categoria, geração de despesa de comissão de vendedor.
- Deixado intencionalmente para outros módulos:
  - **Vendas:** criação da venda que origina a comissão.
  - **Faturas:** documentos de fornecedor (Subonda 2B).
  - **Comissões e Vendedores:** cálculo da comissão em si.
  - **Financeiro — Visão Geral:** consolidação no dashboard global.
- Automações confirmadas: geração de despesa de comissão a partir de vendas com vendedor, projeção mês a mês de despesas fixas conforme `recurrence_end_type`.
- Automações que permaneceram pendentes: baixa por status (pago/pendente) — atualmente não há botão dedicado de baixa por status.
- Conteúdos que não entraram no RAG por ausência de confirmação: nenhum.

## Perguntas ao proprietário

1. Despesas terão fluxo nativo de baixa por status (pago/atrasado) em versão futura?
2. Entradas e Despesas receberão upload de comprovantes?
3. Entradas suportarão recorrência nativa (similar às despesas fixas)?
4. Deve existir botão de "reverter recebimento" em Entradas?
5. Despesas terão campo de vínculo direto com Fornecedor (separado da categoria)?

## Conteúdos não incluídos no RAG

Nenhum nesta subonda. Todos os artigos produzidos foram classificados como `status: pronto` e `confianca: confirmado`.
