## Roteiro V2 na Carteira Digital — Plano Revisado (UX Simplificada)

Confirmo que a mudança simplifica significativamente a implementação. Abaixo as respostas às 5 perguntas e o plano ajustado.

---

### Respostas

**1. Simplifica a implementação?**
Sim, e bastante. Elimina toda a complexidade de "embed mode" no `ItineraryEditor` (props condicionais, header/publish controls escondidos, autosave compartilhado, conflitos de contexto entre Trip e Itinerary). Reduz risco de regressão no editor standalone existente.

**2. As migrations e RPCs já entregues continuam válidas?**
Sim, 100%. Continuam necessárias e não mudam:
- `trips.itinerary_id` + `trips.itinerary_mode` (`none`/`legacy`/`v2`) — base do vínculo.
- `itineraries.source_itinerary_id` — rastreio de clonagem.
- RPC `clone_itinerary_for_trip` — usada ao criar/importar roteiro a partir da Carteira.
- RPC `get_public_trip_itinerary_v2` — usada na Carteira Pública para renderizar o roteiro V2 sem expor RLS de `itineraries`.

Nada do que foi entregue no banco vira código morto.

**3. `TripItineraryV2` vira apenas visualizador/resumo?**
Sim. Passa a ser um **card resumo** com:
- Cabeçalho: título do roteiro, destino, período, nº de dias, status (rascunho/publicado).
- Miniatura (capa ou primeira imagem de período, se existir).
- Ações: **Abrir roteiro** (navega para `/criar-roteiros/:id`), **Trocar roteiro**, **Desvincular**.
- Sem edição inline, sem lista de atividades editável, sem publish controls.

Opcionalmente, uma prévia read-only colapsada dos dias (apenas leitura, sem ações) — mas pode ficar fora do MVP.

**4. `ItineraryEditor` em modo embed ainda é necessário?**
**Não.** O `ItineraryEditor` continua exatamente como está hoje, sem novos props (`mode`, `hideHeader`, `hidePublishControls`, `onSaved` específico de embed). Toda edição acontece na rota standalone existente. Isso elimina a Fase 1 inteira de refactor do editor.

**5. Quais fases mudam?**

| Fase original | Status revisado |
|---|---|
| **Fase 1 — Refact `ItineraryEditor` (embed mode)** | ❌ Removida. Editor permanece intocado. |
| **Fase 2 — Extrair `ItineraryReadOnlyView`** | ⚠️ Mantida, mas usada **apenas na Carteira Pública** (`RoteiroPublicoV2` / `CarteiraPublica`), não no app autenticado. |
| **Fase 3 — Migrations (trips + itineraries)** | ✅ Já entregue. |
| **Fase 4 — RPCs (clone + public read)** | ✅ Já entregue. |
| **Fase 5 — Integração** | 🔄 Reescrita: novo `TripItineraryV2` (card resumo) + `AttachItineraryDialog` (Criar / Importar / Trocar / Desvincular). Sem editor embutido. |
| **Fase 6 — QA** | 🔄 Critérios ajustados (ver abaixo). |

---

### Plano Final Revisado

**Fase A — Componentes novos (autenticado)**
- `TripItineraryV2.tsx` (card resumo, read-only no contexto da Carteira)
  - Props: `trip`, `onChanged`
  - Fetch leve: `itineraries` (título, destino, período, status, capa) + `count` de dias
  - Estados: `none` → EmptyState com CTA "Criar roteiro" / "Importar roteiro"; `v2` com `itinerary_id` válido → card resumo; `legacy` → mantém componente legado atual; estado inconsistente → trata como `none`
- `AttachItineraryDialog.tsx`
  - Abas: **Criar novo**, **Importar de modelo/outro roteiro** (usa `clone_itinerary_for_trip`), **Trocar**, **Desvincular**
  - Após criar/importar: `UPDATE trips SET itinerary_id=?, itinerary_mode='v2'` e redireciona para `/criar-roteiros/:id` (opcional, com toggle "abrir agora")

**Fase B — Navegação**
- Botão "Abrir roteiro" → `navigate('/criar-roteiros/' + itinerary_id)`
- No editor standalone, adicionar **breadcrumb/back contextual** quando vier da Carteira: query param `?from=trip:<trip_id>` → botão "Voltar para Carteira" no header do editor
- Sem alteração do comportamento padrão do editor quando aberto direto

**Fase C — Carteira Pública**
- `ItineraryReadOnlyView` (extraído da `RoteiroPublicoV2` atual) renderizado dentro de `CarteiraPublica` quando `itinerary_mode='v2'`
- Usa `get_public_trip_itinerary_v2` (já criada)
- Sem editor, sem ações, somente leitura

**Fase D — QA**
Critérios de aceitação ajustados:
1. Trip nova → `itinerary_mode='none'` → mostra EmptyState
2. "Criar roteiro" na Carteira → cria itinerary, vincula, navega para editor standalone
3. "Importar" → clona via RPC, vincula, navega para editor
4. "Abrir roteiro" → abre editor standalone, botão voltar funciona
5. "Trocar" → permite escolher outro roteiro, atualiza vínculo
6. "Desvincular" → `itinerary_id=NULL`, `itinerary_mode='none'`, cópia preservada
7. Carteira pública com V2 → renderiza via RPC pública
8. Carteira pública sem roteiro → não mostra seção
9. Trips legacy continuam usando componente antigo, sem regressão
10. Editor standalone funciona idêntico ao atual quando aberto fora da Carteira
11. Nenhuma alteração em `trip_itinerary_activities` ou fluxo legado
12. Sem novos props no `ItineraryEditor`

---

### Arquivos afetados (revisado)

**Novos**
- `src/components/wallet/TripItineraryV2.tsx`
- `src/components/wallet/AttachItineraryDialog.tsx`
- `src/components/itinerary/ItineraryReadOnlyView.tsx` (extração da view pública)

**Editados (mínimo)**
- `src/components/wallet/TripWallet.tsx` — roteamento entre `none`/`legacy`/`v2`
- `src/pages/CarteiraPublica.tsx` — renderiza `ItineraryReadOnlyView` em modo V2
- `src/pages/RoteiroPublicoV2.tsx` — passa a consumir `ItineraryReadOnlyView` (refactor sem mudança visual)
- `src/pages/CriarConteudo.tsx` ou rota equivalente do editor — ler `?from=trip:` e exibir botão voltar

**Intocados**
- `ItineraryEditor` e todos os subcomponentes de edição
- Hooks de autosave, publish, AI generation
- Todo o fluxo legado (`trip_itinerary_activities`, `ImportItineraryModal` legado)

---

### Ganhos

- Menos código novo (~40% menor que o plano anterior)
- Zero risco no editor standalone
- UX mais clara: um lugar para editar, um lugar para vincular
- Mobile-friendly: card resumo cabe melhor que editor completo dentro da Carteira

### Riscos restantes

- Navegação entre Carteira ↔ Editor precisa preservar contexto (resolvido via query param)
- Usuário pode editar o roteiro e esquecer que está vinculado a uma Trip — mitigar com badge "Vinculado a viagem de [cliente]" no header do editor quando aplicável

---

Confirma esta versão simplificada para eu seguir para implementação (Fase A)?
