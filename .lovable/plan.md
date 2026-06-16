## 📋 Opção A — Mover `password_hash` para tabela `agency_team_member_secrets`

**Status:** apenas levantamento. Nenhuma execução proposta neste turno.

---

### 1. Uso atual de `agency_team_members.password_hash`

**Frontend (`src/`)** — nenhum acesso direto. `useTeamMembers.ts` usa apenas RPCs (`team_list_members`, `team_get_member_detail`, `team_member_quota`) e a Edge Function `team-admin`. Nenhum `select('*')` ou `select('password_hash')` foi encontrado.

**Edge Functions:**
| Função | Toca `password_hash`? | Como |
|---|---|---|
| `team-login` | **SIM (READ)** | `select('id, agency_id, password_hash, status, full_name, login, role_title')` + `bcrypt.compare(password, member.password_hash)` |
| `team-admin` | **SIM (WRITE)** | create: `bcrypt.hash` → `insert({ password_hash })`. update: se vem nova senha, `update({ password_hash })` |
| `team-resolve-login` | NÃO | Lê só `synthetic_email, status` |
| `team-session` | NÃO | Lê metadados do membro |
| `team-audit` | NÃO | Lê só `id, agency_id` |

**Conclusão:** só **2 funções** dependem do hash. Frontend é zero-touch.

---

### 2. RLS atual do problema

```
POLICY "Owner manages own team members"
ON agency_team_members
TO authenticated
USING  (auth.uid() = agency_id)
WITH CHECK (auth.uid() = agency_id)
```
→ Dono lê `*` (inclui `password_hash`) via PostgREST. É exatamente o que o scanner aponta.

---

### 3. Migration proposta (não executar agora)

```sql
-- 1. Nova tabela isolada (sem acesso PostgREST)
CREATE TABLE public.agency_team_member_secrets (
  member_id uuid PRIMARY KEY
    REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. NUNCA exposta ao PostgREST: revogar tudo de anon/authenticated
REVOKE ALL ON public.agency_team_member_secrets FROM anon, authenticated, PUBLIC;
GRANT  ALL ON public.agency_team_member_secrets TO service_role;

-- 3. RLS ligada SEM policies → ninguém com JWT lê/escreve
ALTER TABLE public.agency_team_member_secrets ENABLE ROW LEVEL SECURITY;
-- (sem CREATE POLICY: deny-all para anon/authenticated; service_role bypassa RLS)

-- 4. Migrar hashes existentes
INSERT INTO public.agency_team_member_secrets (member_id, password_hash)
SELECT id, password_hash
FROM public.agency_team_members
WHERE password_hash IS NOT NULL
ON CONFLICT (member_id) DO NOTHING;

-- 5. Neutralizar coluna antiga sem dropar (segurança em camadas + rollback)
ALTER TABLE public.agency_team_members
  ALTER COLUMN password_hash DROP NOT NULL;

UPDATE public.agency_team_members SET password_hash = NULL;

-- (Opcional, fase 2 — após validação em produção)
-- ALTER TABLE public.agency_team_members DROP COLUMN password_hash;

-- 6. Revogar SELECT explícito da coluna antiga enquanto existir
REVOKE SELECT (password_hash) ON public.agency_team_members FROM anon, authenticated;
```

**Por que não dropar a coluna agora:** mantém rollback de 1 comando caso `team-login` falhe em produção. Drop fica para uma migration de cleanup posterior.

---

### 4. Mudanças no código (apenas 2 arquivos)

**`supabase/functions/team-login/index.ts`** (linhas 30–42)
```ts
// ANTES
.from('agency_team_members')
.select('id, agency_id, password_hash, status, full_name, login, role_title')
...
const ok = await bcrypt.compare(password, member.password_hash)

// DEPOIS
.from('agency_team_members')
.select('id, agency_id, status, full_name, login, role_title')
...
const { data: secret } = await admin
  .from('agency_team_member_secrets')
  .select('password_hash')
  .eq('member_id', member.id)
  .maybeSingle()
if (!secret?.password_hash) return 401
const ok = await bcrypt.compare(password, secret.password_hash)
```

**`supabase/functions/team-admin/index.ts`**
- Create (linhas 78–80): após `insert` em `agency_team_members`, fazer `insert` em `agency_team_member_secrets` com `member_id = created.id, password_hash`. Remover `password_hash` do payload do insert principal.
- Update (linhas 124–125): substituir `patch.password_hash = ...` por `upsert` em `agency_team_member_secrets`.
- Delete: nada a fazer (cascade já remove o secret).

Frontend, RPCs (`team_list_members`, `team_get_member_detail`, `team_member_quota`) e demais Edge Functions: **zero alteração**.

---

### 5. Impacto esperado por fluxo

| Fluxo | Impacto | Risco |
|---|---|---|
| Login de membro (`team-login`) | Lê hash de outra tabela | Médio — testar em preview antes de prod |
| Listar membros (`team_list_members`) | Nenhum | Nenhum |
| Detalhe de membro | Nenhum | Nenhum |
| Criar membro (`team-admin` create) | 2 inserts (transação lógica) | Baixo |
| Editar membro sem trocar senha | Nenhum | Nenhum |
| Trocar senha (`team-admin` update) | Upsert em secrets | Baixo |
| Excluir membro | Cascade automática | Nenhum |
| Auditoria, sessão, resolve-login | Nenhum | Nenhum |

---

### 6. Rollback exato

Se algo quebrar em produção, rodar imediatamente:

```sql
-- Restaurar hashes na coluna antiga
UPDATE public.agency_team_members m
SET    password_hash = s.password_hash
FROM   public.agency_team_member_secrets s
WHERE  s.member_id = m.id;

ALTER TABLE public.agency_team_members
  ALTER COLUMN password_hash SET NOT NULL;

GRANT SELECT (password_hash) ON public.agency_team_members TO authenticated;

-- (Opcional) reverter código das 2 edge functions via revert do commit
-- A tabela agency_team_member_secrets pode permanecer — não atrapalha.
```

---

### 7. Checklist de teste (pré-deploy em preview)

1. **Login de membro existente** com senha conhecida → sucesso.
2. **Login com senha errada** → 401.
3. **Login de membro bloqueado** → 403.
4. **Criar novo membro** via UI → registro aparece em `agency_team_members` + em `agency_team_member_secrets` (psql).
5. **Login com o novo membro** → sucesso.
6. **Trocar senha de membro** → login só funciona com a nova.
7. **Editar membro sem trocar senha** → senha antiga continua válida.
8. **Excluir membro** → linha some das duas tabelas (cascade).
9. **DevTools Network**: confirmar que respostas de `/rest/v1/agency_team_members` **não** trazem `password_hash` (nem como `null`).
10. **Tentativa direta** (auth como dono): `supabase.from('agency_team_member_secrets').select('*')` → erro de permissão.
11. **Security scan** após deploy → finding `agency_team_members_password_hash_exposed` desaparece dos ERRORs.

---

### 8. Notas importantes

- Mantém compatibilidade com `auth.users` (campo `auth_user_id` continua sendo atualizado por `team-admin` quando senha muda — não impactado).
- Triggers existentes (`trg_enforce_team_member_limit`, `trg_sync_agency_membership`, `update_updated_at_column`) não dependem de `password_hash` → seguem funcionando.
- A nova tabela herda automaticamente as garantias de service_role das Edge Functions. **Sem RPC nova necessária.**
- Esforço total: **1 migration + 2 arquivos de edge function** editados.

---

**Aguardando sua aprovação para executar.** Nada será alterado até a confirmação explícita.