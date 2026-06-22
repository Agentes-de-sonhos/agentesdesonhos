# Decisões do proprietário — Onda 2 (consolidadas para Chatbot MVP)

Data original: 2026-06-22
Data de resolução para MVP: 2026-06-22
Status global: **Resolvidas para MVP** (modo conservador, com fallback obrigatório no chatbot).
Escopo: módulos da Onda 2 (Entradas, Despesas, Faturas, Suporte, Configurações/Conta/Onboarding, Agenda).

> Histórico: as 19 decisões abaixo estavam pendentes até 2026-06-22 e foram consolidadas pelo proprietário nesta data exclusivamente para liberar o planejamento do Chatbot MVP. Cada decisão adota a postura mais segura disponível no momento; automações e recursos não confirmados permanecem como evolução futura de produto.

## Visão geral

| ID | Módulo | Pergunta original | Decisão oficial para o MVP | Fallback do chatbot | Evolução futura? | Status |
|---|---|---|---|---|---|---|
| DP-O2-01 | Faturas / Entradas | Pagamento de fatura deve criar Entrada automaticamente? | Não criar Entrada automaticamente; fatura e Entrada são registros independentes. | "O pagamento da fatura não deve ser tratado como entrada automática, salvo confirmação do sistema. Confira ou registre a entrada manualmente, conforme o fluxo disponível." | Sim | Resolvida para MVP |
| DP-O2-02 | Faturas | Cancelar vs. excluir fatura com pagamento? | Fatura com pagamento registrado não deve ser excluída automaticamente; preservar histórico. | "Não recomendo excluir fatura com pagamento registrado. Use o cancelamento, se disponível, ou abra um chamado de suporte para preservar o histórico financeiro." | Sim (regra oficial de cancelamento) | Resolvida para MVP |
| DP-O2-03 | Faturas | Emissão integrada de NF? | Não prometer NF integrada no MVP; tratar como processo externo. | "A emissão integrada de nota fiscal não está confirmada no MVP. Use o processo fiscal habitual da agência." | Sim | Resolvida para MVP |
| DP-O2-04 | Suporte | SLA oficial de resposta? | Não definir SLA público no MVP. | "O suporte acompanha os chamados, mas ainda não há prazo oficial de resposta documentado." | Sim | Resolvida para MVP |
| DP-O2-05 | Suporte | Reabertura formal de chamados? | Não reabrir formalmente; orientar novo chamado mencionando o anterior. | "Se o chamado já foi resolvido e o problema continua, abra um novo chamado explicando a continuidade e mencione o chamado anterior, se possível." | Possível | Resolvida para MVP |
| DP-O2-06 | Suporte | Prioridade visível em tickets? | Não exibir campo de prioridade ao usuário no MVP. | "Descreva a urgência no texto do chamado. O campo de prioridade visível ao usuário ainda não está confirmado." | Possível | Resolvida para MVP |
| DP-O2-07 | Agenda | Sincronização bidirecional total com Google Calendar? | Não afirmar bidirecionalidade total; descrever apenas o comportamento confirmado. | "A sincronização com Google Calendar deve ser usada conforme o fluxo confirmado na plataforma. Não assuma sincronização bidirecional em todos os cenários." | Sim | Resolvida para MVP |
| DP-O2-08 | Agenda | Recorrência nativa de eventos? | Não prometer recorrência nativa no MVP. | "Para eventos recorrentes, cadastre os compromissos manualmente até que a recorrência nativa esteja confirmada." | Sim | Resolvida para MVP |
| DP-O2-09 | Agenda | Notificações automáticas para eventos próximos? | Não prometer notificações automáticas por e-mail/push no MVP. | "Use a Agenda para consulta e organização. Notificações automáticas por e-mail ou push ainda dependem de confirmação." | Sim | Resolvida para MVP |
| DP-O2-10 | Configurações | Propagação automática de logo/cor para links públicos antigos? | Não garantir propagação automática; orientar revisão manual. | "Após alterar logo ou cor principal, revise os links públicos importantes para confirmar se a identidade visual foi atualizada como esperado." | Sim | Resolvida para MVP |
| DP-O2-11 | Configurações | Alteração do e-mail principal pelo usuário? | E-mail principal não deve ser alterado livremente no MVP; encaminhar suporte. | "Para alterar o e-mail principal da conta, abra um chamado de suporte." | Sim | Resolvida para MVP |
| DP-O2-12 | Onboarding | Retomada do onboarding em contas reativadas? | Não refazer onboarding se já concluído, salvo informação obrigatória pendente. | "Após reativar uma conta, revise os dados da conta e da agência. O onboarding só deve aparecer novamente se houver informação obrigatória pendente." | Possível | Resolvida para MVP |
| DP-O2-13 | Configurações / Equipe | Quem pode editar dados da agência? | Apenas titular/admin no MVP; equipe só com permissão explícita confirmada. | "Dados da agência devem ser alterados pelo titular ou por perfil autorizado. Se você não encontrar a opção, peça ao titular da conta." | Sim (mapa de permissões) | Resolvida para MVP |
| DP-O2-14 | Entradas | Recorrência nativa em Entradas? | Não prometer recorrência nativa no MVP. | "Registre entradas recorrentes manualmente até que a recorrência nativa em Entradas esteja confirmada." | Sim | Resolvida para MVP |
| DP-O2-15 | Despesas | Baixa por status (pago/atrasado) automatizada? | Baixa de Despesas é manual no MVP; não prometer automação. | "Atualize o status da despesa manualmente, conforme o fluxo disponível na plataforma." | Sim | Resolvida para MVP |
| DP-O2-16 | Entradas / Despesas | Upload de comprovantes? | Não prometer upload de comprovantes no MVP. | "Se precisar guardar comprovantes, use o processo externo da agência até que o upload de comprovantes em Entradas e Despesas esteja confirmado." | Sim | Resolvida para MVP |
| DP-O2-17 | Entradas / Despesas | Excluir registro vinculado a venda/fatura? | Não orientar exclusão automática; encaminhar suporte/revisão manual. | "Não exclua registros financeiros vinculados sem conferência. Para evitar desbalanceamento financeiro, abra um chamado de suporte ou revise com o responsável financeiro." | Sim (regra oficial) | Resolvida para MVP |
| DP-O2-18 | Faturas | Notificação automática de vencimento? | Não prometer notificação automática de vencimento no MVP. | "Acompanhe vencimentos pela área de Faturas. Notificações automáticas de vencimento ainda dependem de confirmação." | Sim | Resolvida para MVP |
| DP-O2-19 | Suporte | Chatbot disponível no MVP? | Apresentar como **Assistente da Central de Ajuda**, não como suporte humano nem executor de ações. | "Sou o Assistente da Central de Ajuda do Agentes de Sonhos. Posso orientar com base na documentação da plataforma e indicar o suporte humano quando a situação exigir análise específica." | Sim (evolução do escopo do bot) | Resolvida para MVP |

## Impacto no chatbot
- Todas as 19 decisões geram fallback obrigatório registrado em `chatbot/FALLBACK-E-ESCALONAMENTO.md`.
- Tópicos não publicáveis (NF integrada, SLA, bidirecionalidade total, recorrência nativa, upload de comprovantes, automações financeiras não confirmadas, exclusões financeiras sensíveis, alteração livre de e-mail, papel do bot como suporte humano ou executor de ações) registrados em `chatbot/CONTEUDOS-NAO-PUBLICAVEIS.md`.
- O chatbot deve sempre encaminhar ao suporte humano em situações sensíveis (financeiro, conta, segurança, identidade visual de links públicos críticos).

## Necessidades futuras
- Definir regra oficial de cancelamento de fatura paga (DP-O2-02).
- Avaliar e documentar SLA público (DP-O2-04).
- Especificar direção e cenários da sincronização com Google Calendar (DP-O2-07).
- Roadmap de recorrência nativa (Agenda, Entradas, Despesas — DP-O2-08, 14, 15).
- Roadmap de notificações automáticas (Agenda e Faturas — DP-O2-09, 18).
- Política de propagação de identidade visual em links públicos antigos (DP-O2-10).
- Fluxo seguro para alteração do e-mail principal (DP-O2-11).
- Mapa formal de permissões para edição de dados da agência (DP-O2-13).
- Política de upload de comprovantes (DP-O2-16).
- Regra oficial de impacto de exclusão de registros vinculados (DP-O2-17).
- Evolução futura do escopo do chatbot além do papel de Assistente da Central de Ajuda (DP-O2-19).

> Estas decisões foram consolidadas para liberar o Chatbot MVP. O detalhamento operacional para o assistente está no arquivo `37-DECISOES-RESOLVIDAS-CHATBOT-MVP.md`.