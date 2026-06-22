# Decisões resolvidas para o Chatbot MVP — Onda 2

Data de resolução: 2026-06-22
Fonte: `31-DECISOES-PENDENTES-PROPRIETARIO-ONDA-2.md`
Aplicação operacional: `chatbot/FALLBACK-E-ESCALONAMENTO.md` e `chatbot/CONTEUDOS-NAO-PUBLICAVEIS.md`

## 1. Resumo executivo

As 19 decisões pendentes da Onda 2 (Entradas, Despesas, Faturas, Suporte, Configurações/Conta/Onboarding, Agenda) foram **consolidadas pelo proprietário em modo conservador** para liberar o planejamento do Chatbot MVP. O Chatbot MVP será apresentado como **Assistente da Central de Ajuda**: responde dúvidas, orienta passo a passo e encaminha ao suporte humano em situações sensíveis. Ele não promete automações ou integrações não confirmadas, não executa ações no sistema em nome do usuário e não substitui o suporte humano.

Resultado:

- 19 decisões processadas;
- 19 resolvidas para o MVP;
- 0 decisões bloqueando o Chatbot MVP;
- 14 decisões mantidas como **evolução futura de produto**;
- 19 decisões geram **fallback obrigatório** no chatbot.

## 2. Tabela consolidada das 19 decisões

| ID | Módulo | Decisão para o MVP | Fallback do chatbot | Evolução futura? | Impacto | Data |
|---|---|---|---|---|---|---|
| DP-O2-01 | Faturas / Entradas | Não criar Entrada automaticamente ao registrar pagamento de fatura; tratar como registros independentes. | "O pagamento da fatura não deve ser tratado como entrada automática, salvo confirmação do sistema. Confira ou registre a entrada manualmente, conforme o fluxo disponível." | Sim | Bloqueia promessa de automação financeira; preserva integridade de caixa. | 2026-06-22 |
| DP-O2-02 | Faturas | Fatura com pagamento registrado não deve ser excluída automaticamente; orientar cancelamento ou suporte. | "Não recomendo excluir fatura com pagamento registrado. Use o cancelamento, se disponível, ou abra um chamado de suporte para preservar o histórico financeiro." | Sim (regra oficial de cancelamento) | Protege histórico financeiro e auditoria. | 2026-06-22 |
| DP-O2-03 | Faturas | Não prometer emissão de NF integrada; tratar como processo externo. | "A emissão integrada de nota fiscal não está confirmada no MVP. Use o processo fiscal habitual da agência." | Sim | Evita expectativa fiscal indevida. | 2026-06-22 |
| DP-O2-04 | Suporte | Não declarar SLA público no MVP. | "O suporte acompanha os chamados, mas ainda não há prazo oficial de resposta documentado." | Sim | Evita compromisso de prazo não auditado. | 2026-06-22 |
| DP-O2-05 | Suporte | Chamado resolvido não é reaberto formalmente; orientar novo chamado mencionando o anterior. | "Se o chamado já foi resolvido e o problema continua, abra um novo chamado explicando a continuidade e mencione o chamado anterior, se possível." | Possível | Mantém ciclo simples do ticket. | 2026-06-22 |
| DP-O2-06 | Suporte | Não exibir campo de prioridade ao usuário; urgência descrita no texto. | "Descreva a urgência no texto do chamado. O campo de prioridade visível ao usuário ainda não está confirmado." | Possível | Evita frustração com campo inexistente. | 2026-06-22 |
| DP-O2-07 | Agenda | Não afirmar sincronização bidirecional total com Google Calendar; descrever apenas o confirmado. | "A sincronização com Google Calendar deve ser usada conforme o fluxo confirmado na plataforma. Não assuma sincronização bidirecional em todos os cenários." | Sim | Evita perda de eventos por expectativa errada. | 2026-06-22 |
| DP-O2-08 | Agenda | Não prometer recorrência nativa; orientar cadastro manual. | "Para eventos recorrentes, cadastre os compromissos manualmente até que a recorrência nativa esteja confirmada." | Sim | Bloqueia promessa de recurso não disponível. | 2026-06-22 |
| DP-O2-09 | Agenda | Não prometer notificações automáticas por e-mail/push. | "Use a Agenda para consulta e organização. Notificações automáticas por e-mail ou push ainda dependem de confirmação." | Sim | Evita expectativa de lembrete automático. | 2026-06-22 |
| DP-O2-10 | Configurações | Não garantir propagação automática de logo/cor em links públicos antigos; orientar revisão manual. | "Após alterar logo ou cor principal, revise os links públicos importantes para confirmar se a identidade visual foi atualizada como esperado." | Sim | Protege consistência de marca em links críticos. | 2026-06-22 |
| DP-O2-11 | Configurações | E-mail principal não é alterado livremente pelo usuário; encaminhar suporte. | "Para alterar o e-mail principal da conta, abra um chamado de suporte." | Sim | Protege acesso e segurança da conta. | 2026-06-22 |
| DP-O2-12 | Onboarding | Conta reativada não refaz onboarding, salvo informação obrigatória pendente. | "Após reativar uma conta, revise os dados da conta e da agência. O onboarding só deve aparecer novamente se houver informação obrigatória pendente." | Possível | Evita UX confusa em retorno de conta. | 2026-06-22 |
| DP-O2-13 | Configurações / Equipe | Apenas titular/admin edita dados da agência; equipe só com permissão explícita confirmada. | "Dados da agência devem ser alterados pelo titular ou por perfil autorizado. Se você não encontrar a opção, peça ao titular da conta." | Sim (mapa de permissões) | Reduz risco de edição indevida. | 2026-06-22 |
| DP-O2-14 | Entradas | Não prometer recorrência nativa em Entradas. | "Registre entradas recorrentes manualmente até que a recorrência nativa em Entradas esteja confirmada." | Sim | Evita promessa de automação inexistente. | 2026-06-22 |
| DP-O2-15 | Despesas | Baixa de Despesas é manual no MVP; não prometer automação por status. | "Atualize o status da despesa manualmente, conforme o fluxo disponível na plataforma." | Sim | Mantém status financeiro confiável. | 2026-06-22 |
| DP-O2-16 | Entradas / Despesas | Não prometer upload de comprovantes. | "Se precisar guardar comprovantes, use o processo externo da agência até que o upload de comprovantes em Entradas e Despesas esteja confirmado." | Sim | Evita expectativa de anexo no MVP. | 2026-06-22 |
| DP-O2-17 | Entradas / Despesas | Exclusão de Entrada/Despesa vinculada exige conferência humana; encaminhar suporte. | "Não exclua registros financeiros vinculados sem conferência. Para evitar desbalanceamento financeiro, abra um chamado de suporte ou revise com o responsável financeiro." | Sim (regra oficial) | Protege integridade financeira. | 2026-06-22 |
| DP-O2-18 | Faturas | Não prometer notificação automática de vencimento. | "Acompanhe vencimentos pela área de Faturas. Notificações automáticas de vencimento ainda dependem de confirmação." | Sim | Evita expectativa de cobrança automática. | 2026-06-22 |
| DP-O2-19 | Suporte | Chatbot é **Assistente da Central de Ajuda**, não suporte humano nem executor de ações. | "Sou o Assistente da Central de Ajuda do Agentes de Sonhos. Posso orientar com base na documentação da plataforma e indicar o suporte humano quando a situação exigir análise específica." | Sim (escopo do bot) | Define identidade e limites do chatbot. | 2026-06-22 |

## 3. Módulos afetados

- **Entradas:** DP-O2-01, DP-O2-14, DP-O2-16, DP-O2-17.
- **Despesas:** DP-O2-15, DP-O2-16, DP-O2-17.
- **Faturas:** DP-O2-01, DP-O2-02, DP-O2-03, DP-O2-18.
- **Suporte:** DP-O2-04, DP-O2-05, DP-O2-06, DP-O2-19.
- **Configurações / Conta / Onboarding:** DP-O2-10, DP-O2-11, DP-O2-12, DP-O2-13.
- **Agenda:** DP-O2-07, DP-O2-08, DP-O2-09.

## 4. Decisões que continuam como evolução futura

- DP-O2-01, DP-O2-02, DP-O2-03, DP-O2-04, DP-O2-07, DP-O2-08, DP-O2-09, DP-O2-10, DP-O2-11, DP-O2-13, DP-O2-14, DP-O2-15, DP-O2-16, DP-O2-17, DP-O2-18, DP-O2-19 — dependem de evolução de produto, integração ou política oficial.
- DP-O2-05, DP-O2-06, DP-O2-12 — podem ser revisitadas conforme demanda real do usuário.

## 5. Decisões com fallback obrigatório no Chatbot MVP

Todas as 19 decisões geram fallback obrigatório registrado em `chatbot/FALLBACK-E-ESCALONAMENTO.md`. Nenhuma resposta do chatbot pode contradizer essas regras.

## 6. Confirmação de segurança

Nenhuma alteração funcional foi feita. Não houve mudança em código, banco, migrations, políticas, Edge Functions, integrações, configurações reais ou Base de Conhecimento Mestre. As alterações desta consolidação estão restritas a `docs/central-de-ajuda-agentes-de-sonhos/`. O RAG não foi alterado nesta etapa.