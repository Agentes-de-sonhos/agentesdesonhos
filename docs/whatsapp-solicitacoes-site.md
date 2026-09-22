# Aviso por WhatsApp de novas solicitações do site (preparado, desativado)

Estado atual: **preparado e inerte**. Toda solicitação cria uma linha de aviso
no canal `whatsapp_agency` com status `awaiting_template`. Nada é enviado
enquanto não existir template aprovado e configuração válida. A ausência de
telefone, template ou configuração **nunca** faz a solicitação falhar.

## Template sugerido

- Nome sugerido: `nova_solicitacao_site_ads`
- Categoria: **Utility** (notificação de serviço sobre um evento do próprio
  usuário — não é marketing)
- Idioma: `pt_BR`
- Corpo:

  ```text
  Olá, {{1}}. Você recebeu uma nova solicitação pelo seu site. Acesse a Gestão de Oportunidades para visualizar os detalhes e continuar o atendimento: {{2}}
  ```

- Variáveis:
  - `{{1}}` nome do agente ou da agência (`profiles.agency_name`, com o nome do
    agente como alternativa);
  - `{{2}}` link direto da oportunidade
    (`https://app.agentesdesonhos.com.br/crm?opportunity=<id>`).

## Destinatário

`profiles.phone` do titular da agência, normalizado em E.164 pela função
`public.to_e164_br` e validado por `isE164`. Telefone ausente ou inválido →
status `skipped` com motivo registrado.

## Configuração necessária

| Chave | Onde | Para que serve |
| --- | --- | --- |
| `WHATSAPP_REQUEST_TEMPLATE_SID` | Segredos do projeto | Content SID (`HX...`) do template aprovado |
| `WHATSAPP_FROM` | Segredos do projeto | Número remetente aprovado (`whatsapp:+55...`) |
| Conexão Twilio | Conectores do workspace | Credenciais de envio (nunca em código) |

## Passos para ativar

1. Cadastrar o template acima no WhatsApp Manager/Twilio Content Template
   Builder, categoria Utility, idioma pt-BR.
2. Aguardar a aprovação e copiar o Content SID.
3. Registrar `WHATSAPP_REQUEST_TEMPLATE_SID` e `WHATSAPP_FROM` nos segredos.
4. Conectar o Twilio como conector do workspace.
5. Liberar o envio no worker da fila (`agency_request_notifications`), que passa
   a tratar `whatsapp_agency` como `pending`.

## Idempotência

A fila tem `UNIQUE (request_id, channel)`: reprocessar, repetir o envio do
formulário ou repetir a passada do worker não gera segundo aviso.
