# Relatório de Entrega — Subonda 1B

**Data:** 2026-06-18
**Módulos:** Gestão de Clientes, Operações

## Resumo por módulo

| Módulo | FAQs revisadas | Novas FAQs | FAQs pendentes | Tutoriais | Problemas | Boas práticas | Novos chunks | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Gestão de Clientes | 0 (placeholder substituído) | 20 | 0 | 8 | 5 | 4 | 37 | Parcialmente concluído |
| Operações | 0 (placeholder substituído) | 20 | 0 | 8 | 5 | 4 | 37 | Parcialmente concluído |
| **Total** |  | **40** | 0 | **16** | **10** | **8** | **74** |  |

## Arquivos criados (resumo)
- `modulos/gestao-clientes/faq/00-perguntas-frequentes.md` (20 FAQs)
- `modulos/gestao-clientes/tutoriais/01..08-*.md`
- `modulos/gestao-clientes/problemas-comuns/01..05-*.md`
- `modulos/gestao-clientes/boas-praticas/01..04-*.md`
- `modulos/operacoes/faq/00-perguntas-frequentes.md` (20 FAQs)
- `modulos/operacoes/tutoriais/01..08-*.md`
- `modulos/operacoes/problemas-comuns/01..05-*.md`
- `modulos/operacoes/boas-praticas/01..04-*.md`

## Arquivos atualizados
- `modulos/gestao-clientes/00-mapa-onda-1.md` (status: parcialmente-concluído)
- `modulos/operacoes/00-mapa-onda-1.md` (status: parcialmente-concluído)
- `rag/BASE-RAG.jsonl` (+74 chunks)
- `rag/INDICE-DE-CHUNKS.md`
- `rag/MANIFESTO-RAG.json` (v1.1.0 → v1.2.0)

## Validações
- JSON do manifesto: válido.
- JSONL: total 261 linhas, **0 IDs duplicados**, **0 linhas inválidas**.
- IDs duplicados detectados: nenhum.
- Links quebrados: não detectados nos arquivos criados.
- Duplicidades semânticas com CRM: evitadas (CRM trata negociação; Clientes trata cadastro; Operações trata pós-venda).
- Conteúdos pendentes excluídos do RAG: sim — apenas chunks com `status: pronto` + `confianca: confirmado` foram incluídos.

## Cobertura
- Antes (após Subonda 1A): 187 chunks RAG / cobertura ~58% (estimada).
- Depois (Subonda 1B): 261 chunks RAG / cobertura estimada ~67%.

## Conteúdos pendentes (déficits explicitados)
**Gestão de Clientes**
1. Comportamento exato ao excluir cliente com vínculos a vendas/operações/orçamentos.
2. Lista completa de status disponíveis em Filtrar status.
3. Mapa por plano (campo `plano` permanece `não-confirmado`).

**Operações**
4. A operação é criada automaticamente a partir de uma venda? Em que momento?
5. Existe fluxo formal de reabertura de operação encerrada?
6. Notificações próprias do módulo (quando disparam, para quem?).
7. Política de exclusão definitiva (afeta histórico financeiro?).
8. Mapa por plano (campo `plano` permanece `não-confirmado`).

## Perguntas ao proprietário do produto
- Validar respostas para os 8 itens acima.
- Confirmar planos exatos que liberam Gestão de Clientes e Operações.
- Confirmar se há permissões granulares específicas para Operações (ex: editar pipeline vs apenas operações).

## Segurança
Confirmado: nenhuma alteração em código, banco, migrations, políticas, integrações, configurações ou na Base de Conhecimento Mestre. Todas as mudanças concentram-se em `docs/central-de-ajuda-agentes-de-sonhos/`.
