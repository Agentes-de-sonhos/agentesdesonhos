## Assinaturas Comerciais

Nova entidade independente de usuários/permissões para representar a identidade comercial exibida em Orçamentos, Carteira Digital e Roteiros públicos.

---

### 1. Banco de dados (migration)

**Nova tabela `commercial_signatures`**
- `id` uuid PK
- `user_id` uuid (dono da agência) — FK profiles
- `name` text not null
- `title` text
- `phone` text
- `whatsapp` text
- `email` text
- `photo_url` text
- `custom_message` text
- `display_order` int default 0
- `is_active` bool default true
- `is_default` bool default false
- `created_at`, `updated_at`

RLS: dono CRUD próprio; SELECT público liberado (necessário para renderizar snapshot/atualização em páginas públicas, embora o snapshot já garanta histórico). Restringimos SELECT público apenas a `is_active` se necessário. GRANTs padrão.

**Snapshot nos documentos**
Adicionar coluna `signature_snapshot jsonb` em:
- `quotes`
- `trips` (carteira digital)
- `itineraries` (roteiros)

Snapshot contém: `{ id, name, title, phone, whatsapp, email, photo_url, custom_message, updated_at }`.

Nenhum FK rígido — exclusão da assinatura não quebra documentos. Implementaremos "soft delete" via `is_active=false` quando vinculada.

---

### 2. UI — Configurações

Nova aba **"Assinaturas Comerciais"** dentro de `Configurações` (ou `MinhaConta`/área de configurações existente).

Funcionalidades:
- Lista em cards (foto, nome, cargo, badges "Padrão"/"Inativa")
- Criar / Editar (Dialog com formulário)
- Duplicar (clona registro)
- Definir como padrão (radio, apenas 1 padrão; trigger desmarca os outros)
- Inativar (toggle)
- Excluir: se houver documentos referenciando (`signature_snapshot->>'id'`), bloquear com aviso e oferecer Inativar

---

### 3. Hook reutilizável

`useCommercialSignatures()`:
- `signatures` lista ativa
- `defaultSignature`
- CRUD + setDefault + duplicate
- `buildSnapshot(signature)` helper

Componente `<SignatureSelector value onChange />` reutilizável (cards com radio, mobile-friendly).

Helper `getSignatureContact(snapshot, fallbackAgentProfile)` para uso nas páginas públicas — usa snapshot quando existir, senão cai no `agentProfile` atual (compatibilidade).

---

### 4. Integração — Orçamentos

- Em `GerarOrcamento.tsx` (etapa Resumo): adicionar `<SignatureSelector>` que salva `signature_snapshot` no quote.
- Default: ao criar novo orçamento, pré-preencher com snapshot da assinatura padrão.
- Em `OrcamentoPublicoV2.tsx`: ler `quote.signature_snapshot` e usar para nome/foto/WhatsApp/email/mensagem na seção de contato e nos botões de ação. Fallback para `agentProfile` atual quando snapshot ausente (orçamentos antigos).

### 5. Integração — Carteira Digital (Trips)

- Em configuração do trip (página de gestão da carteira): `<SignatureSelector>` salvando em `trips.signature_snapshot`.
- Em `CarteiraPublica.tsx` e `ViagemPublica.tsx`: aplicar snapshot na área do consultor responsável e botões WhatsApp/contato.

### 6. Integração — Roteiros (Itineraries)

- Editor de roteiro: `<SignatureSelector>` salvando em `itineraries.signature_snapshot`.
- Em `RoteiroPublicoV2.tsx`: aplicar snapshot.

---

### 7. Comportamento histórico

- Snapshot é gravado no momento da seleção — alterações posteriores na assinatura não afetam documentos antigos.
- Botão "Atualizar para versão atual" opcional ao lado do seletor (não obrigatório nesta entrega).

---

### 8. Compatibilidade

- Agências sem nenhuma assinatura: documentos seguem usando dados do `agentProfile` (comportamento atual). Nenhum fluxo quebra.
- Critério 19 e 20 atendidos via fallback + auto-uso da padrão.

---

### Arquivos principais a criar/editar

Novo:
- Migration SQL
- `src/hooks/useCommercialSignatures.ts`
- `src/components/signatures/SignatureSelector.tsx`
- `src/components/signatures/SignatureFormDialog.tsx`
- `src/pages/configuracoes/AssinaturasComerciais.tsx` (ou seção integrada à página de configurações existente)
- `src/lib/commercialSignature.ts` (helpers `buildSnapshot`, `resolveSignatureContact`)

Editar:
- `src/pages/GerarOrcamento.tsx` (etapa Resumo)
- `src/pages/OrcamentoPublicoV2.tsx`
- Editor de carteira (trips) + `CarteiraPublica.tsx` / `ViagemPublica.tsx`
- Editor de roteiro + `RoteiroPublicoV2.tsx`
- Rota/menu de Configurações para incluir nova seção
- `src/types/quote.ts`, `src/types/itinerary.ts` para o tipo `SignatureSnapshot`

---

### Pontos a confirmar antes de implementar

1. **Onde adicionar a aba**: em `MinhaConta` (atual área de perfil) ou criar página dedicada `/configuracoes/assinaturas`?
2. **Foto**: upload via `MediaManager` (bucket `media-files`) — confirma?
3. **Mensagem personalizada**: aparece em qual ponto exato do documento público (junto da área do consultor, no topo, ou após o resumo)?
4. **Exclusão hard**: confirmar que assinatura sem vínculo pode ser excluída de fato (DELETE), e com vínculo só permite inativar.
