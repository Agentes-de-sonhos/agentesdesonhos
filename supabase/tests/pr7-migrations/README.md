# PR #7: isolated migration integration tests

Run from the repository root. Requires Node.js (tested with v24), npm, and access to the official npm registry on initial installation. Uses genuine PostgreSQL 17.5 through `@electric-sql/pglite@0.3.14`, in memory. No database URL, credentials, Supabase CLI, Docker, or production connection is used.

```sh
repo="$PWD"
testdir="$(mktemp -d)"
cp supabase/tests/pr7-migrations/audit.mjs "$testdir/audit.mjs"
cp supabase/tests/pr7-migrations/package-lock.json "$testdir/package-lock.json"
printf '{"dependencies":{"@electric-sql/pglite":"0.3.14"}}\n' > "$testdir/package.json"
npm ci --prefix "$testdir" --no-audit --no-fund
node "$testdir/audit.mjs" "$repo"
cat "$testdir/results.json"
```

The test directory is disposable. Installation does not modify the application's package manifest or lockfile. The script exits nonzero on any failed assertion; results are written beside the script. Checked-in `results.json` records the 2026-11-11 run: **37 passed, 0 failed**.

## What executes

Both target migration files execute literally, not rewritten equivalents. The script loads the repository's actual authorization functions (including `can_team`, `agency_owner_ids`, `user_agency_id`, `assert_travel_file_access`, `reservations_supplier_allowed`, `agency_has_entitlement`, `can_use_reservations_center`, and `assert_manual_file_gate`). The updated reservation eligibility function comes from Drizzle 0058. A case-insensitive scan of both migration trees verified these selected versions.

The original active-team membership sync trigger function and existing domain owner/admin policies are included. Tests execute using PostgreSQL `SET ROLE authenticated` or `anon`, not the owner role. The RPC remains `SECURITY DEFINER`. Domain RLS is actually exercised, including a deliberately granted UPDATE table privilege to prove the member still cannot update rows.

The only authentication shim is `auth.uid()`, implemented as `nullif(current_setting('request.jwt.claim.sub',true),'')::uuid`; every identity is a synthetic UUID. No authorization helper is stubbed to return true.

Coverage includes own/private vs foreign supplier, approved/active global supplier, missing supplier, anonymous/no identity, independent reservation-view/manage/financial permissions, tenant access, inactive/future/expired entitlement, manual plan and subscription-expiry gates, identity normalization, converted-sale update, audit payload/actor, owner/admin/team domain visibility, inactive domains, revocation on team deactivation/deletion, strangers, and unchanged write policies.

Base travel-files/services DDL, real service-history triggers, and the real 0013 financial-rule columns and constraints execute. Full row snapshots before/after verify every service field except `operator_id`, `supplier_name`, and `updated_at` is unchanged, including confirmed financial-rule snapshot, commission/payment terms, and monetary amounts. File rows and synthetic sale/product/operation sentinels also remain unchanged. Rejected calls produce no supplier audit event. An additional synthetic BEFORE INSERT trigger deliberately rejects the final supplier audit event after the service UPDATE. The test verifies full rollback of every service column (including identity and updated_at) and all event rows, then removes the test trigger/function.

## Explicit limits

This is a focused dependency-schema test, **not a replay of the entire Supabase/Drizzle history** and not proof of production migration state. Ancillary membership, permission, subscription and supplier tables include the columns needed by the real helpers; unrelated constraints/triggers are omitted. Sales, sale-products and operations are synthetic sentinel tables, not their full production schemas. Existing service-history triggers are included, but unrelated production triggers/extensions are not. Full conversion, frontend behavior, live authentication, concurrency, production grants, attachment/storage signing and deployment are outside this harness. No attachments, passwords, stored URLs or storage objects are read or modified.
