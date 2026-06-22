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
