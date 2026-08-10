# Estabilização da integração Google Calendar

Objetivo: corrigir segurança, escalabilidade e fidelidade da sincronização antes de reduzir o escopo OAuth e submeter à verificação Google. Nada de exclusão em massa; as 4 conexões e os 63.056 mapeamentos existentes são preservados. O escopo OAuth permanece `calendar` nesta fase.

## Fases (cada uma isolada, reversível e verificável)

### Fase 0 — Travas de segurança imediatas
- `supabase/functions/google-calendar-cron/index.ts`: exigir autenticação real — apenas requisições com `x-internal-key` igual ao secret `CALENDAR_CRON_SECRET`; sem match → 401 genérico. Remover `user_id` da resposta (apenas contagens agregadas).
- Recriar o job pg_cron enviando esse header, com o segredo gravado pelo mecanismo seguro de dados (não em migration versionada).
- `supabase/functions/google-calendar-sync/index.ts`: o caminho interno passa a validar `CALENDAR_CRON_SECRET` (hoje compara com a service role key); manter compatibilidade por um deploy e remover depois.
- Migration RLS: `google_calendar_tokens` deixa de ser acessível ao cliente (somente `service_role`). O frontend já usa apenas a ação `status` da Edge Function (`useGoogleCalendar.ts`), então não há regressão de UI.
- Novas colunas de estado: `connection_state` (`connected` | `reconnect_required` | `revoked`), `last_auth_error`, `last_auth_error_at`.

### Fase 1 — OAuth state seguro
- Nova tabela `google_oauth_states` (id, user_id, nonce_hash, created_at, expires_at, consumed_at), GRANT só para `service_role`, RLS habilitada sem policies de cliente.
- `google-calendar-auth`: nonce aleatório de 32 bytes, hash persistido, TTL de 10 min, `state` opaco enviado ao Google.
- `google-calendar-callback`: consumo atômico (`update ... set consumed_at=now() where id=$1 and consumed_at is null and expires_at>now() returning user_id`); qualquer falha → erro genérico. Fim da confiança no Base64 de `user_id`.
- Limpeza de states expirados dentro do cron existente.

### Fase 2 — Tokens em repouso (ativação dependente de secret)
- Colunas `access_token_enc`, `refresh_token_enc`, `token_enc_version int default 0`.
- Helper `supabase/functions/_shared/tokenCrypto.ts` com AES-GCM derivado do secret `GOOGLE_TOKEN_ENC_KEY`. Se o secret não existir, o helper opera em passthrough e o comportamento atual continua — nenhuma das 4 conexões quebra.
- Migração gradual: a cada refresh/sync bem-sucedido o token é reescrito cifrado (`token_enc_version = 1`); leitura tenta a coluna cifrada e cai para a legada. Só depois de 100% migrado uma migration final limpa as colunas em texto.
- Ação necessária: adicionar `GOOGLE_TOKEN_ENC_KEY` em Configurações → Secrets. Até então a fase fica inerte por desenho.

### Fase 3 — Desconexão e falhas de refresh
- `disconnect`: revogar em `https://oauth2.googleapis.com/revoke` antes de apagar o token; erro de revogação é registrado sem bloquear. **Não** apagar `google_calendar_sync` — mapeamentos preservados.
- `invalid_grant` no refresh: marcar `connection_state='reconnect_required'`, liberar `sync_in_progress`, registrar o erro e **não apagar mapeamentos**. `useGoogleCalendar` e `GoogleCalendarSyncButton` exibem "Reconexão necessária" com botão Reconectar.
- Os 287 mapeamentos ativos de 3 usuários sem token ficam intactos e marcados como `reconnect_required`.

### Fase 4 — Sincronização incremental e contas grandes
- Colunas: usar o `sync_token` já existente, mais `bootstrap_page_token`, `bootstrap_started_at`, `bootstrap_completed_at`.
- Pull em dois modos:
  - **Bootstrap paginado persistente**: sem `sync_token`, percorre a janela com `pageToken` salvo no banco, N páginas por execução (ex.: 5), retomando na execução seguinte. Sem cap silencioso: o relatório mostra progresso.
  - **Incremental**: com `sync_token`, chama a API só com `syncToken`; `410 Gone` limpa o token e reinicia o bootstrap.
- Lock: liberar lock preso (>5 min) e limpar `sync_in_progress` também em erro fatal — resolve a conexão de 62.776 eventos travada em `syncing`.
- Cron: timeout por usuário, orçamento total de execução e ordenação por `last_sync_at` mais antigo, para que uma conta grande nunca bloqueie as demais.

### Fase 5 — Fidelidade de dados
- Migration em `google_calendar_sync`: `google_etag`, `google_updated`, `google_calendar_id`, `recurring_event_id`, `original_start_time`, `is_google_managed`, `origin` (`local` | `google`), `provider_snapshot jsonb`.
- Migration na tabela de eventos da agenda (campos opcionais, UI atual segue funcionando): fim do evento, `time_zone`, `all_day`, `location`, `conference_url`, `attendees jsonb`, `reminders jsonb`, `organizer jsonb`.
- Push migra de `PUT`/`update` para **`PATCH`** com `If-Match: <etag>`, enviando apenas os campos que a UI controla — nunca removendo participantes, Meet, recorrência, lembretes, local ou privacidade.
- Duração/fuso: usar o fim real quando existir; sem ele, duração padrão configurável (1h) e `timeZone` do evento/usuário — remove o offset fixo `-03:00`.
- Pull passa a gravar fim, `timeZone`, `all_day`, `location`, `attendees`, `reminders`, `organizer`, `conferenceData`, `recurrence`/`recurringEventId`/`originalStartTime` e o snapshot.
- `singleEvents=true` é mantido nesta fase; instâncias recorrentes ganham `recurring_event_id` e ficam read-only localmente para não quebrar a série.

### Fase 6 — Conflitos, read-only e exclusões seguras
- Política de conflito explícita: comparar `google_updated`/`etag` com `last_synced_at`. Se os dois lados mudaram → **não sobrescrever**, registrar `conflict` no relatório com ambos os lados. `412` no PATCH também gera conflito, nunca retry cego.
- Ordem invertida: **pull antes de push**, reduzindo sobrescrita silenciosa.
- Read-only: eventos `is_google_managed`, de calendários não-default, com `eventType` diferente de `default` ou instâncias de recorrência não são enviados ao Google (skip `read_only`).
- Exclusões: evento com `origin='google'` nunca é apagado no Google por padrão (só desvinculado com tombstone local). Somente `origin='local'` propaga `DELETE`, com confirmação explícita na UI.
- Relatório (`SyncReport` + `SyncReportDialog.tsx`): novas seções de conflitos, read-only, bootstrap em andamento e reconexão necessária.

## Ordem de implantação
0 → 1 → 3 → 4 → 5 → 6, com a Fase 2 preparada em paralelo e ativada só quando o secret existir. Cada fase é um deploy separado, validado em preview antes de publicar.

## Riscos e mitigações
- **Troca PUT→PATCH**: estritamente menos destrutivo; validado com evento de teste contendo Meet e participantes.
- **Bootstrap longo na conta de 62.776 eventos**: progresso persistido, nada se perde se a execução expirar.
- **RLS mais restrita em tokens**: sem leitura direta no frontend hoje, verificado em `useGoogleCalendar.ts`.
- **410 em massa** ao ativar incremental: recovery automático volta ao bootstrap.
- **Secret ausente**: nenhuma fase além da 2 depende de secret novo (o `CALENDAR_CRON_SECRET` é gerado automaticamente).

## Matriz de QA
Testes unitários novos (`src/test/google-calendar-*.test.ts`): payload do PATCH, decisão de conflito, decisão de exclusão por `origin`, classificação read-only, avanço de bootstrap e recovery de `410`, parsing do relatório. Verificação manual em preview: evento simples, all-day, duração custom, timezone diferente, recorrente, com Meet, com participantes, com lembretes, alteração simultânea nos dois lados, exclusão local e no Google, token expirado, token revogado, reconexão, conta grande e cron autenticado vs. não autenticado.

## Agora vs. dependente de configuração externa
- **Agora**: Fases 0, 1, 3, 4, 5, 6 com suas migrations e testes.
- **Depende de secret**: ativação da criptografia de tokens (`GOOGLE_TOKEN_ENC_KEY`).
- **Depende do Google Cloud**: redução de escopo, tela de consentimento e submissão à verificação — somente depois do núcleo estável e testado.