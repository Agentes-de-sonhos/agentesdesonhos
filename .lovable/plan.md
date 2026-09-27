# Plano de Implementação: Módulo Ofertas em Meus Projetos e Sites White-Label

Documento técnico consolidado contendo as regras de negócio, modelo de dados, políticas de segurança, fluxo de conversão e fases de execução do módulo de Ofertas.

---

## 1. Visão Geral e Diretrizes de Negócio

### Localização e Acesso
* **Painel da Agência:** nova aba **Ofertas** dentro de **Meus Projetos** (`/projetos?tab=offers` ou `/gestao/projetos?tab=offers`).
* **Menu Principal:** nenhum item novo será criado na barra lateral de navegação.
* **Critério de Elegibilidade:** exclusivo para agências que contrataram e possuem site institucional ativo. Agências sem site não visualizam a aba nem possuem rotas públicas habilitadas.
* **Piloto Inicial:** a primeira liberação será restrita à agência piloto (**Destinos com a Ju**), mantendo os demais sites e agências intactos.

### Convivência com a Vitrine Atual
* Materiais, campanhas e links existentes em `vitrine.tur.br` ou `/ofertas` continuam operando normalmente sem quebra de URLs.
* Na versão inicial, as ofertas cadastradas e os itens ativos da vitrine convivem de forma harmoniosa na listagem pública do site da agência até uma futura unificação definitiva.

### Nomenclatura Editorial
* Adotar o termo "Ofertas" na interface e na navegação.
* Nos cards e detalhes públicos, utilizar termos como "Oportunidade de viagem" ou "Valor a partir de". A palavra "Promoção" só será exibida quando houver valor anterior de comparação comprovado (`compare_at_price`).

---

## 2. Ativação, Publicação e Controle Individual no Orçamento

### Configuração Geral da Agência
* A publicação automática de novos orçamentos **inicia desativada por padrão**. Cada agência elegível precisa ativá-la explicitamente nas configurações da aba.
* A ativação **não publica retroativamente** orçamentos antigos: passa a valer apenas para orçamentos elegíveis salvos a partir do momento da ativação.
* Apenas orçamentos com status `published` são elegíveis para gerar ofertas. Rascunhos (`draft`) nunca geram ofertas públicas.

### Controle Individual no Orçamento (Interface Positiva)
* **Texto na Interface:** no formulário do orçamento, haverá um interruptor claro com redação positiva:
  **"Publicar como oferta no site"**
* **Comportamento Lógico:**
  * Quando marcado: `offer_opt_out = false` (o orçamento é elegível para gerar/atualizar oferta pública).
  * Quando desmarcado: grava internamente `offer_opt_out = true` (bloqueio expresso contra publicação).
  * Esse controle individual **prevalece sempre** sobre a configuração geral da agência.

---

## 3. Preço da Oferta e Regras de Validação

* **Coluna Anulável:** `price_from NUMERIC(12,2) NULL` (sem valor padrão zero), impedindo que dados incompletos façam uma viagem parecer gratuita.
* **Ofertas Originadas de Orçamento:** exigem preço obrigatório maior que zero para serem publicadas. Se o preço for nulo ou menor/igual a zero, a oferta é salva como rascunho com aviso de pendência.
* **Ofertas Manuais:** permitem que o agente escolha explicitamente a modalidade "Consulte" ou "Sob consulta" quando não houver tarifa fixa inicial. A interface pública exibirá "Consulte" ou "Solicite uma cotação", **nunca R$ 0,00**.

---

## 4. Sincronização Híbrida por Campo

```text
+-----------------------+                 +-----------------------+
|  Orçamento de Origem  |                 |    Oferta Pública     |
|  (quotes / services)  |                 |       (offers)        |
+-----------------------+                 +-----------------------+
|  datas, voos, hotéis, | ===(sync)===>   |  Campos estruturais   |
|  serviços, preço base |                 |  (se não customizado) |
+-----------------------+                 +-----------------------+
|  dados do cliente,    | ---(bloqueado)-x|  NUNCA entram na      |
|  margens, docs, notas |                 |  oferta pública       |
+-----------------------+                 +-----------------------+
                                          |  customized_fields[]  |
                                          |  (campos editados à   |
                                          |   mão na oferta)      |
                                          +-----------------------+
```

### Regras da Sincronização Híbrida:
1. **Campos Estruturais (sincronizados automaticamente):** período da viagem (`travel_start`, `travel_end`, `nights`), serviços inclusos, companhias aéreas, hotéis/regimes, preço de partida (`price_from`, `currency`) e condições de pagamento.
2. **Campos Editoriais (independentes por padrão):** título comercial da oferta, descrição de vendas, imagem de capa de destaque e galeria de fotos.
3. **Mapeamento de Customizações (`customized_fields`):** caso o agente altere manualmente um dado estrutural na tela da oferta, apenas o identificador desse campo entra no array `customized_fields` (ex.: `['price_from', 'travel_start']`).
4. **Comportamento ao Atualizar Orçamento:** a rotina compara os dados e atualiza exclusivamente os campos estruturais que **não constam** em `customized_fields`.
5. **Restauração sob Demanda:** a tela de edição da oferta oferece a ação "Restaurar dados do orçamento", permitindo reverter um campo específico ou todos os campos para os dados vigentes no orçamento de origem.
6. **Imutabilidade de Estado Operacional:** a sincronização é idempotente e grava `last_synced_at` e `source_quote_updated_at`. Atualizações no orçamento **nunca reativam automaticamente** ofertas pausadas, expiradas ou encerradas.

---

## 5. Estados Públicos, Ciclo de Vida e Consultas RPC

### Comportamento das Funções de Leitura no Banco de Dados:

* **Listagem e Filtros (`get_public_offers`):**
  * Retorna exclusivamente ofertas com status `published`, pertencentes à agência informada e dentro da validade (`expires_at >= now()`).
  * Ofertas pausadas, expiradas, encerradas, rascunhos e agendadas **não aparecem** na listagem nem compõem as opções dos filtros.

* **Link Direto da Oferta (`get_public_offer_by_slug`):**
  * `published`: retorna a oferta completa e higienizada para visualização e envio de proposta.
  * `expired` ou `ended`: retorna a oferta de forma sanitizada com sinalização de status encerrado, permitindo exibir a tela informativa e o botão "Solicitar uma cotação semelhante" (sem erro 404).
  * `paused`: retorna apenas uma indicação genérica de indisponibilidade temporária, **sem expor** título, preços, serviços, imagens ou qualquer detalhe comercial.
  * `draft` e `scheduled`: não ficam acessíveis publicamente (retornam não encontrado).

* **Vigência Padrão:** 7 dias a partir da data de publicação (`expires_at = publish_at + interval '7 days'`), com ajuste manual permitido (estender, pausar ou republicar).

---

## 6. Fluxo de Conversão, Solicitações e CRM

### Estrutura Unificada em `agency_site_requests`
Em vez de uma tabela paralela (`offer_requests`), todas as solicitações de ofertas serão gravadas na tabela existente `agency_site_requests` com colunas retrocompatíveis.

**Justificativa Técnica:**
* Reaproveita todo o ecossistema já homologado de CRM, notificações por e-mail/push, vínculo com clientes (`client_id`), oportunidades (`opportunity_id`), UTMs e idempotência.
* Centraliza o atendimento da agência em um único painel de solicitações.

### Colunas Adicionadas em `agency_site_requests`:
* `offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL`
* `offer_snapshot JSONB` (fotografia imutável dos dados visualizados pelo visitante)
* `converted_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL`
* `service_key`: identificador `'oferta'`, com `service_label`: `'Oferta do Site'`.
* `consent_version` e `consent_at`: campos existentes na tabela, preenchidos formalmente na submissão.

### Regras do Formulário Público:
1. **Sem Atalhos para WhatsApp:** nenhum botão flutuante, link ou redirecionamento automático para o aplicativo do WhatsApp na página da oferta.
2. **Campos do Formulário:**
   * Nome completo (obrigatório)
   * WhatsApp com DDD (obrigatório, canal de retorno da equipe)
   * E-mail (opcional)
   * Quantidade de adultos (obrigatório)
   * Quantidade de crianças (obrigatório)
   * Cidade de saída (obrigatório)
   * Observações ou preferências (opcional)
   * Checkbox obrigatório de consentimento e aceite da Política de Privacidade
3. **Aviso Prévio de Transparência:** localizado logo acima do botão de envio:
   *"Os valores e a disponibilidade dos serviços desta oferta podem sofrer variações até a confirmação da reserva. Nossa equipe analisará sua solicitação e retornará com as condições atualizadas."*
4. **Momento do Snapshot:**
   * O `offer_snapshot` é gerado no servidor exclusivamente no momento da submissão validada e bem-sucedida do formulário, na mesma transação que cria a solicitação em `agency_site_requests`.
   * O clique no CTA de abertura do formulário **não cria solicitação nem snapshot**, impedindo a criação de leads fantasmas por simples visualização.
   * A fotografia imutável armazena: título, destino, período, cidade de saída informada, preço de partida ou indicação sob consulta, condições e validade visualizadas. Alterações posteriores na oferta não alteram esse registro histórico.
5. **Minimização LGPD:** nenhum endereço IP é armazenado. A conformidade jurídica apoia-se em versão do texto (`consent_version`), carimbo de data e hora (`consent_at`), origem e marcação explícita no checkbox.

### Ação "Criar Orçamento a partir da Oferta":
* Na Central de Solicitações do painel, o agente poderá clicar em "Criar orçamento a partir da oferta".
* O orçamento é criado como **rascunho (`draft`)**, vinculado à solicitação e ao cliente.
* A oferta original **não é modificada**.
* A localização ou criação do perfil do cliente segue estritamente as regras de deduplicação já utilizadas pelo CRM (por e-mail ou WhatsApp), sem criar mecanismos paralelos.
* A operação é estritamente **idempotente**: uma segunda tentativa localiza e abre o orçamento já existente gravado em `converted_quote_id`.

---

## 7. Filtros Iniciais na Página Pública `/ofertas`

Na primeira versão, a busca pública contará exclusivamente com 3 filtros combináveis e dinâmicos:
1. **Categoria ou Tipo de Serviço** (ex.: Pacotes, Cruzeiros, Resorts, Hospedagem).
2. **Destino** (cidades/países com ofertas ativas disponíveis).
3. **Mês da Viagem** (mês e ano de embarque das ofertas vigentes).

*(O filtro por faixa de preço fica postergado para evolução futura).*

---

## 8. Modelo de Dados e Segurança

```text
+------------------------------------+
|       agency_offer_settings        |
+------------------------------------+
| agency_owner_id (PK, UUID)         |
| enabled (BOOLEAN, default false)   |
| auto_publish_new_quotes (BOOLEAN)  |
| default_validity_days (INT, def 7) |
| updated_at (TIMESTAMPTZ)           |
+------------------------------------+

+-------------------------------------------------------------+
|                           offers                            |
+-------------------------------------------------------------+
| id (PK, UUID)                                               |
| agency_owner_id (UUID -> users)                             |
| created_by (UUID -> users)                                  |
| source_quote_id (UUID -> quotes, NULLABLE)                  |
| origin ('quote' | 'manual' | 'import')                      |
| slug (TEXT)                                                 |
| status ('draft'|'scheduled'|'published'|'paused'|'expired'| |
|         'ended')                                            |
| title (TEXT)                                                |
| description (TEXT)                                          |
| cover_url (TEXT)                                            |
| gallery (JSONB, default '[]')                               |
| destination (TEXT)                                          |
| category (TEXT, default 'Pacotes')                          |
| service_types (TEXT[], default '{}')                        |
| travel_start (DATE)                                         |
| travel_end (DATE)                                           |
| nights (INTEGER)                                            |
| price_from (NUMERIC(12,2), NULLABLE)                        |
| currency (TEXT, default 'BRL')                              |
| price_note (TEXT)                                           |
| compare_at_price (NUMERIC(12,2), NULLABLE)                  |
| customized_fields (TEXT[], default '{}')                    |
| last_synced_at (TIMESTAMPTZ)                                |
| source_quote_updated_at (TIMESTAMPTZ)                       |
| public_snapshot (JSONB, default '{}')                       |
| publish_at (TIMESTAMPTZ)                                    |
| expires_at (TIMESTAMPTZ)                                    |
| ended_at (TIMESTAMPTZ)                                      |
| views_count (INTEGER, default 0)                            |
| requests_count (INTEGER, default 0)                         |
| UNIQUE (agency_owner_id, slug)                              |
+-------------------------------------------------------------+
```

### Regras de Acesso e Permissões (RLS):
* `offers` e `agency_offer_settings`: leitura e edição restritas aos usuários autenticados da agência proprietária.
* Acesso Público: a tabela `offers` não recebe permissão direta de leitura para o papel `anon`. O acesso externo ocorre exclusivamente por RPCs `SECURITY DEFINER` que aplicam as regras estritas por status descritas na seção 5.

### Rotina de Expiração em Background:
* Função `process_offer_expirations()` executada a cada 15 minutos via `pg_cron`:
  * Transiciona de `published` para `expired` quando `expires_at < now()`.
  * Transiciona de `scheduled` para `published` quando `publish_at <= now()`.
  * Nenhuma oferta é excluída do banco de dados.

---

## 9. Fases de Implementação

1. **Fase 1 — Modelo de Dados e Permissões:** tabelas `agency_offer_settings` e `offers`, extensões em `quotes` (`offer_opt_out`) e `agency_site_requests` (`offer_id`, `offer_snapshot`, `converted_quote_id`), RPCs públicas (`get_public_offers` e `get_public_offer_by_slug`) e job de expiração.
2. **Fase 2 — Sincronização Híbrida e Higienização:** rotina que extrai dados sanitizados do orçamento, valida obrigatoriedade de preço em ofertas de orçamentos, respeita `customized_fields` e impede vazamento de dados confidenciais.
3. **Fase 3 — Gestão em Meus Projetos:** aba Ofertas, listagem com filtros de status (Ativas, Agendadas, Pausadas, Histórico), ações operacionais (pausar, estender, encerrar, copiar link, restaurar dados) e controle individual no editor de orçamentos ("Publicar como oferta no site").
4. **Fase 4 — Criação Manual e Importador por IA:** criação avulsa com opção "Consulte" e importação de materiais com tela obrigatória de revisão editorial antes de publicar.
5. **Fase 5 — Páginas Públicas White-Label:** listagem `/ofertas` com os 3 filtros combináveis, página de detalhe `/ofertas/:slug` com formulário único, aviso de variação e telas adequadas para ofertas pausadas ou expiradas/encerradas.
6. **Fase 6 — Conversão e CRM:** exibição da solicitação com snapshot na Central e ação idempotente "Criar orçamento a partir da oferta".
7. **Fase 7 — Testes e Homologação do Piloto:** validações de segurança, isolamento multi-tenant e homologação restrita à agência Destinos com a Ju.

---

## 10. Critérios de Aceite

* Nenhum dado confidencial (cliente, margens, notas internas, documentos) é exposto na oferta pública.
* A sincronização híbrida respeita rigorosamente `customized_fields` e nunca reativa ofertas pausadas, expiradas ou encerradas.
* O controle individual no orçamento utiliza a frase positiva "Publicar como oferta no site" e sobrepõe a configuração da agência.
* Ofertas originadas de orçamento exigem preço válido; a modalidade "Consulte" é restrita a ofertas manuais e nunca exibe R$ 0,00.
* As RPCs públicas cumprem as regras de estado: `get_public_offers` lista apenas ofertas publicadas e ativas; `get_public_offer_by_slug` atende ativas, expiradas e encerradas, mas retorna apenas indisponibilidade genérica para pausadas.
* O formulário público não possui atalho para WhatsApp e contém todos os campos validados (cidade de saída obrigatória e e-mail opcional).
* O `offer_snapshot` é registrado apenas na submissão validada do formulário, gravando fotografia imutável dos dados sem armazenar IP.
* A ação "Criar orçamento a partir da oferta" é idempotente e utiliza as regras existentes de deduplicação de clientes do CRM.
* O piloto permanece restrito à Destinos com a Ju sem afetar os demais sites e agências.
