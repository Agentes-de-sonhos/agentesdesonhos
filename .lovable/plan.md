
# Funil Customizável no Kanban de Oportunidades

Transformar o Kanban da seção Gestão de Clientes > Oportunidades em um funil totalmente personalizável (estilo Trello), preservando o layout atual e os dados existentes.

## 1. Banco de Dados

Criar a tabela `pipeline_stages` para armazenar as colunas do funil por usuário:

- `id` (uuid)
- `user_id` (uuid)
- `name` (text)
- `position` (int)
- `color` (text — hex ou nome de token)
- `is_default` (bool — marca as 8 etapas padrão criadas no onboarding)
- `created_at`, `updated_at`

Regras:
- RLS estrita por `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE.
- Trigger que garante manter ao menos uma coluna por usuário (bloqueia DELETE se for a última).

### Migração de dados existentes

- Tabela `opportunities` ganha coluna `stage_id uuid` (nullable inicialmente, com FK para `pipeline_stages.id ON DELETE RESTRICT`).
- Função `seed_default_pipeline_stages(user_id)` que cria as 8 etapas padrão (Novo Contato, Em Atendimento, Orçamento em Criação, Orçamento Enviado, Negociação, Follow-up, Fechado, Perdido) com cores atuais.
- Backfill: para cada `user_id` distinto em `opportunities`, semeia as etapas padrão e atualiza `stage_id` mapeando pelo valor textual `stage`.
- Manter coluna `stage` por compatibilidade (read-only daqui pra frente), mas o app passa a usar `stage_id`.
- Trigger AFTER INSERT em `auth.users` (ou na criação do primeiro client/opportunity) para semear etapas padrão para novos usuários.

## 2. Frontend — Kanban customizável

Arquivos afetados:
- `src/hooks/usePipelineStages.ts` (novo) — CRUD + reorder + duplicar, via React Query.
- `src/hooks/useCRM.ts` — `useOpportunities` passa a usar `stage_id`; `updateStage` recebe `toStageId`.
- `src/components/crm/KanbanBoard.tsx` — usa stages dinâmicas vindas do hook, com fallback de loading.
- `src/components/crm/StageColumnHeader.tsx` (novo) — cabeçalho da coluna com menu de três pontinhos (Editar nome, Mudar cor, Duplicar, Excluir).
- `src/components/crm/AddStageColumn.tsx` (novo) — card final "+ Adicionar coluna".
- `src/components/crm/DeleteStageDialog.tsx` (novo) — confirmação que exige escolher coluna de destino se houver oportunidades.

### Funcionalidades

1. **Editar nome** — inline edit no header, Enter/Esc para salvar/cancelar.
2. **Excluir coluna** — se a coluna tem oportunidades, abre dialog com Select de coluna destino e move antes de excluir. Bloqueia se for a única coluna.
3. **Reordenar colunas** — drag handle no header. Usa `@dnd-kit/sortable` (já presente no projeto via dnd-kit). Persiste `position` ao soltar.
4. **Adicionar coluna** — botão no final, abre input inline com nome + cor pré-selecionada, salva com `position = max+1`.
5. **Mudar cor** — popover com paleta de 8 cores predefinidas (que mapeiam para os tokens atuais bg/border/text).
6. **Duplicar coluna** — copia nome + cor com sufixo "(cópia)" na posição seguinte.

### UX

- Menu de três pontinhos: opacity-0 group-hover:opacity-100 no desktop, sempre visível no mobile.
- Cards de oportunidade continuam funcionando com drag and drop atual (HTML5 native).
- Reorder de colunas usa dnd-kit (não conflita com HTML5 dos cards porque acontece no header com handle dedicado).
- Toasts (sonner) para todas as ações.
- Estado vazio elegante: "Nenhuma oportunidade aqui ainda" com ícone discreto.

## 3. Segurança

- RLS estrita em `pipeline_stages` (apenas owner).
- Validação no trigger de DELETE para impedir remoção da última coluna.
- FK `ON DELETE RESTRICT` em `opportunities.stage_id` para impedir deleção via DB sem o fluxo de move.

## 4. Compatibilidade

- Coluna `stage` (texto) é mantida e sincronizada via trigger para não quebrar relatórios, gamificação e queries antigas (`get_monthly_sales_ranking` etc. usam `sales`, não `opportunities.stage`, então impacto é mínimo).
- A migração roda em uma única transação e é idempotente.

## Resumo das mudanças

```text
DB:
  + table pipeline_stages
  + opportunities.stage_id (FK)
  + trigger sync + seed
  + RLS policies

Frontend:
  + src/hooks/usePipelineStages.ts
  + src/components/crm/StageColumnHeader.tsx
  + src/components/crm/AddStageColumn.tsx
  + src/components/crm/DeleteStageDialog.tsx
  ~ src/components/crm/KanbanBoard.tsx
  ~ src/hooks/useCRM.ts
  ~ src/types/crm.ts
```

Aprova esse plano para eu seguir com a migration e a implementação?
