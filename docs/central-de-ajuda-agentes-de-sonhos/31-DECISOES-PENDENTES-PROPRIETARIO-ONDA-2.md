# Decisões pendentes do proprietário — Onda 2

Data: 2026-06-22
Escopo: módulos da Onda 2 (Entradas, Despesas, Faturas, Suporte, Configurações/Conta/Onboarding, Agenda).

| ID | Pergunta | Módulo | Motivo | Impacto se não responder | Prioridade | Recomendação inicial |
|---|---|---|---|---|---|---|
| DP-O2-01 | O pagamento de uma fatura deve criar automaticamente uma entrada em Financeiro → Entradas? | Faturas / Entradas | Define vínculo financeiro entre fatura e caixa | Risco de dupla contagem ou ausência de receita | crítica | Tratar fatura e entrada como independentes até decisão |
| DP-O2-02 | Qual é a regra oficial para cancelar versus excluir uma fatura que já recebeu pagamento? | Faturas | Impacto contábil e auditoria | Risco de perda de histórico financeiro | crítica | Bloquear exclusão e exigir suporte enquanto não há regra |
| DP-O2-03 | Haverá emissão integrada de nota fiscal a partir da fatura? | Faturas | Conformidade fiscal | Pode gerar expectativa indevida | alta | Não prometer NF integrada |
| DP-O2-04 | Existe SLA oficial de resposta para o módulo Suporte? | Suporte | Define expectativa do cliente | Risco reputacional | alta | Não prometer prazo até definição |
| DP-O2-05 | Será permitida reabertura formal de chamados resolvidos? | Suporte | Define ciclo de vida do ticket | Pode gerar tickets duplicados | média | Orientar abertura de novo ticket |
| DP-O2-06 | Haverá campo de prioridade visível ao usuário em tickets? | Suporte | Comunicação com o cliente | Gera frustração se ausente | média | Não exibir até confirmação |
| DP-O2-07 | A sincronização com Google Calendar é bidirecional em todos os cenários? | Agenda | Define comportamento esperado | Pode causar perda de eventos | alta | Documentar somente o sentido confirmado |
| DP-O2-08 | Eventos da Agenda terão recorrência nativa? | Agenda | Funcionalidade recorrente comum | Repetição manual hoje | média | Não prometer recorrência |
| DP-O2-09 | Haverá notificações automáticas (e-mail/push) para eventos próximos da Agenda? | Agenda | Define lembretes | Eventos esquecidos | média | Não prometer notificação |
| DP-O2-10 | Alteração de logo/cor primária deve propagar automaticamente para links públicos já gerados? | Configurações | Identidade visual em vouchers/links antigos | Inconsistência de marca | alta | Recomendar revisão manual |
| DP-O2-11 | O e-mail principal da conta poderá ser alterado pelo usuário em algum momento? | Configurações | Acesso e segurança | Bloqueio de acesso | alta | Encaminhar suporte por enquanto |
| DP-O2-12 | Qual é o comportamento oficial de retomada do onboarding em contas reativadas? | Onboarding | Continuidade de conta | UX confusa | média | Pedir confirmação ao proprietário |
| DP-O2-13 | Quais perfis exatamente podem editar dados da agência? | Configurações / Equipe | Governança | Edição indevida | alta | Restringir ao titular enquanto não confirmado |
| DP-O2-14 | Entradas terão recorrência nativa? | Entradas | Receita recorrente comum | Cadastro manual repetitivo | média | Não prometer recorrência |
| DP-O2-15 | Despesas terão baixa por status (pago/atrasado) com automações? | Despesas | Conciliação | Status incorreto | alta | Tratar status como manual |
| DP-O2-16 | Haverá upload de comprovantes em Entradas e Despesas? | Entradas / Despesas | Auditoria financeira | Falta de evidência | média | Não prometer upload |
| DP-O2-17 | Qual o impacto de excluir uma Entrada ou Despesa vinculada a uma venda/fatura? | Entradas / Despesas | Integridade | Desbalanço financeiro | crítica | Bloquear orientação automática, abrir suporte |
| DP-O2-18 | Haverá emissão de notificação automática para vencimento de faturas? | Faturas | Cobrança | Inadimplência | média | Não prometer notificação |
| DP-O2-19 | O chatbot de suporte estará efetivamente disponível para o usuário final no MVP? | Suporte | Expectativa do usuário | Risco de over-promise | crítica | Declarar como assistente da Central de Ajuda, com encaminhamento humano |

> Estas decisões devem ser consolidadas pelo proprietário antes da Onda 3.