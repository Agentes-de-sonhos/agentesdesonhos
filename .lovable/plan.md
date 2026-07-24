# Gerenciamento de dias do roteiro (adicionar e excluir)

Extensão da edição de roteiros que reaproveita a base já existente (`reorderDays`, `adjustItineraryDates`, `DayReorderDialog`) para permitir **inserir** um novo dia em qualquer posição e **excluir** um dia existente com opção de manter ou encurtar o período total.

## O que passa a ser possível

- Adicionar dia (no cabeçalho da seção "Dia a Dia") escolhendo a posição:
  - Antes de um dia existente
  - Depois de um dia existente
  - No final do roteiro
- Novo dia entra vazio (sem IA), pronto para receber atividades nos períodos manhã/tarde/noite.
- Excluir dia (botão no cabeçalho de cada dia, protegido por permissão) com confirmação, escolha entre:
  - **Manter o período da viagem** — remove o conteúdo, promove os posteriores e cria um dia vazio no final.
  - **Encurtar o período da viagem** — remove o dia e reduz a data final (ou inicial, se for o Dia 1) em 1 dia.
- Numeração, datas, dia da semana, calendário da viagem, link público e PDF são recalculados automaticamente.
- Bloqueio quando resta apenas 1 dia ("O roteiro precisa possuir pelo menos um dia").
- Alerta reforçado se o dia tiver atividades ("Este dia possui 3 atividades. Todo o conteúdo será excluído permanentemente.").
- Toast de sucesso com ação "Desfazer" por 6 segundos (quando aplicável).

## UX

**Cabeçalho da seção "Dia a Dia"**
- Botão `+ Adicionar dia` ao lado do atual `Reordenar dias`.
- Ao final da lista, um botão discreto `+ Adicionar dia ao final`.

**Modal "Adicionar novo dia"**
- Select "Posição": lista todos os dias com opções "Antes do Dia X", "Depois do Dia X" e "No final do roteiro".
- Prévia com a nova data prevista, calculada localmente.
- Botões: `Cancelar` · `Adicionar dia` (loading state).

**Cabeçalho de cada dia**
- Menu de três pontos (mobile-friendly) com `Excluir dia`. Desabilitado quando `days.length === 1`.

**Modal "Excluir dia"**
- Título/descrição contextual (informa quantas atividades serão perdidas).
- Radio com as duas estratégias e a prévia das datas resultantes.
- Botões: `Cancelar` · `Excluir dia` (destrutivo).

**Feedback**
- Toast Sonner com `action` "Desfazer" após criação/exclusão (dispara operação inversa). Não bloqueia navegação.

## Camada de dados

Nova mutation `mutateItineraryDays` em `src/hooks/useItineraries.ts` que recebe um plano completo:

```ts
type DayPlan = {
  itineraryId: string;
  newStartDate: string;     // yyyy-MM-dd
  newEndDate: string;
  operations: Array<
    | { type: "keep"; dayId: string; newIndex: number }        // renumera + nova data
    | { type: "insert"; newIndex: number }                      // cria dia vazio
    | { type: "delete"; dayId: string }                         // remove dia (cascade nas atividades)
  >;
};
```

Sequência da mutation (única alteração lógica):
1. Carrega itinerário + dias atuais.
2. Fase 1 — muda `day_number` para valores negativos em todos os dias mantidos (evita colisão com o índice único `(itinerary_id, day_number)`).
3. Fase 2 — aplica `delete` nos removidos (cascade nas atividades e `itinerary_period_images`).
4. Fase 3 — aplica `keep` com novo `day_number` e nova `date`.
5. Fase 4 — insere os `insert` (dias vazios) com `day_number`/`date` finais.
6. Atualiza `itineraries.start_date` / `end_date`.
7. Invalida cache do React Query.

Se qualquer passo falhar, o `throw` interrompe a mutation; a UI mostra erro e o usuário reabre a operação. (Postgres não oferece transação single-query via Supabase JS, então mantemos a mesma estratégia adotada em `reorderDays`, que já é aceita no projeto.)

**"Desfazer"** é implementado disparando o `DayPlan` inverso: reinsere o dia excluído a partir de um snapshot leve (`{ dayNumber, date, activities[] }`) mantido em memória por 6 s; após o timeout o snapshot é descartado.

## Regras de negócio

- **Clima e calendário**: já são derivados de `itinerary_days.date` — nenhuma nova consulta meteorológica é feita durante a prévia; apenas após salvar. Os componentes existentes (`RoteiroPublico`, `ItineraryPDF`, calendário) revalidam via `queryClient.invalidateQueries(["itineraries"])`.
- **Atividades vinculadas a serviços da Carteira Digital / trip_services**: a exclusão só remove `itinerary_activities` (linha do dia); tabelas externas (`trip_services`, `bookings`, etc.) não são tocadas.
- **Insert no meio**: mantém `start_date`, desloca dias posteriores, aumenta `end_date` em 1 dia.
- **Insert no final**: só aumenta `end_date` em 1 dia.
- **Delete "encurtar" no Dia 1**: `start_date` avança 1 dia e o antigo Dia 2 conserva sua data original.
- **Delete "encurtar" intermediário/último**: `end_date` reduz 1 dia; conteúdo dos dias mantidos permanece intacto, apenas renumerado.
- **Delete "manter período"**: cria um dia vazio no final para preservar duração — usa a mesma mutation, com um `insert` extra ao final.

## Arquivos afetados

- `src/hooks/useItineraries.ts` — nova `mutateItineraryDays` (e helper que gera o `DayPlan` a partir das 4 ações UX).
- `src/components/itinerary/ItineraryEditor.tsx` — botões "Adicionar dia" no cabeçalho e no rodapé; menu no header de cada dia; wiring das novas mutations.
- `src/components/itinerary/AddDayDialog.tsx` — novo componente (modal com Select de posição + prévia).
- `src/components/itinerary/DeleteDayDialog.tsx` — novo componente (radio manter/encurtar + prévia + confirmação).
- `src/pages/CriarRoteiro.tsx` — passa `onAddDay` / `onDeleteDay` ao `ItineraryEditor`.
- Sem alteração de schema. Sem alteração no link público / PDF (leitura permanece igual). Sem alteração nas permissões atuais.

## Fora do escopo (explícito)

- Duplicar dia, copiar de outro roteiro, gerar novo dia por IA, datas não consecutivas, exclusão de serviços externos vinculados.

## Critérios de aceite (resumo)

Adicionar/excluir funcionando, renumeração e recálculo de datas automáticos, opção manter/encurtar, bloqueio do único dia, "Desfazer" para exclusão, calendário/PDF/link público sincronizados, reordenação continua funcionando lado a lado, permissões preservadas, nenhuma perda ou duplicação de conteúdo dos demais dias.
