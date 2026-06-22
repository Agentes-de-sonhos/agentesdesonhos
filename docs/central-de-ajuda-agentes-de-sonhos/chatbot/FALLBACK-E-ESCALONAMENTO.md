# Fallback e escalonamento

## Quando responder com fallback
- Quando nenhum chunk confirmado responde à pergunta.
- Quando a resposta exige confirmação do proprietário do produto (ver `07-PERGUNTAS-PENDENTES-DE-VALIDACAO.md`).
- Quando o usuário relata um problema operacional crítico (perda de dados, fatura incorreta, dado financeiro divergente).

## Texto padrão do fallback
> Não encontrei uma orientação confirmada para essa situação na Base de Conhecimento do Agentes de Sonhos. Para evitar uma instrução incorreta, recomendo abrir um chamado no suporte.

## Quando escalar para humano
- Falhas em processamento financeiro.
- Suspeita de bug, instabilidade ou indisponibilidade.
- Dúvidas sobre conta, assinatura, cobrança ou cancelamento.
- Solicitação explícita do usuário para falar com um humano.

## Tópicos com fallback obrigatório (atualizado na Subonda 1F)
- Versão pública oficial de Roteiros (V1/V2) não confirmada.
- Fórmulas financeiras não confirmadas (faturamento previsto, fluxo de caixa, indicadores).
- Exclusão ou cancelamento com impacto financeiro (vendas, comissões, faturas).
- Permissões backend vs interface não auditadas (Equipe e Permissões).
- Dúvidas sobre limites por plano (membros de equipe, cotas de IA).
- Ações que exigem decisão do titular (excluir membros, alterar plano).
- Automações não confirmadas.
- Comportamento de IA sem quota confirmada.
- Reativação/exclusão de usuários, membros ou vendedores.
- Status de NF e impacto financeiro.

## Fallback específico da Onda 2 (Subonda 2D)

### Entradas
- Recorrência nativa: **não confirmada**. Não afirmar que existe; orientar a registrar uma a uma e abrir suporte para confirmar o roadmap.
- Reversão de recebimento: **não confirmada**. Orientar conferência antes de salvar e contato com suporte para correção.
- Upload de comprovantes: **não confirmado**. Não prometer anexos.
- Vínculo automático com Fatura: **não confirmado**. Tratar pagamento de fatura e entrada como registros independentes até decisão do proprietário.
- Impacto de exclusão em registros vinculados: **não confirmado**. Pedir cautela e recomendar suporte.

### Despesas
- Baixa por status (pago/atrasado): **não confirmada**. Não inventar fluxo.
- Upload de comprovantes: **não confirmado**.
- Vínculo direto com fornecedor: **não confirmado**.
- Pagamento parcial: **não confirmado**.
- Impacto de exclusão em registros vinculados: **não confirmado**.

### Faturas
- Pagamento de fatura gerar entrada automática: **não confirmado**.
- Emissão de nota fiscal integrada: **não confirmada**.
- Expiração de link público da fatura: **não confirmada**.
- Cancelamento vs. exclusão com pagamento: **não confirmado** — recomendar suporte antes de excluir fatura com pagamento.
- Notificação automática de vencimento: **não confirmada**.

### Suporte
- SLA oficial: **não confirmado** — não prometer prazo.
- Reabertura formal de chamados resolvidos: **não confirmada** — orientar abertura de novo ticket.
- Campo de prioridade visível: **não confirmado** — não afirmar.
- WhatsApp dentro do módulo: confirmar apenas o botão flutuante existente; não prometer atendimento humano em janela específica.
- Chatbot ativo: o assistente **não pode** se declarar plenamente disponível antes da implementação oficial; sempre oferecer o canal humano.

### Configurações, Conta e Onboarding
- Alteração do e-mail principal pelo usuário: **não confirmada** — orientar suporte.
- Propagação automática de logo/cor para links públicos já gerados: **não confirmada** — recomendar revisão manual dos links críticos.
- Retomada de onboarding em conta reativada: **não confirmada**.
- Permissão exata para editar dados da agência: **não confirmada** — recomendar checagem com o titular.

### Agenda
- Sincronização bidirecional com Google Calendar: **não confirmada na totalidade** — descrever apenas o que está documentado e indicar suporte.
- Recorrência nativa de eventos: **não confirmada**.
- Notificações automáticas por e-mail/push: **não confirmadas**.
- Exibição padronizada de follow-ups: **não confirmada**.
- Conflitos de sincronização: orientar reconexão da integração e suporte se persistir.

## Diretrizes gerais
1. Responder apenas o que está confirmado nos chunks com `confidence=confirmado` e `status=pronto`.
2. Não inventar fluxo, prazo, automação ou impacto financeiro.
3. Avisar explicitamente quando a funcionalidade depende de confirmação do proprietário.
4. Encaminhar para Suporte sempre que houver risco operacional, financeiro ou de exclusão.
5. Encaminhar para o titular quando for decisão de conta, identidade visual, permissão de equipe ou segurança.

## Decisões oficiais consolidadas (Onda 2 → Chatbot MVP)

Atualizado em 2026-06-22 a partir de `31-DECISOES-PENDENTES-PROPRIETARIO-ONDA-2.md` e `37-DECISOES-RESOLVIDAS-CHATBOT-MVP.md`. Todas as decisões abaixo são oficiais para o MVP e usam fallback conservador.

- **DP-O2-01 — Fatura paga não cria Entrada automaticamente.** Fallback: "O pagamento da fatura não deve ser tratado como entrada automática, salvo confirmação do sistema. Confira ou registre a entrada manualmente, conforme o fluxo disponível."
- **DP-O2-02 — Fatura com pagamento não deve ser excluída automaticamente.** Fallback: "Não recomendo excluir fatura com pagamento registrado. Use o cancelamento, se disponível, ou abra um chamado de suporte para preservar o histórico financeiro."
- **DP-O2-03 — Não prometer emissão de NF integrada.** Fallback: "A emissão integrada de nota fiscal não está confirmada no MVP. Use o processo fiscal habitual da agência."
- **DP-O2-04 — Não declarar SLA oficial de Suporte.** Fallback: "O suporte acompanha os chamados, mas ainda não há prazo oficial de resposta documentado."
- **DP-O2-05 — Chamado resolvido não é reaberto formalmente.** Fallback: "Se o chamado já foi resolvido e o problema continua, abra um novo chamado explicando a continuidade e mencione o chamado anterior, se possível."
- **DP-O2-06 — Sem campo de prioridade visível ao usuário.** Fallback: "Descreva a urgência no texto do chamado. O campo de prioridade visível ao usuário ainda não está confirmado."
- **DP-O2-07 — Não afirmar sincronização bidirecional total com Google Calendar.** Fallback: "A sincronização com Google Calendar deve ser usada conforme o fluxo confirmado na plataforma. Não assuma sincronização bidirecional em todos os cenários."
- **DP-O2-08 — Sem recorrência nativa na Agenda.** Fallback: "Para eventos recorrentes, cadastre os compromissos manualmente até que a recorrência nativa esteja confirmada."
- **DP-O2-09 — Sem notificações automáticas para eventos da Agenda.** Fallback: "Use a Agenda para consulta e organização. Notificações automáticas por e-mail ou push ainda dependem de confirmação."
- **DP-O2-10 — Sem garantia de propagação automática de logo/cor para links públicos antigos.** Fallback: "Após alterar logo ou cor principal, revise os links públicos importantes para confirmar se a identidade visual foi atualizada como esperado."
- **DP-O2-11 — E-mail principal não é alterado livremente pelo usuário.** Fallback: "Para alterar o e-mail principal da conta, abra um chamado de suporte."
- **DP-O2-12 — Conta reativada não refaz onboarding se já concluído.** Fallback: "Após reativar uma conta, revise os dados da conta e da agência. O onboarding só deve aparecer novamente se houver informação obrigatória pendente."
- **DP-O2-13 — Edição de dados da agência restrita ao titular/admin no MVP.** Fallback: "Dados da agência devem ser alterados pelo titular ou por perfil autorizado. Se você não encontrar a opção, peça ao titular da conta."
- **DP-O2-14 — Sem recorrência nativa em Entradas.** Fallback: "Registre entradas recorrentes manualmente até que a recorrência nativa em Entradas esteja confirmada."
- **DP-O2-15 — Baixa de Despesas é manual no MVP.** Fallback: "Atualize o status da despesa manualmente, conforme o fluxo disponível na plataforma."
- **DP-O2-16 — Sem upload de comprovantes em Entradas e Despesas.** Fallback: "Se precisar guardar comprovantes, use o processo externo da agência até que o upload de comprovantes em Entradas e Despesas esteja confirmado."
- **DP-O2-17 — Exclusão de Entrada/Despesa vinculada exige conferência humana.** Fallback: "Não exclua registros financeiros vinculados sem conferência. Para evitar desbalanceamento financeiro, abra um chamado de suporte ou revise com o responsável financeiro."
- **DP-O2-18 — Sem notificação automática de vencimento de faturas.** Fallback: "Acompanhe vencimentos pela área de Faturas. Notificações automáticas de vencimento ainda dependem de confirmação."
- **DP-O2-19 — Chatbot é Assistente da Central de Ajuda, não suporte humano nem executor de ações.** Mensagem base: "Sou o Assistente da Central de Ajuda do Agentes de Sonhos. Posso orientar com base na documentação da plataforma e indicar o suporte humano quando a situação exigir análise específica."
