# Google Calendar — dossiê de verificação OAuth

Documento de apoio para o processo de verificação do app OAuth no Google Cloud.
Atualizado na etapa final de hardening da integração.

## 1. Identificação

| Item | Valor |
| --- | --- |
| Produto | Agentes de Sonhos |
| Domínio principal | https://app.agentesdesonhos.com.br |
| Homepage | https://agentesdesonhos.com.br |
| Homepage pública da integração (App homepage no formulário) | https://agentesdesonhos.com.br/google-calendar |
| Política de Privacidade | https://agentesdesonhos.com.br/politicasdeprivacidade (seção 7 — Integração com o Google Calendar) |
| Termos de Uso | https://agentesdesonhos.com.br/termosdeuso |
| Redirect URI OAuth | `https://<projeto>.supabase.co/functions/v1/google-calendar-callback` |
| Contato / DPO | suporte@agentesdesonhos.com.br |

## 2. Escopos solicitados e justificativa

| Escopo | Sensibilidade | Por que é necessário | Endpoints usados |
| --- | --- | --- | --- |
| `https://www.googleapis.com/auth/calendar.events` | Sensível | Sincronização bidirecional entre a Agenda do agente de viagens e o Google Calendar: importar compromissos existentes e publicar/atualizar/remover os compromissos criados na plataforma. | `GET/POST /calendar/v3/calendars/primary/events`, `PATCH/DELETE /calendar/v3/calendars/primary/events/{id}` |
| `https://www.googleapis.com/auth/calendar.calendars.readonly` | Sensível | Ler somente o fuso horário do calendário principal para gravar horários corretos (DST incluído) e distinguir eventos de dia inteiro. | `GET /calendar/v3/calendars/primary?fields=timeZone` |

Escopos deliberadamente **não** solicitados:

- `https://www.googleapis.com/auth/calendar` (acesso total) — substituído pelo par mínimo acima.
- Qualquer escopo de Gmail, Drive, Contacts, People ou Tasks.

Não é possível atender ao caso de uso com escopos menos permissivos: `calendar.events.readonly`
impediria a publicação dos compromissos criados na plataforma, que é o valor central do recurso.

## 3. Uso limitado dos dados (Limited Use)

- Os dados de calendário são usados **exclusivamente** para prestar o recurso de sincronização.
- Não há venda, cessão, publicidade, remarketing ou perfilamento comercial.
- Não há uso dos dados para treinar modelos de IA.
- Não há leitura humana, exceto com autorização expressa do usuário em atendimento de suporte,
  exigência legal ou investigação de incidente de segurança.
- Transferência a terceiros limitada à infraestrutura de hospedagem/banco que opera o serviço.

## 4. Segurança

- Credenciais OAuth (access/refresh token) guardadas criptografadas com AES-256-GCM
  (`GOOGLE_TOKEN_ENC_KEY`), sem nenhuma cópia legível em repouso.
- Tabela de credenciais acessível apenas pelo papel de serviço; nenhum privilégio para papéis
  anônimo ou autenticado.
- `state` OAuth de uso único (nonce de 32 bytes, apenas o hash é persistido, TTL de 10 minutos).
- Job automático autenticado por segredo compartilhado guardado no vault do banco.
- Logs de sincronização agregados, sem identificadores de usuário.
- Revogação do grant em `oauth2.googleapis.com/revoke` no momento de desconectar.

## 5. Controle do usuário

- A conexão é opcional e sempre iniciada pelo usuário.
- Antes do redirecionamento ao Google, a plataforma exibe uma tela explicando permissões,
  finalidade, o que nunca é feito com os dados e o link para a Política de Privacidade.
- Ao desconectar, o usuário escolhe entre preservar as cópias locais dos eventos importados ou
  apagá-las. Eventos no Google nunca são apagados por essa ação.
- Revogação também disponível em https://myaccount.google.com/permissions.

## 6. Demo video script (English — as required by Google review)

Record in one take, English narration, no cuts, browser URL bar always visible.

1. "This is Agentes de Sonhos, a management platform for travel agents." Show the public
   integration page at `https://agentesdesonhos.com.br/google-calendar`, scrolling through the
   requested scopes, the data usage section and the disconnect section. Point at the link to the
   Privacy Policy.
2. Show the OAuth client ID on screen matching the client submitted for verification.
3. Sign in to `https://app.agentesdesonhos.com.br` with the test account provided to Google.
4. Open **Agenda** (Calendar) and point at the "Conectar Google Calendar" ("Connect Google
   Calendar") button. "The integration is optional and always started by the user."
5. Click it. Read the in-app consent screen out loud: "We request only two scopes:
   `calendar.events`, to read and write the events of your primary calendar, and
   `calendars.readonly`, to read only the calendar time zone." Show the Privacy Policy link.
6. Click "Continuar para o Google" ("Continue to Google") and show the Google consent screen.
   Say: "Only the two minimum scopes are listed here — nothing else is requested."
7. Grant consent and return to the app. Show the status indicator reaching "Sincronizado"
   ("Synced") and open the "Detalhes" ("Details") report.
8. Create an appointment in the platform, run the sync, then open Google Calendar in another tab
   and show the same event there, with matching title, date, time and time zone.
9. Create an event directly in Google Calendar, run the sync again, and show it appearing in the
   platform Agenda. "The synchronization is bidirectional, which is why the write scope is
   required."
10. Click "Desconectar" ("Disconnect"). Show the dialog and its optional checkbox: "The user can
    also delete the local copies of the events imported from Google. We never delete anything on
    the Google side."
11. Confirm the disconnect and show the button returning to the disconnected state.
12. Open `https://myaccount.google.com/permissions` and show that Agentes de Sonhos no longer has
    access. "The token was revoked at Google and deleted from our database."

## 7. Conexões legadas

Conexões criadas antes desta etapa foram autorizadas com o escopo amplo `auth/calendar`.
Elas continuam funcionando e são registradas com `oauth_scope_version = 1`. Na próxima
reconexão do usuário, o consentimento passa a pedir apenas o par mínimo e a conexão é
registrada com `oauth_scope_version = 2`. Nenhum token, evento ou mapeamento é apagado nesse
processo.
