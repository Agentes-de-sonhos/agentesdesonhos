# Google Calendar — dossiê de verificação OAuth

Documento de apoio para o processo de verificação do app OAuth no Google Cloud.
Atualizado na etapa final de hardening da integração.

## 1. Identificação

| Item | Valor |
| --- | --- |
| Produto | Agentes de Sonhos |
| Domínio principal | https://app.agentesdesonhos.com.br |
| Homepage | https://agentesdesonhos.com.br |
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

## 6. Roteiro do vídeo de demonstração

1. Mostrar a URL `app.agentesdesonhos.com.br` e o login do usuário de teste.
2. Abrir **Agenda** e mostrar o botão "Conectar Google Calendar".
3. Abrir a tela de consentimento da plataforma, lendo em voz alta as permissões solicitadas e a
   finalidade; mostrar o link para a Política de Privacidade.
4. Clicar em "Continuar para o Google" e mostrar a tela de consentimento do Google, destacando
   que apenas os dois escopos mínimos aparecem.
5. Voltar à Agenda e mostrar o status "Sincronizado" e o botão "Detalhes" com o relatório.
6. Criar um compromisso na plataforma, sincronizar e mostrá-lo aparecendo no Google Calendar.
7. Criar um evento no Google Calendar, sincronizar e mostrá-lo aparecendo na Agenda.
8. Clicar em "Desconectar", mostrar a opção de apagar cópias locais e concluir.
9. Mostrar em https://myaccount.google.com/permissions que o acesso não está mais concedido.

## 7. Conexões legadas

Conexões criadas antes desta etapa foram autorizadas com o escopo amplo `auth/calendar`.
Elas continuam funcionando e são registradas com `oauth_scope_version = 1`. Na próxima
reconexão do usuário, o consentimento passa a pedir apenas o par mínimo e a conexão é
registrada com `oauth_scope_version = 2`. Nenhum token, evento ou mapeamento é apagado nesse
processo.
