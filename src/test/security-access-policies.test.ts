// Live, read-only regression checks against deployed PostgreSQL policy predicates.
// No rows/files are inserted, updated or removed; identities are evaluated, not signed in.
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function query(sql: string): Record<string, any>[] {
  const result = JSON.parse(execFileSync('lovable', ['supabase', 'query', sql, '--json'], { encoding: 'utf8' }));
  return result.rows;
}
const policies = query(`SELECT schemaname,tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage')`);
function policy(name: string) {
  const p = policies.find(p => p.policyname === name);
  if (!p) throw new Error(`Missing policy: ${name}`);
  return p;
}
const members = query(`SELECT DISTINCT ON (agency_id) agency_id,auth_user_id FROM agency_team_members WHERE status='active' AND auth_user_id IS NOT NULL AND NOT public.has_role(auth_user_id,'admin') ORDER BY agency_id LIMIT 2`);
const caller = members[0];
const foreign = members[1];
if (!caller || !foreign) throw new Error('Two non-admin agencies are required for isolation regression checks');
// The read-only gateway role cannot execute this restricted helper. Evaluate its
// deployed SQL body in-place (without widening its EXECUTE grants).
const helper = query(`SELECT pg_get_functiondef('public.same_agency_as(uuid)'::regprocedure) AS definition`)[0]?.definition as string;
const helperBody = helper.split('$function$')[1]?.trim().replace(/^SELECT\s+/i, '').replace(/;$/, '');
if (!helperBody) throw new Error('Missing deployed agency helper body');
function evaluate(expression: string, rows: string) {
  expression = expression.replace(/same_agency_as\(owner\)/g, `(${helperBody.replaceAll('_owner', 'owner')})`);
  const results = query(`WITH claims AS MATERIALIZED (SELECT set_config('request.jwt.claim.sub','${caller.auth_user_id}',true)) SELECT COALESCE((${expression}),false) AS allowed FROM claims CROSS JOIN (${rows}) objects`);
  return results[0]?.allowed;
}
function object(owner: string, bucket = 'media-files', name = 'test.jpg') {
  return `SELECT '${owner}'::uuid AS owner,'${bucket}'::text AS bucket_id,'${name}'::text AS name`;
}

describe('deployed access policy regressions (read-only)', () => {
  it('allows a colleague of the owner agency to retain media ownership', () => {
    expect(evaluate(policy('Agency updates own media objects').with_check, object(caller.agency_id))).toBe(true);
  });
  it('rejects reassignment of media to another agency', () => {
    expect(evaluate(policy('Agency updates own media objects').with_check, object(foreign.agency_id))).toBe(false);
  });
  it('rejects modification of another agency media', () => {
    expect(evaluate(policy('Agency updates own media objects').qual, object(foreign.agency_id))).toBe(false);
  });
  it('allows deletion of own supplier logo', () => {
    expect(evaluate(policy('Authenticated users can delete supplier logos').qual, object(caller.auth_user_id, 'supplier-logos'))).toBe(true);
  });
  it('rejects deletion of another supplier logo', () => {
    expect(evaluate(policy('Authenticated users can delete supplier logos').qual, object(foreign.auth_user_id, 'supplier-logos'))).toBe(false);
  });
  it('rejects changing the owner of supplier logos', () => {
    expect(evaluate(policy('Authenticated users can update supplier logos').with_check, object(foreign.auth_user_id, 'supplier-logos'))).toBe(false);
  });
  it('allows uploading certificates only in the callers certificate folder', () => {
    expect(evaluate(policy('Authenticated users can upload academy files').with_check, object(caller.auth_user_id, 'academy-files', `certificates/${caller.auth_user_id}/test.pdf`))).toBe(true);
  });
  it('rejects overwriting Academy editorial content by non-admin users', () => {
    expect(evaluate(policy('Authenticated users can upload academy files').with_check, object(caller.auth_user_id, 'academy-files', 'certificate-templates/test.png'))).toBe(false);
  });
  it('rejects deletion of another users Academy certificate', () => {
    expect(evaluate(policy('Authenticated users can delete academy files').qual, object(foreign.auth_user_id, 'academy-files', `certificates/${foreign.auth_user_id}/test.pdf`))).toBe(false);
  });
  it('does not allow anonymous temp gallery deletion', () => {
    expect(policies.filter(p => p.policyname === 'Anon delete temp tour guide files')).toHaveLength(0);
  });
  for (const name of ['Anyone can view achievements for ranking','Authenticated view progress for ranking','Authenticated view certificates for ranking','Authenticated view attendees','Anyone authenticated can view confirmations']) {
    it(`${name}: rejects other users raw rows`, () => {
      expect(evaluate(policy(name).qual, `SELECT '${foreign.auth_user_id}'::uuid AS user_id`)).toBe(false);
    });
    it(`${name}: preserves own rows`, () => {
      expect(evaluate(policy(name).qual, `SELECT '${caller.auth_user_id}'::uuid AS user_id`)).toBe(true);
    });
  }
  it('keeps intended public images public and quote documents private', () => {
    const buckets = query(`SELECT id,public FROM storage.buckets WHERE id IN ('media-files','supplier-logos','academy-files','tour-guides-gallery','quote-documents')`);
    expect(buckets.filter(b => b.id !== 'quote-documents').every(b => b.public)).toBe(true);
    expect(buckets.find(b => b.id === 'quote-documents')?.public).toBe(false);
  });
  it('keeps active cruise taxonomy available to users', () => {
    expect(evaluate(policy('Leitura pública perfis').qual, 'SELECT true AS ativo')).toBe(true);
  });
  it('requires a published quote and explicitly public document for shared reads', () => {
    const p = policy('Public can read shared quote documents');
    // Evaluate the actual stored expression with synthetic parent rows, not client data.
    const expression = p.qual.replaceAll('quote_documents', 'test_documents').replaceAll('JOIN quotes ', 'JOIN test_quotes ');
    for (const [isPublic, status, allowed] of [[true,'published',true],[false,'published',false],[true,'draft',false]] as const) {
      const rows = query(`WITH test_documents AS (SELECT 'file.pdf'::text file_path, ${isPublic} is_public, 1 quote_id), test_quotes AS (SELECT 1 id,'${status}'::text status) SELECT ${expression} AS allowed FROM (SELECT 'quote-documents'::text bucket_id,'file.pdf'::text name) objects`);
      expect(rows[0]?.allowed).toBe(allowed);
    }
  });
  it('exposes aggregate ranking to authenticated callers but not anonymously', () => {
    const rows = query(`SELECT has_function_privilege('anon','public.academy_ranking_summary()','EXECUTE') AS anonymous,has_function_privilege('authenticated','public.academy_ranking_summary()','EXECUTE') AS authenticated`);
    expect(rows[0]).toEqual({ anonymous: false, authenticated: true });
  });
});