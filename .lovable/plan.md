## Objetivo
Tornar “Gerar Orçamento” e “Gerar Carteira Digital” do card de oportunidade fluxos contextuais: pré-preencher todos os dados disponíveis, criar vínculo rastreável e evitar duplicidade.

## Escopo (o que está na oportunidade hoje e será reaproveitado)
Reaproveitarei todos os campos que **realmente existem** na tabela `opportunities` + `clients` ligadas:
- Cliente: `client_id`, `name`, `email`, `phone`, `city`, `notes`, `travel_preferences`, `internal_notes`
- Viagem: `destination`, `start_date`, `end_date`, `passengers_count`, `adults_count`, `children_count`, `estimated_value`, `notes`
- Comercial: vínculo `opportunity_id` (rastreabilidade)

Campos pedidos no briefing que **não existem** hoje no schema (origem da viagem, perfil da viagem, idades das crianças, tipo de viagem, origem do lead, responsável, tags propagadas para orçamento/carteira) ficam **fora deste fluxo** — exigiriam novas colunas em `opportunities`. Posso atacar isso num passo seguinte, se quiser.

## Mudanças

### 1. Banco de dados
- **Migração**: adicionar `opportunity_id uuid` em `public.trips` com FK `ON DELETE SET NULL` + índice. `quotes.opportunity_id` já existe.

### 2. Card da oportunidade (`OpportunityCard.tsx`)
- `handleCreateQuote` e `handleCreateTripWallet` enriquecidos: enviar via `navigate state` o pacote completo (cliente + viagem + valor estimado + notas).
- Antes de navegar, consultar se já existe `quotes` ou `trips` vinculados a essa `opportunity_id`. Se existir:
  - Diálogo: **Abrir existente** | **Criar novo** | **Cancelar**.
- Atualizar o menu com rótulos consistentes.

### 3. Formulário de orçamento (`QuoteClientForm` + `GerarOrcamento`)
- Estender `defaults` para incluir `estimated_value`, `notes`, dados de contato do cliente (já temos `client_id`, mas garantir que o `ClientSelector` mostre o cliente correto e injete telefone/email no preview).
- `handleCreateQuote` continua persistindo `opportunity_id`.

### 4. Carteira Digital (`TripWallet` + `TripForm` + `useTrips`)
- `TripWalletContent`: ler `useLocation().state` e passar como `defaultValues` para `TripForm`.
- `TripForm`: já aceita `defaultValues`, garantir cobertura dos campos.
- `useTrips.createTrip`: aceitar e persistir `opportunity_id` e `client_id` (se ainda não vincula).

### 5. Timeline da oportunidade
- Ao criar quote a partir da oportunidade → inserir linha em `opportunity_history` com `to_stage = "Orçamento criado"` (registro informativo, sem mudar `stage`).
- Idem para carteira: `"Carteira digital criada"`.
- Aparece automaticamente no histórico já existente.

### 6. (Opcional, comportamento padrão proposto)
- **Não** mover automaticamente a oportunidade de etapa ao gerar orçamento/carteira — apenas registrar evento. Mudança automática de etapa pode ser surpreendente; mantenho como melhoria futura, configurável.

## Fora de escopo (proposto adiar)
- Criar campos novos na oportunidade (origem, tipo de viagem, perfil, idades das crianças, tags propagadas).
- Reaproveitamento automático na **Operação** (a `operations.opportunity_id` já existe; o trigger atual cria a operação no fechamento — manter como está).
- Auto-mover etapa do Kanban ao gerar artefatos.

## Detalhes técnicos
- Migração simples: `ALTER TABLE public.trips ADD COLUMN opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL; CREATE INDEX ...`. Sem mexer em RLS (já filtra por `user_id`).
- Consultas de duplicidade: `select id from quotes where opportunity_id = $1 limit 1` e idem para trips — feitas no momento do clique.
- Diálogo de duplicidade: novo componente `LinkedArtifactDialog` simples (AlertDialog com 3 ações).
- `opportunity_history.to_stage` aceita texto livre — usado apenas para o feed.
