## Objetivo

Trazer para a Carteira Digital a mesma experiência já existente no módulo de Orçamentos:
- Ao digitar o **nome do hotel** (e de outros serviços), buscar no **Google Places** e auto-preencher os principais dados.
- Ao selecionar o local, exibir uma **galeria de fotos do Google** para o usuário escolher quantas quiser, salvando-as no serviço.
- Essas fotos passam a aparecer na **carteira digital pública** e no **PDF exportado**.

A mudança é **100% aditiva** — nenhum serviço, carteira ou PDF antigo é afetado. A foto única atual (`image_url`) continua funcionando como fallback para registros existentes.

---

## Fase 1 — Hotéis (entrega inicial desta etapa)

### Banco de dados (migration aditiva)
- Adicionar coluna `image_urls text[] not null default '{}'` em `trip_services` (não remover `image_url`).
- Adicionar coluna `place_id text` (cache do Google Places do serviço, opcional).
- Nenhuma alteração em RLS / triggers existentes.

### Formulário do Hotel (`TripServiceForms.tsx → HotelForm`)
- Substituir o `<Input>` de "Nome do Hotel" por um autocomplete do Google Places (reaproveitando o padrão de `hotel-autocomplete` que o orçamento já usa).
- Ao selecionar um hotel:
  - Auto-preencher: `hotel_name`, `address`, `city`, `country`, `hotel_phone`, `hotel_website`, `maps_url` e, quando disponível, `hotel_category` (estrelas) — **apenas em campos vazios**, nunca sobrescrever o que o usuário já digitou.
  - Salvar o `place_id` retornado.
- Renderizar logo abaixo do nome o componente `GoogleHotelPhotos` (já existe em `src/components/shared/`) com `autoShow`, igual no orçamento.
- O `imageSlot` no editor passa a suportar **múltiplas fotos** (grid com botão de remover + botão "Upload" para foto própria), mantendo o input de upload manual atual como alternativa.

### Persistência (`useTrips.ts` + handlers em `TripWallet.tsx`)
- `handleUploadServiceImage` passa a **adicionar** ao array `image_urls` (em vez de substituir `image_url`).
- Novo handler `handleAddServiceImageUrls(serviceId, urls[])` para fotos do Google (não passa por upload de arquivo).
- Novo handler `handleRemoveServiceImageAt(serviceId, index)` para remover uma foto específica.
- Atualizar `TripService` em `src/types/trip.ts` com `image_urls: string[]` e `place_id?: string | null`.

### Renderização pública e PDF
- `CarteiraPublicaV2.tsx`: onde hoje exibe `image_url` única, passa a renderizar um carrossel/grade horizontal usando `image_urls` (com fallback para `image_url` quando o array estiver vazio).
- `TripServiceCard.tsx` (preview do agente): mesma lógica de fallback.
- `TripPDF.tsx`: incluir até N fotos do hotel (ex: 2-3) na seção daquele serviço, mantendo a foto única como fallback.

---

## Fase 2 — Demais serviços (no mesmo PR, escopo confirmado pelo usuário)

Aplicar o mesmo padrão de Places (sem galeria automática, exceto onde Google retorna fotos relevantes) em:
- **Atrações/Ingressos** (`AttractionForm`) → `placeType="attraction"`, autofill de nome + endereço + maps + fotos do Places.
- **Locação de Veículos** (`CarRentalForm`) → autocomplete para a locadora (já usado em orçamentos), sem galeria de fotos.
- **Transfer** (`TransferForm`) → autocomplete para `location` (endereço de embarque/desembarque), sem galeria.
- **Outros Serviços** (`OtherForm`) → autocomplete genérico para `company_name`, sem galeria.

Voos, seguro, cruzeiro e trem não recebem Places (não faz sentido de catálogo).

---

## Detalhes técnicos

- Reutilizar Edge Functions já existentes: `hotel-autocomplete`, `hotel-photos`, `places-autocomplete`. Nenhuma nova função necessária.
- Reutilizar componentes já existentes: `PlacesAutocomplete`, `GoogleHotelPhotos`.
- Reutilizar `usePlacesAutocomplete` (com `fetchDetailsOnSelect: true`) para puxar `address`, `latitude/longitude`, `photo_urls` etc.
- Limite de fotos: igual ao orçamento (`MAX_IMAGES_PER_SERVICE`, atualmente 10).
- Cache do Places já é feito server-side (`place_cache` table) — nenhum custo extra para hotéis repetidos.

---

## Não-objetivos (não muda nesta etapa)

- Carteiras já publicadas seguem renderizando exatamente como hoje (fallback para `image_url`).
- Não muda layout/identidade visual da carteira pública nem do PDF (só passa a exibir mais fotos quando houver).
- Não muda a função de upload manual atual — ela continua disponível ao lado do Places.
- Não toca em estrutura de roteiro, passageiros, vouchers, RLS ou autenticação.

---

## Validação antes do merge

1. Criar serviço novo de hotel via Places → conferir autofill, galeria, salvamento.
2. Editar hotel já existente (sem `place_id`) → garantir que tudo continua funcionando e que nada foi sobrescrito.
3. Abrir carteira pública antiga (sem `image_urls`) → garantir que continua exibindo a foto única.
4. Gerar PDF de carteira nova com galeria → conferir fotos no PDF.

---

Confirma para eu seguir com a Fase 1 + Fase 2 nesse mesmo trabalho? Se preferir entregar só Hotel primeiro (Fase 1) e validar antes de aplicar nos demais serviços, me avisa.