---
name: Tour Guides System
description: Tour guide registration, approval workflow, profile editing, and Mapa do Turismo integration
type: feature
---
## Tour Guides System

**Data model**: Standalone `tour_guides` table (NOT in `tour_operators`).
- Fields: `full_name`, `professional_name`, `photo_url`, `city`, `country`, `regions[]`, `languages` (JSONB `[{code, level}]`), `specialties[]`, `services[]`, `bio`, `differentials`, `certifications[]`, `gallery_urls[]`, `whatsapp`, `email`, `instagram`, `website`, `status` (pending/approved/rejected), `is_verified`, `plan_type` (free/premium), `user_id` (links to auth user), `rejection_reason`.
- Storage bucket: `tour-guides-gallery` (public).

**Registration paths**:
- Public dedicated route: `/cadastro-guia` → Edge Function `guide-register` (creates auth user + `fornecedor` role + guide profile with status=pending).
- CTA on `/cadastro-fornecedor` ("Cadastrar como Guia") links to `/cadastro-guia`.

**Profile editing** (`/meu-perfil-empresa`):
- `SupplierProfileEdit.tsx` first checks `useOwnTourGuide(user.id)`. If exists, renders `GuideProfileEditor` (form with all sections + status banner + sticky save bar). Otherwise falls back to operator editor.
- Guides use the same `fornecedor` role as suppliers; ProtectedRoute restricts both to `/meu-perfil-empresa` only.

**Admin approval**: `AdminTourGuidesManager` (Admin sidebar tab "Guias Turismo") with sub-tabs Pending/Approved/Rejected. Approving sets `status=approved` + `is_verified=true`. Rejecting requires `rejection_reason`.

**Mapa do Turismo integration** (`MapaTurismo.tsx`):
- Uses existing "Guias" category (`category: "Guias"`).
- Approved guides loaded via `useApprovedTourGuides`, mapped into `allItems` with `_source: "guide"`.
- Card uses `professional_name` as name, `photo_url` as logo, languages + specialties as chips.
- Click → `/mapa-turismo/guia/:id` (page `GuideDetail.tsx`).
- Empty state checks `categoryFilter === "Guias"` (capitalized).

**Constants**: `src/i18n/cadastroGuia.ts` exports `LANGUAGE_OPTIONS`, `LANGUAGE_LEVELS`, `SPECIALTY_OPTIONS`, `SERVICE_OPTIONS`, `COUNTRY_OPTIONS`.
