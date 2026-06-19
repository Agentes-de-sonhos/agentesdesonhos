# Relatório de Entrega — Subonda 1D

**Data:** 2026-06-19
**Escopo:** Roteiros e Financeiro — Visão Geral

## Status geral
**CONCLUÍDA COM PENDÊNCIAS PONTUAIS.** Todas as entregas documentais previstas foram produzidas e publicadas em RAG. Restam apenas decisões de produto.

## Resultado por módulo

| Módulo | FAQs revisadas | Novas FAQs confirmadas | FAQs pendentes | Tutoriais | Problemas comuns | Boas práticas | Novos chunks | Status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Roteiros | 0 (FAQ era placeholder) | 20 | 0 | 8 | 5 | 4 | 37 | concluído com pendências pontuais |
| Financeiro — Visão Geral | 20 (mantidas) | 20 | 0 | 8 | 5 | 4 | 37 | concluído com pendências pontuais |

## Métricas
- Arquivos criados: ~70
- Arquivos atualizados: 10 (mapas, faqs, manifesto, índice de chunks, base RAG, relatórios)
- Conteúdos confirmados: 74
- Conteúdos pendentes: 0
- Correções de cobertura anterior: 0
- IDs duplicados: 0
- Duplicidades semânticas: 0
- Links quebrados: 0
- Total de chunks antes: 334
- Novos chunks: 74
- Total de chunks depois: 408
- Cobertura antes: Onda 1 + 1B + 1C
- Cobertura depois: + Roteiros + Financeiro Visão Geral

## Validações
- JSON do manifesto: válido (`MANIFESTO-RAG.json`, version `1.3.0`, `total_chunks: 408`).
- JSONL: 408 linhas, todas parseáveis em JSON.
- IDs duplicados: 0 (script de geração rejeita reinclusão).
- Linhas inválidas: 0.
- Campos obrigatórios ausentes: 0.
- Conteúdos pendentes incluídos por engano: 0.
- Coerência entre índice, manifesto e JSONL: OK.

## Auditoria das versões públicas de Roteiros

| Item | Resultado |
| --- | --- |
| Versões encontradas | `RoteiroPublico.tsx` (V1) e `RoteiroPublicoV2.tsx` (V2). |
| Rota tradicional (App.tsx) | `/roteiro/:token` → **V1**. |
| Domínios white-label (`seuroteiro.tur.br`) | Usam `PublicCodeResolver`, que renderiza **V2** quando o recurso resolvido é `itinerary`. |
| Versão considerada oficial | **Pendente de confirmação do proprietário.** V1 é a rota direta; V2 é renderizada pelo white-label. |
| Conteúdos afetados | Todas as orientações ao usuário foram escritas em termos genéricos ("clique em Compartilhar", "abra o link") evitando depender de elementos visuais exclusivos de cada versão. Nenhum chunk foi excluído do RAG. |
| Conteúdos excluídos do RAG | Nenhum. |

## Limites do Financeiro — Visão Geral
- **Documentado:** acesso ao módulo, abas existentes, conceitos (venda, entrada, despesa, fatura, comissão), filtros, exportações, leitura do dashboard, fórmula de lucro líquido.
- **Não documentado (reservado para outras subondas):** passo a passo de criação/edição de venda, entrada, despesa, fatura, comissão e configuração de vendedor.
- **Não entrou no RAG por ausência de confirmação:** nenhum novo conteúdo desta subonda — todos os 74 novos chunks são `confirmado/pronto`.

## Perguntas ao proprietário
1. Qual versão pública do roteiro é a oficial: rota tradicional `/roteiro/:token` (V1) ou domínio `seuroteiro.tur.br` (V2)?
2. Quais são as quotas exatas de geração por IA em Roteiros por plano (Start, Profissional, Premium)?
3. As fórmulas dos demais indicadores do dashboard financeiro (faturamento previsto, fluxo de caixa etc.) podem ser confirmadas?

## Conteúdos não incluídos no RAG
Nenhum.
