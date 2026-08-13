---
name: Assinatura comercial por agência
description: Assinatura automática do titular + resolver central de assinatura comercial efetiva
type: feature
---
- Titular da agência = `agency_membership.agency_id` do usuário logado (hook `useAgencyOwnerId`), nunca o membro logado.
- Assinatura automática é VIRTUAL (id `system:<agencyId>`), montada pela RPC `get_agency_signature_base(_agency_id)` (nome, telefone, avatar, e-mail do Auth). Nunca persistida — sem duplicatas.
- Precedência única em `src/lib/effectiveSignature.ts` → `getEffectiveCommercialSignature()`: 1) personalizada ativa marcada como padrão; 2) automática do cadastro.
- `commercial_signatures.user_id` sempre = id do titular; RLS por `is_agency_member`; índice único garante 1 padrão por agência.
- A automática não pode ser excluída/editada — botão encaminha para `/perfil`.
