# Investigação read-only: erika@realeviagens.com.br — subscription_not_found

Nada foi alterado (sem edições de código, banco ou Stripe). Somente leituras na API do Stripe (live).

## 1) Existe cobrança recorrente a cancelar?

**Sim, existe uma assinatura recorrente ativa** — porém ela **não está vinculada** ao e-mail de login nem ao `user_id` no Stripe.

- Assinatura (mascarada): `sub_...UUlH` — status `active`, `cancel_at_period_end = false`
- Customer (mascarado): `cus_...AxU0`
- Produto/preço: `prod_U9J9e1DdfeYvXg` (Plano fundador) / `price_...9POR` — **R$ 85,90/mês, intervalo mensal**
- Período atual do item: início 19/07/2026 → fim 19/08/2026 (`items.data[0].current_period_end`)
- Última fatura: `in_...57QF`, `subscription_cycle`, **paga** (R$ 85,90)

Conclusão sobre o plano: **`fundador` NÃO é acesso manual/lifetime** nesta conta — há cobrança recorrente mensal real e faturas pagas em ciclos consecutivos.

## 2) Causa da falha

A Edge Function `cancel-subscription` não tem nenhum caminho válido de resolução para esta conta:

1. `subscriptions.stripe_subscription_id` = `null` → estratégia 1 falha.
2. `subscriptions.stripe_customer_id` = `null` → estratégia 2 falha.
3. Fallback por e-mail: `customers.list({ email: "erika@realeviagens.com.br" })` retorna **lista vazia** — o customer do Stripe está gravado com **outro e-mail** (a busca ampla `email~'erika'` encontrou exatamente um customer, `cus_...AxU0`, mas a busca exata pelo e-mail de login não retorna nada).
4. Fallback por metadata: `customers.search(metadata['supabase_user_id']:'107fac9e-...54aaa')` retorna **vazio** — o customer não carrega o `supabase_user_id`.

Logo a função devolve `404 subscription_not_found` — o comportamento está **correto dado o estado dos dados**; o defeito é de **vínculo de dados**, não de lógica.

## 3) Duplicidades

Nenhum customer duplicado encontrado para este e-mail: a busca exata por `erika@realeviagens.com.br` retorna zero e a busca ampla por `erika` retorna **um único** customer (`cus_...AxU0`).
Ressalva: como o e-mail do customer vem redigido nas respostas da ferramenta, **a identidade entre `cus_...AxU0` e a Erika da Reale Viagens é provável (nome/plano fundador coerentes), mas não 100% confirmada** por leitura automatizada — precisa de conferência visual do e-mail no registro do Stripe.

## 4) Checkout sessions / faturas

Não foi necessário ir além: as faturas do customer já comprovam ciclos recorrentes cobrados (`subscription_cycle`, status `paid`), confirmando cobrança ativa.

## 5) O que resolveria (sem executar nada agora)

- Confirmar visualmente que `cus_...AxU0` pertence à Erika (comparar e-mail/nome/telefone).
- Se confirmado: preencher `subscriptions.stripe_customer_id` e `stripe_subscription_id` para o `user_id` `107fac9e-...54aaa` (e, opcionalmente, `metadata.supabase_user_id` no customer do Stripe). Com isso a estratégia 1 da função passa a funcionar e o cancelamento pela tela volta a operar.
- Alternativa imediata para a usuária: cancelamento manual da assinatura `sub_...UUlH` no Stripe.

Aprove se quiser que eu execute a correção de vínculo (ou o cancelamento) — nesta rodada nada foi modificado.
