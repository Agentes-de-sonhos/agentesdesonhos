# Diagnóstico: erro ao confirmar cancelamento de assinatura

## 1) Causa raiz mais provável

A Edge Function `cancel-subscription` só encontra a assinatura **pelo e-mail do usuário no Stripe**, ignorando os IDs já persistidos na tabela `subscriptions`.

Evidências:
- `supabase/functions/cancel-subscription/index.ts` (linhas 47–68): a busca começa com `stripe.customers.list({ email: user.email, limit: 1 })` e, como fallback, `stripe.customers.search({ query: "metadata['supabase_user_id']:..." })`. Nunca lê `subscriptions.stripe_customer_id` / `subscriptions.stripe_subscription_id`.
- A tabela `public.subscriptions` **possui** as colunas `stripe_customer_id` e `stripe_subscription_id` (com índices dedicados), ou seja, o dado correto existe e não é usado.
- Quando nada é encontrado, a função lança erro e responde **HTTP 400** — exatamente o status que gera o toast genérico na tela.

Ou seja: se o e-mail do login for diferente do e-mail do cliente no Stripe (troca de e-mail, compra feita com outro endereço, cliente duplicado, `limit: 1` pegando o customer errado sem assinatura), o cancelamento falha com 400 mesmo havendo assinatura ativa.

O segundo problema é que a interface **não lê o corpo do erro**. Em `src/pages/MinhaConta.tsx` (linhas 96–99) o código faz `(error as any)?.context?.error`. No supabase-js v2, `error.context` é um objeto `Response`, não o JSON — logo `.error` é sempre `undefined` e a mensagem cai no padrão do SDK: **"Edge Function returned a non-2xx status code"**. A mensagem específica em português já produzida pela função nunca chega ao usuário.

## 2) Outros cenários de falha

- **Filtro `status: "active"`**: `stripe.subscriptions.list({ status: "active" })` ignora `trialing`, `past_due` e `unpaid` → usuário em teste gratuito recebe "Não encontramos uma assinatura ativa para cancelar" (400).
- **Assinatura já agendada para cancelamento**: hoje o fluxo tenta atualizar de novo e trata como operação normal, sem informar que já estava agendada (e sem idempotência explícita).
- **API Stripe `2025-08-27.basil`**: `current_period_end` **não existe mais no objeto Subscription** — confirmado ao inspecionar as assinaturas reais da conta, onde o campo aparece apenas em `items.data[0].current_period_end`. Resultado atual: `cancel_at` volta `undefined`, o toast perde a data e o `expires_at` gravado em `subscriptions` falha silenciosamente (o `new Date(undefined)` estoura dentro do try "non-blocking").
- **Sessão ausente/expirada**: `verify_jwt = false` para esta função, então uma chamada sem `Authorization` válido também retorna 400 com a mesma aparência genérica.
- **`customers.search`** depende de indexação eventual do Stripe; recém-criados podem não aparecer.
- Todos os erros retornam **400**, sem distinção entre "não autenticado", "não encontrado" e "falha do Stripe".

## 3) Correção exata recomendada (Edge Function)

Reescrever a resolução da assinatura em ordem de prioridade:

1. Ler a linha de `subscriptions` do usuário (`user_id`, `is_active = true`) com service role e usar `stripe_subscription_id` → `stripe.subscriptions.retrieve(id)`.
2. Se não houver, usar `stripe_customer_id` → `stripe.subscriptions.list({ customer, status: "all", limit: 10 })` e escolher a primeira com status em `["active", "trialing", "past_due", "unpaid"]`.
3. Só então cair no fallback atual por e-mail (percorrendo todos os customers do e-mail, não apenas o primeiro) e por `metadata.supabase_user_id`.
4. Se a assinatura já tiver `cancel_at_period_end === true`, retornar **200** idempotente com `already_scheduled: true` e a data.
5. Substituir `updated.current_period_end` por `updated.items.data[0]?.current_period_end ?? updated.cancel_at ?? updated.trial_end`, com guarda antes de `new Date(...)`.
6. Persistir de volta em `subscriptions`: `expires_at`, e também `stripe_customer_id` / `stripe_subscription_id` quando descobertos pelo fallback (auto-cura dos dados).
7. Padronizar códigos HTTP: `401` sem sessão, `404` assinatura não encontrada, `502` erro do Stripe, `400` payload inválido — sempre com `{ error, code }` e headers de CORS.
8. Manter logs por etapa (`[CANCEL-SUBSCRIPTION] ...`) incluindo qual estratégia localizou a assinatura, sem expor dados sensíveis.

## 4) Melhorar a mensagem ao usuário (`src/pages/MinhaConta.tsx`)

- Ler o corpo real do erro: quando `error.context` for uma `Response`, fazer `await error.context.json()` (com try/catch e fallback para `.text()`) e usar `body.error`.
- Mapear `code` para mensagens em português acionáveis, por exemplo:
  - `not_authenticated` → "Sua sessão expirou. Entre novamente e tente cancelar."
  - `subscription_not_found` → "Não localizamos uma assinatura ativa vinculada à sua conta. Fale com o suporte informando o e-mail usado no pagamento."
  - `already_scheduled` → toast informativo: "Seu cancelamento já estava agendado. O acesso vai até DD/MM/AAAA."
  - `stripe_error` → "O provedor de pagamento não respondeu. Tente novamente em alguns minutos."
- Manter o fallback genérico apenas como última linha, e fechar o modal + `refetch()` também no caso idempotente.

## 5) Plano de teste

| Cenário | Como preparar | Resultado esperado |
| --- | --- | --- |
| Assinatura ativa localizada por `stripe_subscription_id` | Linha em `subscriptions` com o ID preenchido | 200, `cancel_at` com data real, toast com data, `expires_at` gravado |
| Assinatura ativa localizada por `stripe_customer_id` | Limpar `stripe_subscription_id`, manter customer | 200 e `stripe_subscription_id` regravado na tabela |
| Fallback por e-mail | Limpar ambos os IDs | 200 e ambos os IDs preenchidos automaticamente |
| E-mail do login diferente do Stripe | Login com e-mail alternativo, IDs preenchidos | 200 (não deve mais falhar) |
| Já agendada para cancelamento | Repetir o cancelamento | 200 idempotente, toast "já estava agendado" com data |
| `trialing` | Assinatura em período de teste | 200, cancelamento agendado para o fim do trial |
| Sem assinatura no Stripe | Usuário Start | 404 + mensagem específica de suporte (não o texto genérico) |
| Sessão expirada | Invocar sem token válido | 401 + "Sua sessão expirou..." |
| Motivo com 1000+ caracteres | Colar texto longo | Truncado sem erro; motivo em `cancellation_details.comment` |
| Verificação final | Após cancelar, rodar `check-subscription` e reabrir `/minha-conta` | Estado consistente e sem novas cobranças |

Verificação adicional: conferir os logs da função para confirmar qual estratégia localizou a assinatura e que nenhum erro silencioso aparece na gravação de `expires_at`.

## Observação

Nenhum arquivo foi alterado — este é apenas o diagnóstico. Aprove para eu aplicar a correção na Edge Function e no tratamento de erro da tela.
