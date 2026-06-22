# Conteúdos não publicáveis

Tópicos que **não** podem aparecer em respostas do chatbot público:

- Detalhes de implementação: tabelas, esquemas, migrations, Edge Functions, componentes, rotas internas, nomes de funções, variáveis de ambiente, chaves, tokens, infraestrutura.
- Conteúdos exclusivos do painel administrativo do Agentes de Sonhos.
- Procedimentos de versões antigas marcados como legado.
- Conteúdos com status `bloqueado-por-informação` ou confiança `pendente`.
- Qualquer informação sensível de outras agências ou clientes finais.
- Promessas comerciais não confirmadas (descontos, prazos, SLAs sem registro).

## Adições da Subonda 1F
- Detalhes técnicos de segurança e RLS de equipe/permissões.
- Estruturas internas de armazenamento de senhas de membros.
- Logs internos, tokens, URLs administrativas.
- Instruções para burlar permissões.
- Conteúdo de módulos ainda não aprovados (Ondas 2 e 3).
- Respostas sobre cálculos financeiros não confirmados.
- Respostas sobre exclusões financeiras não confirmadas.

## Reforços da Subonda 2D (Onda 2)

- Não expor detalhes técnicos de RAG (estrutura JSONL, campos internos, ids, contagens).
- Não expor nomes internos de tabelas (`invoices`, `expense_entries`, `income_entries`, `support_tickets`, `google_calendar_sync`, etc.).
- Não expor nomes de Edge Functions (`customer-portal`, `cancel-subscription`, `google-calendar-*`, `team-*`, etc.).
- Não expor políticas RLS, tokens, secrets, URLs internas, IDs reais de clientes, faturas, tickets, eventos.
- Não expor logs, payloads ou trechos de stack trace.
- Não detalhar caminhos de armazenamento de anexos (`ticket-attachments`, `traveler-documents`, etc.).
- Não fornecer respostas que permitam burlar permissões de equipe, planos ou cobrança.
- Não responder sobre cálculos financeiros não confirmados (recorrência, baixa automática, vínculo entrada↔fatura, comissão automática quando não documentada).
- Não confirmar exclusões financeiras com efeito em registros vinculados antes da decisão oficial.
- Não afirmar SLA de Suporte enquanto não estiver oficialmente definido.
- Não declarar o chatbot como totalmente ativo antes da implementação oficial; sempre indicar canal humano.
- Não expor regras internas de administração (impersonation, master, simulador de plano).
- Não publicar qualquer informação que possa induzir violação de privacidade ou segurança.

## Consolidação Onda 2 → Chatbot MVP (2026-06-22)

O chatbot **não pode** publicar, afirmar ou prometer:

- Emissão de Nota Fiscal integrada a partir da fatura (DP-O2-03).
- SLA oficial de Suporte ou qualquer prazo público de resposta (DP-O2-04).
- Sincronização bidirecional total com Google Calendar (DP-O2-07).
- Recorrência nativa em Agenda, Entradas ou Despesas (DP-O2-08, 14, 15).
- Notificações automáticas para eventos da Agenda ou vencimento de Faturas (DP-O2-09, 18).
- Upload de comprovantes em Entradas e Despesas (DP-O2-16).
- Automações financeiras não confirmadas, incluindo:
  - Entrada automática a partir do pagamento de fatura (DP-O2-01).
  - Baixa automática de Despesas por status (DP-O2-15).
- Exclusões financeiras sensíveis sem conferência humana:
  - Exclusão de fatura paga (DP-O2-02).
  - Exclusão de Entrada/Despesa vinculada a venda/fatura (DP-O2-17).
- Alteração livre do e-mail principal da conta pelo próprio usuário (DP-O2-11).
- Propagação automática garantida de logo/cor em links públicos já gerados (DP-O2-10).
- Reabertura formal de chamados resolvidos como funcionalidade oficial (DP-O2-05).
- Existência de campo de prioridade visível ao usuário em tickets (DP-O2-06).
- Edição de dados da agência por membros de equipe sem permissão explícita confirmada (DP-O2-13).
- Retomada automática de onboarding em conta reativada quando não há informação pendente (DP-O2-12).
- Qualquer afirmação de que o chatbot é suporte humano (DP-O2-19).
- Qualquer afirmação de que o chatbot executa ações no sistema em nome do usuário (DP-O2-19).
