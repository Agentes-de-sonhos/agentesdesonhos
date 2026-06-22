# Relatório de Entrega — Subonda 2C (Configurações, Conta e Onboarding + Agenda)

Data: 2026-06-22  
Status: **Concluída com pendências pontuais.**

| Módulo | FAQs existentes revisadas | Novas FAQs confirmadas | FAQs pendentes | Tutoriais | Problemas comuns | Boas práticas | Novos chunks | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Configurações, Conta e Onboarding | 0 | 20 | 0 | 10 | 5 | 4 | 39 | Concluído com pendências pontuais |
| Agenda | 10 (substituídas) | 20 | 0 | 10 | 5 | 4 | 39 | Concluído com pendências pontuais |
| **Total** | **10** | **40** | **0** | **20** | **10** | **8** | **78** | — |

## Métricas

- Arquivos criados: 1 mapa + 20 FAQs (consolidadas em 2 arquivos) + 20 tutoriais + 10 problemas comuns + 8 boas práticas + 1 relatório + 1 resumo + 1 mapa = artigos individuais sob `modulos/configuracoes/` e `modulos/agenda/`.
- Arquivos atualizados: `BASE-RAG.jsonl`, `MANIFESTO-RAG.json`, `INDICE-DE-CHUNKS.md`, FAQs de Configurações e Agenda.
- Conteúdos confirmados: 78.
- Conteúdos pendentes: 0 nesta subonda.
- IDs duplicados: 0.
- Duplicidades semânticas: 0 identificadas.
- Links quebrados: 0 identificados.
- Total de chunks antes: 686.
- Novos chunks: 78.
- Total de chunks depois: 764.

## Validações

- JSON do manifesto: válido.
- JSONL: válido (total de linhas 764, linhas inválidas 0).
- IDs duplicados: nenhum.
- Campos obrigatórios ausentes nos novos chunks: nenhum.
- Chunks legados com esquema antigo (74 chunks): **mantidos sem alteração** nesta execução, conforme regra para Subonda 2D.
- Conteúdos pendentes excluídos: nenhum produzido como pendente.
- Coerência entre manifesto, índice e JSONL: confirmada.

## Limites de Configurações, Conta e Onboarding

- Tópicos documentados: dados pessoais, dados da agência, identidade visual (logotipo e cor), onboarding inicial e edição posterior, gerenciamento básico da assinatura visível em Minha Conta (plano atual, portal de pagamentos e cancelamento), Atualizações.
- Tópicos deixados para outros módulos: comparativo e contratação de planos (Planos e Assinatura), matriz completa de permissões (Equipe e Permissões), recursos administrativos.
- Fluxos confirmados: editar perfil, trocar logotipo, alterar cor, concluir onboarding, abrir portal de pagamentos, cancelar assinatura.
- Fluxos pendentes de confirmação: alteração de e-mail principal da conta; propagação automática de marca a links públicos existentes.
- Conteúdos fora do RAG por ausência de confirmação: nenhum.

## Limites de Agenda

- Tópicos documentados: criação/edição/exclusão de eventos, tipos personalizados, eventos pré-definidos do trade, destaque, filtros, visualizações dia/semana/mês/ano, integração com Google Calendar (conectar/sincronizar/desconectar), relação com follow-ups do CRM e dashboard.
- Tópicos deixados para outros módulos: gerenciamento de oportunidades (CRM), tarefas operacionais (Operações), permissões detalhadas (Equipe).
- Fluxos confirmados: criar/editar/excluir evento, alternar visualização, filtrar por tipo, conectar/desconectar/sincronizar Google Calendar.
- Fluxos pendentes de confirmação: bidirecionalidade exata da sincronização com Google Calendar; recorrência configurável; notificações automáticas por e-mail/push.
- Conteúdos fora do RAG por ausência de confirmação: nenhum.

## Perguntas ao proprietário

1. O e-mail principal da conta será editável pelo usuário em algum momento?
2. Alterações de marca (logo/cor) devem propagar automaticamente para links públicos já gerados?
3. A sincronização com o Google Calendar é bidirecional? Em quais cenários?
4. Haverá recorrência configurável em eventos da Agenda?
5. Haverá notificações automáticas (e-mail/push) para eventos próximos?
6. Qual o comportamento oficial de retomada do onboarding em contas reativadas?
7. Quais perfis exatamente podem editar dados da agência?

## Conteúdos não incluídos no RAG

Nenhum conteúdo desta subonda foi excluído do RAG.
