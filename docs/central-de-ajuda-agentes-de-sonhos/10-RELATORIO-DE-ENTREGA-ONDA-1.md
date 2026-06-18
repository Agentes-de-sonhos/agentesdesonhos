# Relatório de Entrega — Onda 1

**Data:** 2026-06-18  
**Estratégia adotada (a pedido do proprietário):** esqueleto completo dos 10 módulos da Onda 1 + 1 módulo aprofundado (CRM) como referência de qualidade. FAQs apenas com confiança `confirmado`; déficit registrado.

## Tabela de resultados

| Módulo | FAQs existentes revisadas | Novas FAQs confirmadas | Novas FAQs pendentes | Tutoriais | Problemas comuns | Boas práticas | Novos chunks RAG | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| CRM e Oportunidades | 20 | 20 | 0 | 8 | 5 | 4 | 37 | concluído |
| Gestão de Clientes | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |
| Operações | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |
| Orçamentos | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |
| Carteira Digital | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |
| Roteiros | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |
| Financeiro — Visão Geral | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |
| Vendas | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |
| Comissões e Vendedores | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |
| Equipe e Permissões | 0 | 0 | 20 | 0 | 0 | 0 | 0 | bloqueado por informação |

## Totais
- Arquivos criados: 26 (8 tutoriais CRM + 5 problemas CRM + 4 boas práticas CRM + 9 mapas de Onda 1 + este relatório + resumo executivo).
- Arquivos atualizados: 4 (FAQ CRM, BASE-RAG.jsonl, INDICE-DE-CHUNKS.md, MANIFESTO-RAG.json).
- FAQs existentes revisadas: 20 (CRM).
- Novas FAQs confirmadas: 20 (CRM).
- FAQs pendentes (déficit registrado): 180 (9 módulos × 20).
- Tutoriais novos: 8.
- Problemas comuns novos: 5.
- Boas práticas novas: 4.
- Novos chunks RAG confirmados: 37.
- Total atual de chunks em `BASE-RAG.jsonl`: 187.
- Conteúdos não incluídos no RAG: todos os 9 mapas de produção (`status: bloqueado-por-informação`, `confianca: pendente`).

## Validações
- JSON do manifesto: **válido**.
- JSONL `BASE-RAG.jsonl`: **válido** (187 linhas, 1 objeto por linha).
- IDs duplicados: **0**.
- Links quebrados detectados no CRM: nenhum (todos os links relativos apontam para arquivos existentes).
- Duplicidades semânticas entre as 20 novas FAQs e as 20 existentes: nenhuma.

## Cobertura
- Antes da Onda 1: ~55% estrutural / FAQ aprofundada em 5 módulos.
- Depois da Onda 1: ~60% estrutural / CRM com cobertura completa (FAQs + tutoriais + problemas + boas práticas + RAG).

## Lacunas remanescentes (decisões do proprietário)
1. Confirmar qual versão pública é oficial em Orçamentos, Carteira Digital e Roteiros antes de redigir tutoriais públicos.
2. Confirmar se marcar oportunidade como Ganha cria venda automaticamente.
3. Confirmar fluxo exato de exclusão em cascata entre Venda, Comissão e Despesa.
4. Confirmar mapa de planos × módulos (Start / Profissional / Premium) para todos os 10 módulos.
5. Confirmar quais permissões de equipe são bloqueio efetivo (backend) vs. apenas restrição visual.
6. Confirmar regras de cálculo de comissão (percentual, fixa, sobre valor vendido vs recebido).
7. Confirmar comportamento de importação de contatos (limites, modelo oficial, deduplicação).
8. Confirmar interpretação oficial dos indicadores do Dashboard Financeiro.
9. Confirmar SLAs e regras de pós-venda em Operações.
10. Confirmar regras de cliente × passageiro × viajante.

## Mudanças em conteúdos existentes
- `modulos/crm/faq/00-perguntas-frequentes.md`: **append** de 20 novas FAQs (crm-faq-21..40). Nenhuma FAQ anterior foi alterada ou removida; nenhum ID estável foi modificado.
- `rag/BASE-RAG.jsonl`: **append** de 37 novos objetos. Nenhum objeto anterior foi modificado.
- `rag/INDICE-DE-CHUNKS.md`: **append** de seção "Atualização Onda 1".
- `rag/MANIFESTO-RAG.json`: versão incrementada para 1.1.0 e adicionada chave `waves.onda-1`. Estrutura anterior preservada.

## Segurança e escopo
- Nenhum código de aplicação, banco, política, migration, Edge Function, integração ou configuração foi tocado.
- Nenhum arquivo da Base de Conhecimento Mestre (`docs/base-conhecimento-agentes-de-sonhos/`) foi alterado.
- Apenas arquivos dentro de `docs/central-de-ajuda-agentes-de-sonhos/` foram criados ou atualizados.

## Próxima ação recomendada
Validar com o proprietário as 10 lacunas listadas e autorizar a próxima sub-rodada da Onda 1 (escolha sugerida: Gestão de Clientes + Operações), seguindo o mesmo padrão de qualidade aplicado ao CRM.
