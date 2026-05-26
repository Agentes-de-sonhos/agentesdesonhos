## Biblioteca de Modelos de Roteiros

Nova funcionalidade que permite ao agente salvar roteiros já criados como **modelos reutilizáveis** (estrutura, atividades e lógica) — sem dados de cliente, datas ou orçamento — e usar esses modelos como base para criar novos roteiros rapidamente.

---

### 1. Banco de dados (Lovable Cloud)

Criar duas tabelas em uma migração:

**`itinerary_templates`** — metadados do modelo
- `user_id`, `name`, `cover_image_url`, `destination`
- `nights_count` (int), `style` ('economico' | 'moderado' | 'luxo'), `profile` (TripProfile), `pace` ('leve' | 'moderado' | 'intenso')
- `tags` (text[])
- `destination_intro_text`, `destination_intro_images` (jsonb)
- `source_itinerary_id` (referência opcional ao roteiro de origem)
- `interests` (text[]), `additional_preferences` (jsonb)

**`itinerary_template_activities`** — estrutura reutilizável (achatada, sem datas)
- `template_id`, `day_number` (int — relativo, 1..N), `period` ('manha'|'tarde'|'noite')
- `order_index`, `title`, `description`, `location`
- `estimated_duration`, `estimated_cost` (texto-faixa, não valor fechado)
- `photo_url`, `category` (tag/categoria da experiência), `priority` ('essencial'|'opcional')

RLS estrita por `user_id`. GRANTs para `authenticated` e `service_role`.

> Observação arquitetural: a separação em "metadados + atividades achatadas com `priority` e `category`" é o que viabiliza a futura adaptação por IA (condensar 10→7 noites removendo opcionais, trocar restaurantes premium por family-friendly, etc.). Nada de copiar `itinerary_days` cru.

---

### 2. Ações no roteiro existente

Em `src/pages/CriarRoteiro.tsx` (e nos cards da lista de roteiros), adicionar a ação **⭐ Salvar como modelo** ao lado das demais ações do roteiro.

---

### 3. Modal "Salvar como modelo"

Novo componente `src/components/itinerary/SaveAsTemplateDialog.tsx`:

- **Nome do modelo** (input)
- **Número de noites** (input numérico — pré-preenchido com `endDate - startDate`)
- **Estilo da viagem** (select: Econômico / Moderado / Premium-Luxo — pré-preenchido com `budgetLevel`)
- **Perfil principal** (select com TRIP_PROFILE_LABELS — pré-preenchido com `tripType`)
- **Tags** (chips livres, reaproveitando padrão de `TagsEditForm`)
- Banner de auto-sugestão no topo: *"Detectamos que este roteiro parece ser: Premium • Casal • 10 noites"* com botão "Usar sugestão".

Ao confirmar:
- Insere em `itinerary_templates`
- Insere atividades em `itinerary_template_activities` derivando `day_number` relativo (1..N), descartando `date`, `clientId`, `passengers`, valores fechados de orçamento.

---

### 4. Nova página: Biblioteca de Modelos

Nova rota `/ferramentas-ia/modelos-roteiros` e página `src/pages/ModelosRoteiros.tsx`:

- Grid de cards (estética Notion/Canva templates): capa, nome, badges (noites • estilo • perfil), destino, tags, contagem de dias/atividades.
- Busca por nome/tag/destino, filtros por estilo e perfil.
- Ações por card: **Criar roteiro a partir deste modelo**, **Editar**, **Duplicar**, **Excluir** (confirmação única).

Hook `src/hooks/useItineraryTemplates.ts` com React Query (list/create/update/delete/createFromItinerary/instantiate).

Adicionar entrada no `menuConfig` dentro do grupo de Ferramentas IA / Roteiros.

---

### 5. Criar roteiro a partir do modelo

Fluxo assistido em um único dialog (`InstantiateTemplateDialog.tsx`):
1. **Cliente** (ClientSelector já existente, obrigatório por padrão do projeto)
2. **Datas** (start / end) — com cálculo automático de noites
3. **Ajustes opcionais**: estilo, perfil, ritmo (pré-preenchidos a partir do modelo)

Ao confirmar, gera um novo `itinerary` + `itinerary_days` + `itinerary_activities`:
- Se `noites_novo == noites_modelo` → mapeamento 1:1 dos dias do modelo nas novas datas.
- Se diferente → por enquanto, mapeamento proporcional + flag `needs_ai_adaptation = true` no roteiro recém-criado (preparado para o passo 6). Atividades `priority='opcional'` são marcadas como candidatas a remoção quando encolhe.
- Datas calculadas a partir da `startDate` informada.
- Status: `draft` — o usuário cai direto no editor `/ferramentas-ia/criar-roteiro?id=...`.

---

### 6. Preparado para adaptação por IA (sem implementar agora)

A arquitetura escolhida já entrega o necessário para a próxima fase:
- `priority` + `category` + `pace` permitem condensar/expandir.
- `style` + `profile` no modelo + no novo roteiro permitem detectar incompatibilidades.
- Estrutura achatada por `day_number` facilita reorganização.

Nenhuma Edge Function nova nesta entrega — apenas o terreno preparado.

---

### Detalhes técnicos

- Tabelas com `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL ... TO service_role;` + RLS por `auth.uid() = user_id`.
- Tipos em `src/types/itinerary.ts`: `ItineraryTemplate`, `ItineraryTemplateActivity`.
- Reutilizar `Card`, `Dialog`, `Input`, `Select`, `Button`, `TagsEditForm` do design system — sem cores hard-coded, somente tokens semânticos.
- Auto-sugestão: função pura `inferTemplateMetadata(itinerary)` em `src/lib/roteiro-domain.ts`.
- Nenhuma alteração no PDF nem na página pública do roteiro.

### Arquivos
- **Novos**: migration; `src/hooks/useItineraryTemplates.ts`; `src/components/itinerary/SaveAsTemplateDialog.tsx`; `src/components/itinerary/InstantiateTemplateDialog.tsx`; `src/pages/ModelosRoteiros.tsx`.
- **Editados**: `src/pages/CriarRoteiro.tsx` (botão + dialog), card de roteiros (ação extra), `src/App.tsx` (rota), `src/config/menuConfig.ts` (item de menu), `src/types/itinerary.ts`, `src/lib/roteiro-domain.ts`.
