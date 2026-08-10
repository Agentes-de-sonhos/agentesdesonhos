---
name: Google Calendar — segurança e ciclo de conexão
description: State OAuth de uso único, cron autenticado por segredo no vault, tokens service_role-only, reconnect_required e preparação inerte de criptografia AES-GCM
type: feature
---

Bloco 1 de estabilização da integração Google Calendar (Fases 0, 1, 3 + preparação inerte da 2):

- **OAuth state**: `google_oauth_states` guarda apenas o hash SHA-256 de um nonce de 32 bytes, TTL de 10 min, consumo atômico de uso único via `consume_google_oauth_state`. O valor enviado ao Google é opaco (`<uuid>.<nonce>`) e nunca carrega `user_id`. State em Base64 legado é rejeitado.
- **Cron**: `google-calendar-cron` é fail-closed com o header `x-cron-secret`. O segredo vive no vault do banco (`calendar_cron_secret`), lido em runtime por `get_calendar_cron_secret()` (service_role) e enviado pelo job pg_cron via `public.trigger_google_calendar_cron()` — nunca inline em código, migration ou cron SQL. A resposta do cron é só agregada, sem `user_id`.
- **Tokens**: `google_calendar_tokens` é service_role-only (sem policies nem grants de cliente). O frontend obtém estado apenas pela ação `status` da Edge Function.
- **Ciclo de conexão**: coluna `connection_state` (`connected` | `reconnect_required` | `revoked`). Falha de refresh nunca apaga token nem mapeamentos: marca `reconnect_required`, libera o lock e a UI mostra "Reconectar Google Calendar".
- **Disconnect**: revoga o grant em `oauth2.googleapis.com/revoke` (best-effort), apaga só as credenciais locais e **preserva** `google_calendar_sync` e os eventos.
- **Criptografia**: `supabase/functions/_shared/googleTokenCrypto.ts` (AES-GCM, prefixo `v1:`) é inerte sem o secret `GOOGLE_TOKEN_ENC_KEY` — nesse caso escreve só as colunas legadas em texto e mantém `*_enc` NULL / `token_enc_version = 0`. Jamais gravar plaintext em coluna `*_enc`. Com o secret, dual-write (enc + plaintext) e dual-read; limpar o plaintext é etapa posterior verificada.

Pendências conhecidas para os blocos seguintes: sincronização incremental com `nextSyncToken`, bootstrap paginado para a conta de ~62,8k mapeamentos (hoje estoura o tempo do cron), fidelidade de campos (PATCH/ETag), política de conflito e redução do escopo OAuth.