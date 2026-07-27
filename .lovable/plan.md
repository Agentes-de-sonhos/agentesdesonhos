## Diagnóstico — assinatura da Daniela (daniela@paraisoviagens.com)

**Nenhuma alteração foi feita.** Apenas leitura.

### 1. O que foi encontrado no banco de produção

Consulta em `card_activations`:

| Campo | Valor |
|---|---|
| id | `a9f9048a-f628-4064-aa9f-f46d426659ce` |
| email | `daniela@paraisoviagens.com` |
| plan | **premium** (bate com R$ 98) |
| payment_status | `paid` |
| used | **false** ← chave do problema |
| stripe_session_id | `cs_live_a1S4NMmicDWKaTT133O6kHFWKS9eWUHN9o3YiRvpfxfkv9Nd8movgsa1aG` |
| created_at | 27/07/2026 17:07 UTC |

Ou seja: **o webhook do Stripe processou o pagamento com sucesso** e criou o registro de ativação. Não há `auth.users`, `profiles` nem `subscriptions` porque **o segundo passo do fluxo (a cliente clicar no link e criar a conta) nunca ocorreu**.

### 2. Como o fluxo foi desenhado (checkout público → assinatura)

```text
Stripe Checkout (public)
  → stripe-webhook (checkout.session.completed)
      → cria card_activations (used=false) com plan/customer/subscription
      → envia e-mail Resend com link https://app.agentesdesonhos.com.br/ativar-cartao?token=...
  → cliente clica no link
      → activate-card-signup
          → cria auth.users + profiles + subscriptions (upsert)
          → marca card_activations.used = true
```

O vínculo Stripe↔usuário só é criado no segundo passo. Enquanto `used=false`, `stripe_customer_id` e `stripe_subscription_id` ficam guardados **apenas** em `card_activations`.

### 3. Causa mais provável

A Daniela **não clicou no link de ativação enviado por e-mail**. Cenários prováveis, em ordem:

1. **E-mail não chegou / caiu em spam.** O remetente `fernando.nobre@agentesdesonhos.com.br` via Resend pode ter sido filtrado (Paraiso Viagens é domínio próprio, filtros corporativos são comuns).
2. **Resend falhou no envio** (rate limit, bounce, domínio não verificado no momento). O webhook não bloqueia o fluxo se o Resend falha — só loga o erro. Em `stripe-webhook`, buscar pelo `traceId` do evento e pela linha `Resend email error`.
3. **Cliente ignorou / apagou o e-mail.** Também comum.
4. Bug latente identificado no código do `stripe-webhook` que **não afetou este caso** (o registro foi criado), mas convém saber: as duas chamadas a `adminClient.auth.admin.listUsers()` sem paginação limitam a busca por e-mail aos primeiros ~50 usuários. Isto pode gerar problemas futuros de "usuário existente não encontrado" em outros pagamentos.

### 4. Logs/eventos a verificar (sem alterar nada)

- **Stripe Dashboard → Payments**: recibo `2527-7991`, fatura `PNM1XPGD-0001`. Confirmar `checkout.session.completed` e capturar `customer` (`cus_…`) e `subscription` (`sub_…`).
- **Stripe Dashboard → Developers → Webhooks**: entrega do evento `checkout.session.completed` para a URL do `stripe-webhook` com status 200. Se houve retentativa, revisar.
- **Edge Function logs** de `stripe-webhook` para 27/07 ~17:07 UTC: procurar `[evt_...] ✅ Activation token created for daniela@paraisoviagens.com (premium)` e `📧 Activation email sent` **ou** `Resend email error`.
- **Resend Dashboard → Logs**: procurar envio para `daniela@paraisoviagens.com` com o assunto "Bem-vindo ao Agentes de Sonhos — Ative seu Plano Premium". Status: delivered / bounced / dropped.
- **Stripe → Subscriptions**: confirmar que `sub_…` está **active**, próximo billing date e método de pagamento salvo.

### 5. Procedimento seguro para regularizar (a executar depois, sem perder o recorrente)

**Princípio:** o vínculo recorrente já existe do lado do Stripe (subscription ativa, customer com PM salvo). Não precisamos cancelar/recriar assinatura. Basta destravar o segundo passo do fluxo. O registro `card_activations` já contém `stripe_customer_id` e `stripe_subscription_id` corretos — usá-lo é o caminho mais seguro.

Duas opções, em ordem de preferência:

**Opção A — Reenviar o link de ativação para a cliente (recomendada)**
1. Ler o `activation_token` do registro `a9f9048a-…` (`used=false`, ainda válido enquanto não expirar).
2. Confirmar com a Daniela um canal alternativo (WhatsApp / e-mail pessoal) antes de reenviar, para descartar novo bloqueio de spam.
3. Enviar manualmente a URL `https://app.agentesdesonhos.com.br/ativar-cartao?token=<token>`.
4. Ela conclui o cadastro; `activate-card-signup` cria `auth.users` + `profiles` + `subscriptions` com `stripe_customer_id`/`stripe_subscription_id` já corretos — o vínculo recorrente é preservado.
5. Verificar se `card_activations.used` virou `true` e se `subscriptions.stripe_subscription_id` bate com o Stripe.
6. **Verificar `expires_at`** do registro antes: se já expirou, gerar novo token (novo insert com mesmos `stripe_customer_id`/`stripe_subscription_id` e `used=false`) e reenviar.

**Opção B — Criação administrativa (se a cliente não conseguir usar o link)**
Executar manualmente o que `activate-card-signup` faz, na mesma ordem, usando o service role:
1. `auth.admin.createUser({ email, password_temporário, email_confirm: true })`.
2. `INSERT` em `profiles` (`user_id`, `name`, `phone`, `has_password=true`).
3. `INSERT` em `subscriptions` com `plan='premium'`, `is_active=true`, **`stripe_customer_id`** e **`stripe_subscription_id`** copiados de `card_activations` (imprescindível para manter o recorrente).
4. `UPDATE card_activations SET used=true` para o registro `a9f9048a-…`.
5. Enviar e-mail de redefinição de senha para a Daniela (`auth.admin.generateLink({ type: 'recovery' })`).

**O que NÃO fazer**
- Não cancelar/reembolsar a assinatura no Stripe. Isso quebraria o recorrente e disparia `customer.subscription.deleted`, que rebaixaria para `start` na primeira renovação.
- Não criar `subscriptions` sem `stripe_customer_id`/`stripe_subscription_id`: a próxima cobrança viria pelo webhook `invoice.paid` e o handler não conseguiria casar (busca por e-mail em `listUsers`, tudo bem, mas o registro ficaria incompleto).
- Não inserir `auth.users` direto por SQL — usar a Admin API.

### 6. Observações complementares (fora do escopo, apenas para registro)

- O template do e-mail no `stripe-webhook` diz "premium = R$ 98 / profissional = R$ 49". Bate com o pagamento (R$ 98 = Premium). Sem inconsistência.
- Recomendação futura (não fazer agora): substituir `adminClient.auth.admin.listUsers()` nos ramos `invoice.paid` / `subscription.updated` por `getUserByEmail` (ou paginar), para evitar falha silenciosa em base grande.

### Próximo passo sugerido
Confirmar comigo se posso: (a) verificar `expires_at` do token e o log do Resend, e depois (b) reenviar o link para a Daniela (Opção A). Só executarei alterações após sua autorização.