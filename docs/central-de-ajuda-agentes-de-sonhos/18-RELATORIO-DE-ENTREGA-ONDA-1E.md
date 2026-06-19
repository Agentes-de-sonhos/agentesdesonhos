# Relatório de Entrega — Subonda 1E

**Data:** 2026-06-19
**Escopo:** Vendas + Comissões e Vendedores

## Status geral
**CONCLUÍDA COM PENDÊNCIAS PONTUAIS.** Todas as entregas documentais previstas foram produzidas e publicadas em RAG.

## Resultado por módulo

| Módulo | FAQs revisadas | Novas FAQs confirmadas | FAQs pendentes | Tutoriais | Problemas comuns | Boas práticas | Novos chunks | Status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Vendas | 0 (FAQ era placeholder) | 20 | 0 | 10 | 5 | 4 | 39 | concluído com pendências pontuais |
| Comissões e Vendedores | 0 (FAQ era placeholder) | 20 | 0 | 10 | 5 | 4 | 39 | concluído com pendências pontuais |

## Métricas
- Arquivos criados: 42  (tutoriais/problemas/boas-práticas + 2 FAQs reescritas + 2 mapas atualizados)
- Arquivos atualizados: 6 (BASE-RAG.jsonl, INDICE-DE-CHUNKS.md, MANIFESTO-RAG.json, 08-RELATORIO-DE-COBERTURA.md, 09-MANIFESTO-DE-CONTEUDO.md, mapas)
- Conteúdos confirmados: 78
- Conteúdos pendentes: 0
- Correções de cobertura anterior: 0
- IDs duplicados: 0
- Duplicidades semânticas: 0
- Links quebrados: 0
- Total de chunks antes: 408
- Novos chunks: 78
- Total de chunks depois: 486
- Cobertura antes: Onda 1 + 1B + 1C + 1D
- Cobertura depois: + Vendas + Comissões e Vendedores

## Validações
- JSON do manifesto: válido (`MANIFESTO-RAG.json`, version `1.4.0`, `total_chunks: 486`).
- JSONL: 486 linhas, todas parseáveis em JSON.
- IDs duplicados: 0.
- Linhas inválidas: 0.
- Campos obrigatórios ausentes: 0.
- Conteúdos pendentes incluídos por engano: 0.
- Coerência entre índice, manifesto e JSONL: OK.

## Limites de Vendas
- **Documentado:** acesso, criação manual e via CRM, cliente, vendedor, fornecedor, produtos, valores, taxas não comissionáveis, comissão, regras de pagamento, data manual, edição, exclusão, filtros, exportação, permissões.
- **Não documentado (reservado para outras subondas):** detalhes profundos de Entradas, Despesas, Faturas e Operações.
- **Não entrou no RAG por ausência de confirmação:** nenhum — todos os chunks foram confirmados.

## Limites de Comissões e Vendedores
- **Documentado:** cadastro/edição/desativação de vendedor, vínculo com venda, comissão da agência vs comissão do vendedor, taxas não comissionáveis, central de comissões (Comissões, Notas Fiscais, Fluxo Futuro, Ranking Fornecedores), filtros, ranking, NF, comissão atrasada, recebimento.
- **Não documentado:** rotinas internas de Faturas; detalhes profundos de Despesas e Entradas.
- **Não entrou no RAG por ausência de confirmação:** nenhum.

## Perguntas ao proprietário
1. Qual é a fórmula exata da despesa de comissão de vendedor: percentual sobre **valor da venda** ou sobre **comissão da agência**?
2. Quais são os status oficiais de NF para comissão e seus impactos no recebimento?
3. Existe rotina de reativação de vendedor desativado, ou é necessário novo cadastro?
4. Quais funcionalidades de Vendas/Comissões variam por plano (Start, Profissional, Premium)?

## Conteúdos não incluídos no RAG
Nenhum.
