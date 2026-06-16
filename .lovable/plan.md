# Roteiro V2 na Carteira Digital — Plano Técnico

## 1. Diagnóstico do estado atual

Hoje convivem dois modelos:

- **Criar Roteiros** (`/ferramentas-ia/criar-roteiro`)
  - Tabelas: `itineraries` → `itinerary_days` → `itinerary_activities`
  - Componentes: `ItineraryForm`, `ItineraryEditor`, `ItineraryPDF`, `PublishReviewDialog`, etc.
  - Hook central: `useItineraries`
  - Página pública: `RoteiroPublico.tsx`

- **Carteira Digital** (trips)
  - Tabelas: `trips` → `trip_itinerary_activities` (+ `trip_itinerary_period_images`)
  - Componentes: `TripItinerary.tsx`, `ItineraryActivityCard`, `ItineraryActivityForm`, `AIItineraryModal`, `ImportItineraryModal`
  - Hook: `useItineraryActivities`
  - Renderização pública: dentro de `CarteiraPublica` / `RoteiroPublico` (modo carteira)

Já existe um `ImportItineraryModal` que lê de `itineraries` e **copia** atividades para `trip_itinerary_activities`. Ou seja, hoje o vínculo é só por "import destrutivo", não por referência.

## 2. Arquitetura proposta

Modelo **opt-in, não destrutivo, com fallback total ao legado**.

### 2.1. Mudança mínima no schema

Adicionar em `trips`:

```text
trips
├── itinerary_id  uuid NULL  → FK itineraries(id) ON DELETE SET NULL
└── itinerary_mode  text NULL  CHECK (itinerary_mode IN ('legacy','v2'))
```

Regra de leitura:

```text
if trips.itinerary_mode = 'v2' AND trips.itinerary_id IS NOT NULL
   → renderiza Roteiro V2 (tabelas itineraries/days/activities)
else
   → renderiza Roteiro Legado (trip_itinerary_activities)
```

`itinerary_mode` é redundante em relação a `itinerary_id`, mas torna o fallback explícito e permite futuras variações sem ambiguidade. Pode ser omitido se preferirmos só `itinerary_id IS NOT NULL`.

### 2.2. Comportamento da Carteira

- Criar carteira **sem roteiro** → estado atual, nada muda.
- Adicionar roteiro à carteira oferece 3 caminhos:
  1. **Importar do módulo Criar Roteiros** → criar uma **cópia** do `itinerary` (e dos `itinerary_days` + `itinerary_activities`) com novo `id`, dono = user, e gravar `trips.itinerary_id = <copia.id>`, `itinerary_mode = 'v2'`. Roteiro original permanece intacto.
  2. **Criar do zero** dentro da carteira → reaproveitar `ItineraryForm` + `ItineraryEditor` em um modal/aba "Roteiro" da carteira, salvando direto em `itineraries` e vinculando.
  3. **Desvincular** → `itinerary_id = NULL`, `itinerary_mode = 'legacy'`. Não apaga o roteiro (continua disponível em Criar Roteiros).
- Carteiras antigas: ficam com `itinerary_id NULL`, modo `legacy`, e continuam usando `trip_itinerary_activities` (zero mudança visual ou de dados).

### 2.3. Por que copiar e não referenciar

Resposta às perguntas 3 e 7:

- **Copiar** evita que editar a carteira altere um roteiro que o agente já mandou para outro cliente.
- Mantém o ciclo de vida do roteiro acoplado à carteira (deletar a carteira pode opcionalmente deletar a cópia).
- Permite o agente continuar evoluindo o roteiro original sem impacto na carteira já entregue.
- Recomenda-se um campo opcional `itineraries.source_itinerary_id` (NULL) para rastrear a origem da cópia — útil para "sincronizar" no futuro, sem obrigar nada agora.

### 2.4. Reuso de componentes

Os componentes do módulo Criar Roteiros já são puros o suficiente para serem montados dentro da Carteira:

- `ItineraryForm` (criação inicial)
- `ItineraryEditor` (edição dia a dia, fotos, períodos)
- `AIGeneratingOverlay`, `PublishReviewDialog`, `downloadPDF`

Estratégia: criar um **wrapper** `TripItineraryV2.tsx` em `src/components/trip/itinerary/` que:

- Recebe `trip`, decide se cria/lê `itinerary_id` em `trips`.
- Monta `ItineraryForm`/`ItineraryEditor` em modo embed (sem o cabeçalho/navegação de `CriarRoteiro.tsx`).
- Expõe ações específicas da carteira: importar, criar do zero, desvincular.

`TripItinerary.tsx` (legado) continua existindo, é renderizado quando `itinerary_mode !== 'v2'`.

## 3. Arquivos e áreas impactadas

**Schema (1 migration aditiva):**
- `trips`: +`itinerary_id`, +`itinerary_mode` (default 'legacy'), índice em `itinerary_id`.
- `itineraries`: +`source_itinerary_id` (opcional, rastreio de cópia).

**Backend / RLS:**
- `trips`: políticas atuais não mudam (continuam por `user_id`).
- `itineraries` / `itinerary_days` / `itinerary_activities`: políticas atuais já escopam por dono. A cópia herda `user_id = auth.uid()`, então funciona naturalmente.
- Para a Carteira pública ler o roteiro V2: a `RoteiroPublico`/`CarteiraPublica` precisa de uma policy/RPC `SECURITY DEFINER` para buscar o `itinerary` + `days` + `activities` quando a carteira é acessada pelo token público. Validar se as policies públicas de `itineraries` já cobrem esse caso (parece que sim, via access code), senão criar `get_public_trip_itinerary(trip_id, access_code)`.

**Frontend — novos:**
- `src/components/trip/itinerary/TripItineraryV2.tsx` (wrapper embed)
- `src/components/trip/itinerary/AttachItineraryDialog.tsx` (importar / criar / desvincular)
- Função utilitária `cloneItinerary(sourceId, ownerId)` em `src/lib/roteiro-domain.ts` (cópia profunda: itinerary + days + activities + period images).

**Frontend — ajustes pontuais:**
- `src/pages/TripWallet.tsx`: substituir o render de `<TripItinerary />` por um seletor:
  - V2 → `<TripItineraryV2 />`
  - Legado → `<TripItinerary />` (sem mudança)
  - Sem roteiro → CTA "Adicionar roteiro" abrindo `AttachItineraryDialog`.
- `src/pages/CarteiraPublica.tsx` e `src/pages/RoteiroPublico.tsx`: branch de leitura V2 vs legado.
- `src/types/trip.ts`: tipar `itinerary_id`, `itinerary_mode`.

**Sem alteração:**
- `trip_itinerary_activities`, `trip_itinerary_period_images` — preservadas integralmente.
- Módulo Criar Roteiros — nenhuma mudança funcional.
- CRM, follow-ups, financeiro, RLS de outras áreas.

## 4. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| FK `trips.itinerary_id` → `itineraries.id` com `ON DELETE CASCADE` apagar carteiras | Usar `ON DELETE SET NULL` e voltar ao modo legado |
| Diferenças de enum de período (PT vs EN) entre os dois modelos | V2 usa só o enum de `itinerary_activities` (EN); legado fica isolado |
| Carteira pública não conseguir ler o roteiro V2 | Auditar policies/`get_*` RPCs antes de ligar V2 publicamente; criar RPC dedicada se necessário |
| Agente editar carteira e "estragar" roteiro original | A cópia evita o problema; `source_itinerary_id` mantém rastreabilidade |
| Duplicação visual entre `TripItinerary` (legado) e `ItineraryEditor` (V2) | Aceita conscientemente — legado é congelado, V2 é o caminho novo |
| Custo de cópia (muitas atividades) | Cópia feita em RPC `SECURITY DEFINER` em um único trip, transacional |

## 5. Ordem de execução em fases

**Fase 0 — Planejamento (este documento).** Sem código.

**Fase 1 — Schema aditivo.**
- Migration: `trips.itinerary_id`, `trips.itinerary_mode`, `itineraries.source_itinerary_id`, índice.
- Sem mudança de RLS.

**Fase 2 — Função de cópia.**
- RPC `clone_itinerary_for_trip(source_itinerary_id uuid, trip_id uuid)` em `SECURITY DEFINER`, valida ownership, retorna novo `itinerary_id`.

**Fase 3 — Frontend embed.**
- `TripItineraryV2.tsx` consumindo `ItineraryForm`/`ItineraryEditor`.
- `AttachItineraryDialog` com 2 ações: Importar (chama RPC) / Criar do zero (cria `itinerary` vazio e abre editor).
- Integração em `TripWallet.tsx` atrás do branch `itinerary_mode === 'v2'`.

**Fase 4 — Leitura pública.**
- Branch V2 em `RoteiroPublico.tsx`/`CarteiraPublica.tsx`.
- Auditar/ajustar policies públicas de `itineraries` quando acessadas via trip token.

**Fase 5 — QA.**
- Carteiras antigas continuam abrindo no modo legado.
- Nova carteira sem roteiro → CTA aparece.
- Importar roteiro → cópia criada, roteiro original intacto.
- Criar do zero → roteiro novo associado à carteira, visível também em Criar Roteiros.
- Desvincular → volta a `legacy`, dados preservados.

**Fase 6 (futuro, opcional).** Ferramenta admin para migrar carteiras legadas para V2 sob demanda. Fora deste escopo.

## 6. Respostas diretas às perguntas

1. **Faz sentido?** Sim, é o caminho de menor risco.
2. **Risco em `trips.itinerary_id`?** Apenas se a FK for `CASCADE`; usar `SET NULL`.
3. **Copiar ou referenciar?** Copiar, com `source_itinerary_id` para rastreio.
4. **Reusar componentes do Criar Roteiros?** Sim, via wrapper embed; `ItineraryForm` e `ItineraryEditor` já são suficientemente isolados.
5. **Arquivos impactados?** Ver Seção 3.
6. **RLS?** Tabelas de itinerário já escopadas por dono; só revisar leitura pública via token da trip.
7. **Fallback?** `itinerary_mode = 'legacy'` por default; render condicional em `TripWallet`/públicas.
8. **Implementação segura?** Fases 1→5 acima, todas aditivas.
9. **Arquitetura melhor?** Alternativa "referência direta sem cópia" é mais simples mas perigosa (editar carteira muda roteiro original). Alternativa "unificar tudo migrando legado" é mais limpa mas destrutiva — descartada pelo pedido do usuário.
10. **Plano técnico entregue.** Este documento.

## 7. Garantias

- Nenhuma migration destrutiva.
- Nenhuma alteração no modelo legado (`trip_itinerary_activities`, `trip_itinerary_period_images`).
- Nenhuma mudança em CRM, follow-ups, financeiro ou RLS de outros módulos.
- Roteiro V2 é 100% opt-in por carteira.
