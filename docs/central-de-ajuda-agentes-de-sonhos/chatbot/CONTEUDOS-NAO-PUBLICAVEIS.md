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
