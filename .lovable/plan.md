## Objetivo

Criar uma camada de orquestração "Pacote Completo" que recebe um único PDF/imagem/texto contendo múltiplos serviços, identifica e separa cada bloco com IA, e encaminha cada um para a tela de conferência do importador individual já existente (aéreo, hotel, locação, transfer, atração, seguro, cruzeiro, circuito, outros). Nada é gravado no orçamento sem confirmação da agência.

## Arquitetura

```text
[Modal Pacote Completo]
  1. Checkbox de tipos esperados
  2. Upload PDF / imagem / texto
        |
        v
[Edge Function: import-full-package]
  - Gemini multimodal (PDF/imagem) ou texto
  - Retorna: { trip_meta, blocks[], warnings[] }
        |
        v
[Tela Resumo]
  - Esperados x Encontrados x Faltando x Extras
  - Período, passageiros, total
  - Alertas de baixa confiança
        |
        v
[Stepper de Conferência]
  - Para cada block: abre o componente de conferência
    já existente (HotelSmartImport, AirfareSmartImport,
    CarRentalSmartImport, GenericServiceSmartImport...)
    em modo "prefill" recebendo o JSON do bloco
  - Agência revisa/edita/confirma → adiciona ao orçamento
  - Pode pular ou descartar bloco
        |
        v
[Log: full_package_imports]
```

## Mudanças no código

### Backend
- **Nova edge function** `supabase/functions/import-full-package/index.ts`
  - Input: `{ quote_id?, expected_types: ServiceType[], file_base64?, mime?, text? }`
  - Usa Lovable AI Gateway (`google/gemini-2.5-pro` para PDF/imagem por melhor multimodal; fallback `gemini-3-flash-preview` para texto puro).
  - Prompt instrui a IA a:
    - Devolver JSON estruturado com `trip_meta` (destination, start_date, end_date, adults, children, total_amount, currency) e `blocks[]`.
    - Cada `block`: `{ id, type: ServiceType, confidence: 0-1, raw_excerpt, normalized_data, missing_fields[], notes }`.
    - `normalized_data` deve seguir o mesmo formato que cada importador individual já consome (reuso de `FlightData`, `HotelData`, etc.).
    - Não inventar valores ausentes.
  - Sanitiza erros em português, valida payload com Zod, rate limit por usuário.

### Migration
- Nova tabela `public.full_package_imports`:
  - `id`, `user_id`, `quote_id` (nullable), `expected_types text[]`, `source_kind` (`pdf|image|text`), `source_url` (storage path, opcional), `source_text` (texto colado, truncado), `ai_blocks jsonb`, `trip_meta jsonb`, `review_status jsonb` (status por bloco), `created_at`.
  - RLS por `user_id`, GRANT padrão para `authenticated` + `service_role`.
- Bucket privado `full-package-imports` para arquivos originais (signed URLs).

### Frontend
- **Novo card "Pacote Completo"** em `ServiceCategoryGrid.tsx`
  - Posicionado no topo (junto/próximo do "Importar com IA"), com ícone `PackageOpen` e visual destacado (gradiente).
  - Nova prop `onOpenFullPackage` + `showFullPackage`.
- **Novo modal** `src/components/quote/full-package-import/FullPackageImportModal.tsx`
  - Step 1: Seleção de tipos (checkboxes) — orienta a IA.
  - Step 2: Upload PDF (drag&drop) / imagem / textarea (uma das três fontes).
  - Step 3: Loading com status (analisando, identificando blocos…).
  - Step 4: Tela **Resumo** com cards comparando esperado x encontrado, período, passageiros, total, alertas.
  - Step 5: **Stepper de Conferência** sequencial. Para cada bloco, monta o componente do importador individual existente em modo `prefillData` (sem refazer upload), reaproveitando suas telas de conferência/edição e seu `onConfirm` que devolve um `QuoteService` para salvar.
  - Botões: "Pular este", "Confirmar e adicionar", "Adicionar todos restantes" (apenas alta confiança), "Finalizar".
- **Refatores leves nos importadores existentes** para aceitar prop opcional `prefillData` e `mode="review-only"` (pular o upload, ir direto à tela de conferência). Hoje cada importador faz upload→AI→conferência; só vamos pular as duas primeiras etapas quando o orquestrador já tiver o JSON.
- Integração em `GerarOrcamento.tsx`: passar `onOpenFullPackage` para `ServiceCategoryGrid`, controlar `showFullPackage`, e ao finalizar inserir cada `QuoteService` confirmado via o mesmo handler de salvamento de serviço já usado.

### Regras de UX preservadas
- Nada adicionado automaticamente; cada serviço exige clique de confirmação.
- Alertas visuais por baixa confiança (`<0.6`) e por campos faltando.
- Esperado mas não encontrado → alerta amarelo no Resumo.
- Encontrado mas não esperado → marcado "possivelmente encontrado", agência aceita ou ignora.
- Valor total do pacote vai para `trip_meta.total_amount`; não distribuído entre serviços.
- Múltiplas hospedagens/transfers/passeios → blocos separados.
- Aéreo ida/volta preserva estrutura `outbound_legs`/`return_legs`.

## Detalhes técnicos

- Prompt do Gemini construído server-side com a lista de `expected_types` e um schema JSON exato (mesmas chaves dos `ServiceData`).
- Limite: PDF/imagem até 10MB; texto até 50k chars.
- Persistência: salva `full_package_imports` antes de retornar para o cliente (auditoria/replay).
- Storage: se PDF/imagem, upload do arquivo para bucket privado, mantém `source_url`.
- Sem mudanças em tabelas existentes de quotes/services.

## Entrega em ordem
1. Migration + bucket.
2. Edge function `import-full-package` com prompt + validação.
3. Refator mínimo dos importadores existentes para aceitar `prefillData`.
4. Modal `FullPackageImportModal` (steps 1–5).
5. Card "Pacote Completo" no grid + wiring em `GerarOrcamento.tsx`.
6. QA manual: PDF com aéreo+hotel+transfer+2 passeios.

## Fora de escopo
- Não alterar prompts/comportamento dos importadores individuais.
- Não criar novos campos de orçamento.
- Não automatizar inserção sem confirmação.
