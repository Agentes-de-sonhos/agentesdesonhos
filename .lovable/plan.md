# Integração Telegram → Galeria de Materiais

## Visão geral
Você (admin) cria UM bot do Telegram via @BotFather e adiciona ele em canais/grupos de fornecedores parceiros. Toda vez que um fornecedor postar uma imagem ou PDF, o bot captura automaticamente, salva o arquivo na pasta do fornecedor correto, preserva a legenda e disponibiliza o material na **Galeria de Materiais** para todos os agentes.

## Como vai funcionar (visão do agente)
1. Fornecedor posta foto/PDF (com ou sem legenda) no canal do Telegram
2. Bot recebe automaticamente em segundos
3. Material aparece na Galeria de Materiais agrupado por **pasta do fornecedor**
4. Card mostra a legenda original (quando houver) com botões:
   - **Copiar legenda**
   - **Baixar lâmina** (individual)
   - **Baixar todas** do mesmo post/lote (zip)

## O que vou construir

### 1. Tabela de mapeamento (admin)
Nova tabela `telegram_supplier_channels`:
- `chat_id` (id do canal/grupo Telegram)
- `supplier_id` (FK → tour_operators)
- `category_default` (categoria padrão para os materiais recebidos)
- `is_active`

### 2. Tela admin: "Canais Telegram"
Em **Admin → Materiais**, nova aba para:
- Ver instruções de como adicionar o bot ao canal/grupo
- Listar canais conectados
- Vincular cada `chat_id` ao fornecedor correspondente
- Ativar/desativar canais

### 3. Edge Function `telegram-webhook`
- Recebe updates do Telegram (com validação de secret token)
- Para cada foto/documento: baixa via `getFile` → salva no bucket `materials` na pasta `telegram/{supplier_slug}/{batch_id}/`
- Cria registro em `materials` com:
  - `supplier_id` (do mapeamento)
  - `caption` (legenda do Telegram, se houver)
  - `batch_id` (para agrupar várias fotos do mesmo post — Telegram envia como `media_group_id`)
  - `material_type`: `imagem` ou `pdf`
  - `category` da configuração do canal
  - `title`: primeira linha da legenda ou "Material — {fornecedor} — {data}"
- Idempotência por `update_id` (Telegram pode reenviar)

### 4. UI: Galeria por fornecedor
Na página **Materiais**, garantir agrupamento visual por fornecedor (pasta) com:
- Card de lote (`batch_id`) mostrando até 4 thumbnails
- Legenda completa com botão "Copiar"
- "Baixar lâmina" individual (signed URL)
- "Baixar todas" (gera .zip no cliente com JSZip)

## Detalhes técnicos

**Conector necessário**: Telegram (via `standard_connectors`) — você adiciona o token do bot uma única vez, sem precisar colar em código.

**Bucket de armazenamento**: usaremos o bucket `materials` (já existente, público) com pasta `telegram/{supplier_slug}/`.

**Agrupamento de posts**: o Telegram envia múltiplas fotos do mesmo post como mensagens separadas com o mesmo `media_group_id` — usado como `batch_id`.

**Tipos de arquivo aceitos**: `photo`, `document` (PDF/imagens). Vídeos serão ignorados nesta versão.

**Segurança**: webhook validado por secret token derivado da API key do conector, conforme padrão Lovable.

## Passo a passo após eu construir
1. Você conecta o **Telegram** no Lovable (botão que aparecerá no chat)
2. Cria um bot no @BotFather e cola o token na conexão
3. Eu registro o webhook automaticamente
4. Você adiciona o bot como **administrador** no canal/grupo do fornecedor (necessário para receber mensagens em canais)
5. No painel admin, descobre o `chat_id` (mostro automaticamente assim que chegar a primeira mensagem) e vincula ao fornecedor

## Fora do escopo desta versão
- Análise automática com IA (você optou por apenas armazenar)
- Captura de vídeos
- Notificação push para agentes quando chega material novo

Quer que eu siga com essa estrutura?
