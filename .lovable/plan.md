
# Roteiro V2 na Carteira Digital — Plano Técnico Final (Revisado)

Resposta direta aos 10 pontos levantados, seguida de migrations, arquivos, ordem de execução e testes. Nada será executado até aprovação.

---

## 1. Estado "sem roteiro" — concordo com `none` explícito

Recomendo `itinerary_mode IN ('none','legacy','v2')` com default `'none'` para carteiras novas.

Motivos:
- Inferir por `itinerary_id IS NULL` + "ausência de atividades legadas" exige um COUNT em `trip_itinerary_activities` a cada render → custo e ambiguidade.
- Estado explícito permite distinguir "usuário ainda não decidiu" de "usuário desvinculou de propósito".
- Facilita métricas (% de carteiras com roteiro, qual modo).
- Migração das carteiras existentes: backfill determinístico — se existir 1+ linha em `trip_itinerary_activities` para o `trip_id` → `'legacy'`; caso contrário → `'none'`.

Risco: nenhum relevante. Campo aditivo.

## 2. Regra de renderização — concordo, com guarda extra

```
if mode = 'v2' AND itinerary_id IS NOT NULL  → Roteiro V2
else if mode = 'legacy'                       → roteiro legado
                                                (mesmo vazio é OK, é estado conhecido)
else (mode = 'none' OR v2 sem itinerary_id)   → EmptyState com CTAs
                                                 [Criar do zero] [Importar existente]
```

Guarda extra: se `mode = 'v2'` mas `itinerary_id IS NULL` (estado inconsistente, ex.: itinerário deletado e FK SET NULL disparou), tratar como `'none'` no frontend e oferecer reatribuição. Não cair em legacy nesse caso.

## 3. Desvincular — concordo

Regra ao desvincular:
1. `UPDATE trips SET itinerary_id = NULL, itinerary_mode = CASE WHEN EXISTS(SELECT 1 FROM trip_itinerary_activities WHERE trip_id = $1) THEN 'legacy' ELSE 'none' END`.
2. Nunca deletar o `itineraries` de origem (`source_itinerary_id`).
3. A cópia local **não** é deletada automaticamente — fica órfã (acessível via Criar Roteiros do agente). Opção futura: flag `archived_at` para "arquivar" sem perder. Por ora, apenas desvincular.
4. Oferecer no diálogo de desvinculação um checkbox secundário "Excluir também a cópia editada" (default OFF) — ação destrutiva e opt-in.

## 4. Leitura pública — concordo, RPC dedicada

Sim, criar `get_public_trip_itinerary_v2(p_trip_id uuid, p_access_code text)` em `SECURITY DEFINER`.

Funcionamento:
- Valida `trips.access_code = p_access_code` e que a carteira está publicada.
- Lê `trips.itinerary_id`, retorna JSON aninhado com: itinerary (campos públicos apenas), days, activities (ordenadas), period_images, documentos vinculados, maps_url, notes.
- Não expõe `user_id`, `agency_id`, `created_at` interno, analytics, slugs privados.
- Não requer policy pública em `itineraries` — mantém RLS estrita.

Hoje **não** existe RPC equivalente. Há `get_public_profile` e funções similares, mas nada para itinerário. Padrão alinhado com o que já fazemos para vouchers/cards.

## 5. Clone — concordo, transacional + reset de campos públicos

RPC: `clone_itinerary_for_trip(p_source_itinerary_id uuid, p_trip_id uuid) RETURNS uuid` (`SECURITY DEFINER`, `SET search_path = public`).

Fluxo dentro de bloco transacional implícito (função plpgsql):
1. Valida `auth.uid()` é dono de `p_source_itinerary_id` **ou** o itinerário é template/compartilhado permitido.
2. Valida `auth.uid()` é dono do `trips.user_id`.
3. INSERT em `itineraries` copiando campos de conteúdo; **resetando**: `public_slug = NULL`, `access_code = <novo>`, `published = false`, `views_count = 0`, `source_itinerary_id = p_source_itinerary_id`, `created_at = now()`, `updated_at = now()`, `user_id = auth.uid()`.
4. Loop em `itinerary_days` do source → INSERT em novos days, mantendo mapa `old_day_id → new_day_id` em tabela temporária ou CTE.
5. INSERT em `itinerary_activities` com `day_id` remapeado, preservando `order_index`, `start_time`, `notes`, `photo_urls[]`, `location`, `description`, `estimated_duration`, `estimated_cost`.
6. INSERT em `itinerary_period_images` com `itinerary_id` remapeado (não copiar `trip_id` — não aplicável).
7. UPDATE `trips SET itinerary_id = new_id, itinerary_mode = 'v2' WHERE id = p_trip_id`.
8. Retorna `new_id`. Qualquer EXCEPTION → ROLLBACK automático (função plpgsql).

Campos NÃO copiados (resetados): `public_slug`, `access_code`, `published`, `views_count`, analytics, `pdf_url` cacheado, `og_image_url` cacheado.

## 6. Campo de rastreio — recomendo manter mínimo agora

Sugiro **apenas** `source_itinerary_id uuid NULL`. Não adicionar `context` ou `created_from_trip_id` agora:
- `context` é derivável: `source_itinerary_id IS NOT NULL` → cópia; senão → standalone.
- `created_from_trip_id` é redundante com a relação inversa (`trips.itinerary_id`).
- YAGNI: adicionar depois é trivial e aditivo, sem migração quebrável.

Se quiser uma única adição leve: `origin_kind text CHECK IN ('standalone','wallet_clone','wallet_native') DEFAULT 'standalone'` — preenchido pela RPC de clone (`wallet_clone`) e por um endpoint de criação nativa em wallet (`wallet_native`). Recomendo **deixar para Fase 2** se necessidade analítica surgir.

## 7. Reuso real dos componentes — refatoração leve necessária

Auditei `CriarRoteiro.tsx`, `useItineraries`, `useItineraryActivities`. Status:

- `ItineraryEditor` / `ItineraryForm` hoje assumem rota `/criar-roteiro` e navegação própria (toasts de "Roteiro salvo", redirect, etc.). **Precisa de props de mode**: `mode: 'standalone' | 'embed'`, `onSaved?: (itineraryId) => void`, `hideHeader?: boolean`, `hidePublishControls?: boolean`.
- `AIGeneratingOverlay`, `PublishReviewDialog`, `downloadPDF` — já são puros, reutilizáveis sem mudança.
- Hooks (`useItineraries`, `useItineraryActivities`, `useItineraryPeriodImages`) — já são reutilizáveis, parametrizados por `itineraryId`.
- Renderer público (`RoteiroPublicoV2.tsx`) — extrair um `<ItineraryReadOnlyView itineraryId={...} />` puro que possa ser embedado dentro de `CarteiraPublica.tsx`.

Conclusão: refatoração de superfície (props), não estrutural. Estimo 1 PR pequeno antes da Fase 3.

## 8. ImportItineraryModal — concordo

- `ImportItineraryModal` **legado** permanece intocado, só será chamado quando `itinerary_mode = 'legacy'` (manutenção de carteiras antigas).
- Novo `AttachItineraryDialog` (V2) com 3 ações: **Criar do zero** (cria `itinerary` vazio + atribui), **Importar existente** (chama `clone_itinerary_for_trip`), **Desvincular**.
- V2 **nunca** escreve em `trip_itinerary_activities`. V2 e legacy permanecem silos isolados.
- Em uma carteira `legacy` existente, oferecer botão "Migrar para Roteiro V2" (Fase futura, não escopo deste plano).

---

## Migrations necessárias

**Migration única, aditiva:**

```sql
-- trips
ALTER TABLE public.trips
  ADD COLUMN itinerary_id uuid NULL REFERENCES public.itineraries(id) ON DELETE SET NULL,
  ADD COLUMN itinerary_mode text NOT NULL DEFAULT 'none'
    CHECK (itinerary_mode IN ('none','legacy','v2'));

-- backfill determinístico
UPDATE public.trips t
SET itinerary_mode = 'legacy'
WHERE EXISTS (SELECT 1 FROM public.trip_itinerary_activities a WHERE a.trip_id = t.id);

-- itineraries
ALTER TABLE public.itineraries
  ADD COLUMN source_itinerary_id uuid NULL REFERENCES public.itineraries(id) ON DELETE SET NULL;

CREATE INDEX idx_trips_itinerary_id ON public.trips(itinerary_id) WHERE itinerary_id IS NOT NULL;
CREATE INDEX idx_itineraries_source ON public.itineraries(source_itinerary_id) WHERE source_itinerary_id IS NOT NULL;
```

**Migration RPCs (separada, após validação):**
- `clone_itinerary_for_trip(uuid, uuid) RETURNS uuid` — SECURITY DEFINER.
- `get_public_trip_itinerary_v2(uuid, text) RETURNS jsonb` — SECURITY DEFINER.

Nenhuma alteração em `trip_itinerary_activities`, `trip_itinerary_period_images`, `itinerary_days`, `itinerary_activities`. Nenhuma policy existente é alterada.

## Arquivos afetados

**Novos:**
- `src/components/wallet/TripItineraryV2.tsx` — wrapper embed.
- `src/components/wallet/AttachItineraryDialog.tsx` — diálogo criar/importar/desvincular.
- `src/components/itinerary/ItineraryReadOnlyView.tsx` — renderer público extraído.
- `src/lib/roteiro-domain.ts` — adicionar `cloneItineraryForTrip(sourceId, tripId)`, `attachItineraryToTrip`, `detachItineraryFromTrip`.

**Refatorados (props/mode, sem mudar lógica):**
- `src/components/itinerary/ItineraryEditor.tsx` — props `mode`, `onSaved`, `hideHeader`.
- `src/pages/RoteiroPublicoV2.tsx` — passa a usar `ItineraryReadOnlyView`.

**Integração:**
- `src/components/wallet/TripWallet.tsx` (ou equivalente) — branch por `itinerary_mode`.
- `src/pages/CarteiraPublica.tsx` — branch V2 via `get_public_trip_itinerary_v2`.
- `src/types/trip.ts` — tipos `itinerary_mode`, `itinerary_id`.

**Não tocar:** `ImportItineraryModal.tsx` (legado), `TripItinerary.tsx` (legado), Criar Roteiros, CRM, follow-ups, financeiro.

## Ordem final de execução

- **Fase 0** — Auditoria final (componentes, hooks, policies). Confirmar nomes exatos de colunas em `itineraries`.
- **Fase 1** — Refatoração de props no `ItineraryEditor` + extração `ItineraryReadOnlyView`. Zero mudança de comportamento (testar Criar Roteiros antes/depois).
- **Fase 2** — Migration aditiva (campos + backfill + índices).
- **Fase 3** — RPC `clone_itinerary_for_trip` + testes manuais via SQL.
- **Fase 4** — `AttachItineraryDialog` + `TripItineraryV2` + integração em `TripWallet` com 3 estados (`none`/`legacy`/`v2`).
- **Fase 5** — RPC `get_public_trip_itinerary_v2` + integração em `CarteiraPublica`.
- **Fase 6** — QA contra os 12 critérios de aceite (abaixo).

## Critérios de aceite

1. **Carteira nova sem roteiro** → `mode='none'`, exibe EmptyState com [Criar] [Importar]. Nenhum render de roteiro vazio.
2. **Carteira nova criando roteiro do zero** → cria `itinerary` vazio, `mode='v2'`, abre editor embed.
3. **Carteira nova importando existente** → `clone_itinerary_for_trip` executa transacional, copia dias/atividades/imagens, reseta campos públicos, atribui à carteira.
4. **Edição da cópia não altera o original** → editar a cópia não dispara qualquer UPDATE no `source_itinerary_id`. Verificado via SELECT antes/depois.
5. **Desvincular roteiro** → `itinerary_id = NULL`, `mode` volta a `legacy` se houver dados legados ou `none` caso contrário. Cópia preservada (não deletada).
6. **Carteira pública V2** → RPC retorna estrutura completa; nenhum campo interno exposto; funciona sem login.
7. **Carteira pública sem roteiro** → seção "Roteiro" oculta ou mostra mensagem neutra.
8. **Carteira antiga com legado** → renderiza `TripItinerary` legado inalterado.
9. **Carteira antiga sem roteiro** → após backfill, `mode='none'`, EmptyState aparece.
10. **Segurança/RLS** → tentar acessar `itineraries` de outro user via REST direto retorna 0 linhas; RPC pública só responde com `access_code` válido.
11. **Sem perda de dados** → nenhuma linha em `trip_itinerary_activities`, `trip_itinerary_period_images`, `itineraries`, `itinerary_days`, `itinerary_activities` é deletada ou alterada pela migração.
12. **Sem alterações destrutivas** → migration roda em ambiente de teste e produção sem erros; rollback é apenas `DROP COLUMN` (aditivo puro).

## Testes a executar

- **SQL:** rodar migration, verificar backfill (`SELECT itinerary_mode, count(*) FROM trips GROUP BY 1`).
- **RPC clone:** chamar via SQL com user real, conferir contagem de days/activities/images = source.
- **RPC pública:** chamar com access_code válido/inválido; conferir ausência de campos sensíveis.
- **UI:** matriz 3x2 — (none/legacy/v2) × (logado/público).
- **Regressão Criar Roteiros:** criar, editar, publicar, gerar PDF — comportamento idêntico ao atual.
- **Regressão Carteira legada:** abrir 3 carteiras antigas com roteiro legado; conferir que nada mudou visualmente.

## Riscos técnicos

- **R1 — Refator do ItineraryEditor** pode introduzir regressão em Criar Roteiros. Mitigação: Fase 1 isolada, QA antes de Fase 2.
- **R2 — RPC clone com itinerários muito grandes** (50+ dias, 200+ atividades) pode ter latência. Mitigação: medir; se >2s, paginar ou rodar em Edge Function.
- **R3 — FK `ON DELETE SET NULL` em `trips.itinerary_id`** é segura, mas deletar um `itinerary` deixa a carteira em estado inconsistente (`mode='v2'` + `itinerary_id NULL`). Mitigação: guarda na regra de render (item 2) trata como `none`.
- **R4 — Backfill** assume que toda linha em `trip_itinerary_activities` representa roteiro legítimo. Se houver lixo, marcará como legacy. Mitigação: rodar `SELECT` preview antes do `UPDATE`.

## Arquitetura alternativa avaliada (e descartada)

- **Unificar tudo no modelo V2 já agora** (deprecar `trip_itinerary_activities`): muito invasivo, quebra carteiras públicas existentes, sai do escopo de "não destrutivo".
- **Reference em vez de copy** (carteira aponta para itinerário original): edição na carteira alteraria o original → quebra o requisito do usuário.

**Confirmo arquitetura proposta como a mais segura e aderente aos requisitos.**

---

Aguardando aprovação para implementação. Nenhuma migration ou código será executado antes do "ok".
