# Solicitação de reserva pelo orçamento web

Permitir que o cliente, no link público do orçamento, selecione apenas os itens que deseja e envie um **Pedido de reserva** (não é compra, pagamento nem reserva garantida). A agência recebe notificação, analisa, reconfirma com fornecedores e, ao fechar a oportunidade, a aba Serviços da Operação recebe **somente os itens escolhidos**.

## 1. Fluxo do cliente na página pública

1. Página pública do orçamento (rota atual `/orcamento/:token` e domínios white-label) ganha um modo de seleção opcional, ligado por configuração da agência no orçamento.
2. Cada card de serviço recebe um controle **"Selecionar"** (checkbox/switch discreto). Itens marcados como obrigatórios aparecem já selecionados e bloqueados.
3. Barra fixa inferior (resumo flutuante): quantidade de itens selecionados, subtotal estimado e botão **"Solicitar reserva"**.
4. Etapa de resumo (drawer/modal): lista dos itens escolhidos, aviso destacado — "Esta é uma solicitação. Valores e disponibilidade serão reconfirmados pela agência." — com checkbox de aceite obrigatório.
5. Identificação do cliente: nome, e-mail, WhatsApp e observações. Validação de formato e consentimento LGPD (mesmo padrão do Formulário Conversacional).
6. Botão final **"Enviar pedido de reserva"**, com bloqueio contra duplo clique.
7. Tela de protocolo: número do pedido, data/hora, itens solicitados, aviso de que a agência responderá, e opção de copiar o protocolo. Ao reabrir o link, o cliente vê o pedido já enviado e seu status.

## 2. Nomenclatura recomendada

- Ação por item: **Selecionar** / Remover seleção.
- Ação principal: **Solicitar reserva**; confirmação: **Enviar pedido de reserva**.
- Objeto: **Pedido de reserva** (nunca "compra", "checkout", "reserva confirmada").
- Painel do agente: **Pedidos de reserva** com status **Recebido / Em análise / Aguardando reconfirmação / Aprovado / Parcialmente aprovado / Indisponível / Cancelado**.
- Evitar: comprar, pagar, confirmar reserva, garantido, disponível.

## 3. Regras de seleção

- Marcação por serviço: `obrigatório`, `opcional` (padrão) ou `alternativa`.
- **Alternativas mutuamente exclusivas**: agrupadas por `choice_group`; selecionar uma desmarca as outras do grupo (ex.: 3 opções de hotel na mesma cidade).
- Seções/destinos já existentes (`quote_sections`) organizam a seleção; opcionalmente a agência define "escolha 1 item nesta seção".
- Obrigatórios não podem ser desmarcados e entram sempre no pedido.
- Quantidade: no MVP o pedido herda os passageiros do orçamento (fonte da verdade atual). Ajuste de quantidade por item fica para a fase 2, restrito a itens que já tenham quantidade própria.
- Validações antes de enviar: pelo menos 1 item, todos os grupos exclusivos resolvidos, aceite do aviso marcado.

## 4. Estados

Pedido: `draft` (seleção em andamento, só no navegador) → `submitted` → `received` → `in_review` → `awaiting_reconfirmation` → `approved` | `partially_approved` | `unavailable` | `cancelled` / `expired`.

Item do pedido: `requested` → `in_review` → `available` | `unavailable` | `price_changed` | `replaced` | `withdrawn`.

Esses estados são **do pedido do cliente** e ficam totalmente separados de Confirmado / Pago / Emitido / Entregue da aba Serviços da Operação, que continuam representando execução interna.

## 5. Modelo de dados (idempotente e auditável)

Três tabelas novas, sem alterar `quotes`/`quote_services`:

- `quote_booking_requests`: `id`, `quote_id`, `user_id` (dono do orçamento), `client_id` (opcional), `opportunity_id`, `protocol_code` (curto e único), `status`, `requester_name/email/phone`, `notes`, `consent_at`, `terms_version`, `selection_hash` (idempotência), `submitted_ip`, `user_agent`, `totals_snapshot`, `expires_at`, timestamps.
- `quote_booking_request_items`: `id`, `request_id`, `quote_service_id` (referência, sem cascata destrutiva), `service_type`, `name`, `amount_snapshot`, `currency`, `service_data_snapshot` (JSONB), `section_label`, `choice_group`, `item_status`, `agent_note`, `position`.
- `quote_booking_request_events`: trilha de auditoria (criado, notificado, status alterado, importado para operação), com autor (cliente público ou usuário/membro de equipe).

Pontos-chave:
- **Snapshot obrigatório** de preço e conteúdo no momento do envio: alterações posteriores no orçamento não reescrevem o pedido.
- **Idempotência**: unique em (`quote_id`, `selection_hash`) para janela recente + `protocol_code` único; reenvio do mesmo payload retorna o mesmo protocolo.
- Metadados de seleção (`is_required`, `choice_group`) ficam em `quote_services.service_data` para não exigir mudança estrutural do orçamento.

## 6. Integração com Oportunidade e Operações

- O pedido é vinculado à `opportunity_id` já existente no orçamento (coluna real em `quotes`).
- A importação automática hoje existente em `useOperationServices` (cópia de `quote_services` → `operation_services`) passa a ser condicional: **se o orçamento tiver um pedido de reserva aprovado ou parcialmente aprovado, importar apenas os itens desse pedido** (usando `source_quote_service_id` já presente em `operation_services`); sem pedido, mantém o comportamento atual (todos os itens).
- Importação permanece idempotente: nada é duplicado ao reabrir a aba.
- Nova seleção/alteração do cliente cria um **novo pedido** (versionado), nunca sobrescreve o anterior. Na Operação, os novos itens aparecem como sugestão "itens de um novo pedido de reserva" que o agente adiciona com um clique; itens retirados não são apagados automaticamente — apenas sinalizados.

## 7. Notificações

- **E-mail** (canal primário): reutilizar o padrão já usado nas landings de produto (Edge Function + tabelas de configuração, destinatários e entregas), com fila/tentativas, deduplicação por pedido e ação de reenvio manual pelo agente.
- Destinatários configuráveis por agência; conteúdo com protocolo, cliente, itens escolhidos e link direto para o pedido no app.
- **WhatsApp Utility**: hoje **não existe integração de envio de WhatsApp no projeto** (nenhum provedor configurado). Proposta: manter como fase 2, atrás de flag por agência, disparado só quando houver template Utility aprovado e número/opt-in válidos; e-mail sempre como fallback.
- Confirmação ao cliente: e-mail simples de "pedido recebido" com o protocolo, sem prometer disponibilidade.
- Todo envio registrado com status e erro, visível ao agente.

## 8. Segurança do link público

- Escrita pública **somente** via Edge Function `verify_jwt = false` + RPC `SECURITY DEFINER`, como já é feito no envio de leads — sem INSERT direto do cliente anônimo.
- Validação do `share_token`/`public_access_code` e de `share_expires_at`/`valid_until` antes de aceitar o pedido; orçamento expirado bloqueia o envio com mensagem clara.
- Rate limit por IP no mesmo utilitário `rate-limiter` já existente (ex.: 5 pedidos/10 min) e limite por orçamento.
- Validação de payload (tamanhos, e-mail, telefone) e recusa de itens que não pertençam ao orçamento.
- RLS: leitura/edição do pedido apenas pelo dono do orçamento e pela equipe da agência, seguindo as políticas de equipe já usadas em `operation_services`; nenhum acesso anônimo de leitura além do próprio protocolo via função.
- Consentimento com timestamp, versão do texto, IP e user agent gravados; auditoria completa na tabela de eventos.
- Proteção contra duplo envio: idempotência por hash + trava de UI + protocolo único.

## 9. UX do agente

- Aviso do novo pedido no app (badge no orçamento e na oportunidade) e página **Pedidos de reserva** com filtros por status.
- Detalhe do pedido: dados do cliente, itens com snapshot de preço, aviso do que ele aceitou, e ações por item: **Disponível**, **Indisponível**, **Preço alterado** (com novo valor), **Substituir por outra alternativa**.
- Ações do pedido: Em análise, Aguardando reconfirmação, Aprovar, Aprovar parcialmente, Recusar, Cancelar.
- Atalhos: abrir WhatsApp do cliente com mensagem pronta (padrão de compartilhamento já existente), gerar novo orçamento ajustado, criar/atualizar oportunidade.
- Ao fechar a oportunidade, a aba Serviços já vem filtrada pelos itens aprovados, e o agente segue marcando Confirmado / Pago / Emitido / Entregue normalmente.

## 10. Fases

**Fase 1 (MVP seguro)**: seleção por item com obrigatórios e alternativas, resumo + aviso + identificação, envio via Edge Function com rate limit e idempotência, tela de protocolo, tabelas + RLS, e-mail de notificação, painel do agente com aprovar/aprovar parcialmente/recusar, importação filtrada para `operation_services`.

**Fase 2**: quantidades por item, WhatsApp Utility, expiração automática e lembretes, novo pedido versionado com diff visual, metas/relatórios de conversão do orçamento web, resposta do cliente a contrapropostas.

## 11. Riscos, decisões abertas e recomendação

Riscos: cliente entender como reserva garantida (mitigar com linguagem e aviso obrigatório); divergência de preço entre snapshot e reconfirmação; pedidos duplicados; spam no link público; WhatsApp Utility fora de política.

Decisões abertas:
- A seleção deve vir ligada por padrão ou por orçamento? (recomendação: por orçamento, desligada por padrão)
- Exigir e-mail ou também validação por código enviado ao cliente? (recomendação: só e-mail no MVP)
- Prazo de expiração do pedido (sugestão: mesma validade do orçamento)

**Recomendação**: implementar a Fase 1 como "pedido de reserva" imutável com snapshot, canal único de escrita via Edge Function, e-mail como notificação obrigatória e WhatsApp apenas depois; manter os estados do pedido separados dos flags operacionais, e alimentar a Operação exclusivamente com itens aprovados.

## Detalhes técnicos verificados

- `quotes` possui `share_token`, `public_access_code`, `share_expires_at`, `valid_until`, `opportunity_id`, `currency`; `quote_services` possui `service_data`, `amount`, `section_id`, `option_label`.
- `quote_services` e `quotes` já têm políticas de leitura pública com token válido — nenhuma política de escrita pública existe, e o plano não cria nenhuma.
- `operation_services` já possui `source_quote_service_id` e os flags `is_confirmed`, `is_paid`, `is_issued`, `is_delivered`, com políticas por agência/equipe.
- Padrão público de escrita a reutilizar: `submit-lead-form` (rate limit compartilhado + RPC SECURITY DEFINER). Padrão de e-mail a reutilizar: `product-landing-lead-emails`.
- Nenhuma Edge Function de WhatsApp existe hoje no projeto.
