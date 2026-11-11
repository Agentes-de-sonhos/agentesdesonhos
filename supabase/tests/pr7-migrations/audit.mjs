import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'../../..'));
const db=new PGlite(); const sources=[]; const tests=[];
const read=p=>fs.readFileSync(`${root}/${p}`,'utf8');
function file(prefix){return 'supabase/migrations/'+fs.readdirSync(root+'/supabase/migrations').find(x=>x.startsWith(prefix));}
async function func(prefix,name,drizzle=false){const p=drizzle?prefix:file(prefix);const s=read(p);const start=s.search(new RegExp('CREATE OR REPLACE FUNCTION '+name.replaceAll('.','\\.')+'\\(' ,'i')); assert(start>=0,name);const sub=s.slice(start);const tag=sub.match(/AS\s+(\$\w*\$)/i)[1]; const end=sub.indexOf(tag,sub.indexOf(tag)+tag.length)+tag.length;await db.exec(sub.slice(0,end)+';'); sources.push(p+':'+name);}
async function check(name,fn){try{await fn();tests.push({name,pass:true});console.log('PASS',name);}catch(e){tests.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message);}}
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const qid=n=>`'${id(n)}'`; const A=1,B=2,M=3,N=4,ADMIN=5;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE SCHEMA private;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA public,auth,private TO authenticated,anon,service_role;
CREATE TYPE app_role AS ENUM('admin','agente','promotor'); CREATE TYPE team_member_status AS ENUM('active','inactive','blocked');
CREATE TABLE user_roles(user_id uuid,role app_role); CREATE TABLE agency_team_members(id uuid PRIMARY KEY,auth_user_id uuid UNIQUE,agency_id uuid,status team_member_status,created_at timestamptz default now(),full_name text);
CREATE TABLE agency_team_permissions(team_member_id uuid,permission_key text,enabled boolean);
CREATE TABLE agency_membership(user_id uuid PRIMARY KEY,agency_id uuid,role text);
CREATE TABLE user_feature_access(user_id uuid,feature_key text);
CREATE TABLE subscriptions(user_id uuid,plan text,is_active boolean,expires_at timestamptz,updated_at timestamptz default now());
CREATE TABLE agency_entitlements(agency_id uuid,entitlement_key text,is_active boolean,starts_at timestamptz,ends_at timestamptz);
CREATE TABLE tour_operators(id uuid PRIMARY KEY,owner_agency_id uuid,user_id uuid,is_active boolean,approval_status text);
ALTER TABLE tour_operators ENABLE ROW LEVEL SECURITY;
CREATE TABLE sales(id uuid PRIMARY KEY,payload jsonb); CREATE TABLE sale_products(id uuid PRIMARY KEY,payload jsonb); CREATE TABLE operations(id uuid PRIMARY KEY,payload jsonb);
`);
await func('20260130202930','public.has_role');await func('20260606191615','public.current_agency_id');await func('20260606191615','public.is_agency_member');await func('20260606191615','public.sync_agency_membership_from_team_member');await func('20260805173658','public.user_agency_id');await func('20260805175848','public.can_team');await func('20260826140059','private.agency_owner_ids');
await db.exec(`CREATE TRIGGER trg_sync_agency_membership AFTER INSERT OR UPDATE OR DELETE ON agency_team_members FOR EACH ROW EXECUTE FUNCTION sync_agency_membership_from_team_member();`);
// Original table definitions, unchanged. Only later operator_id/origin columns are added explicitly.
for(const name of ['travel_files','travel_file_services']){const s=read(file('20260819133022')); const start=s.indexOf('CREATE TABLE IF NOT EXISTS public.'+name+' (');await db.exec(s.slice(start,s.indexOf('\n);',start)+3));}
await db.exec(`ALTER TABLE travel_files ADD origin text default 'manual'; ALTER TABLE travel_file_services ADD operator_id uuid;
ALTER TABLE travel_files ENABLE ROW LEVEL SECURITY; ALTER TABLE travel_file_services ENABLE ROW LEVEL SECURITY;
CREATE TABLE quote_booking_request_events(request_id uuid,item_id uuid,actor_type text,actor_user_id uuid,actor_team_member_id uuid,event_type text,payload jsonb);`);
const financial=read('drizzle/migrations/0013_unified_workflow_v2_columns.sql'); const finStart=financial.indexOf('ALTER TABLE public.travel_file_services'); await db.exec(financial.slice(finStart,financial.indexOf('-- ============ Travas',finStart))); sources.push('drizzle/migrations/0013_unified_workflow_v2_columns.sql:travel_file_services financial columns and constraints');
const manual=read(file('20260910131255'));let st=manual.indexOf('CREATE TABLE IF NOT EXISTS public.travel_file_events');await db.exec(manual.slice(st,manual.indexOf('\n);',st)+3));
await func('20260826140059','private.assert_travel_file_access');await func('20260910134125','private.reservations_supplier_allowed');await func('20260807170406','public.agency_has_entitlement');await func('20260910142718','public.can_use_reservations_center');await func('20260910142718','private.assert_manual_file_gate');await func('drizzle/migrations/0058_ads_197_full_platform_access.sql','private.reservations_owner_is_eligible',true);
await func('20260910131255','public.log_travel_file_service_manual_change');await func('20260826132805','public.log_travel_file_service_change');
await db.exec(`CREATE TRIGGER travel_file_services_manual_history AFTER INSERT OR UPDATE ON travel_file_services FOR EACH ROW EXECUTE FUNCTION log_travel_file_service_manual_change(); CREATE TRIGGER trg_log_travel_file_service_change AFTER UPDATE ON travel_file_services FOR EACH ROW EXECUTE FUNCTION log_travel_file_service_change();`);
const domain=read(file('20260809021533'));await db.exec(domain.slice(0,domain.indexOf('CREATE TRIGGER')));
const beforePolicies=(await db.query("SELECT * FROM pg_policies WHERE tablename='agency_public_domains' AND cmd <> 'SELECT' ORDER BY policyname")).rows;
const migrations=['drizzle/migrations/0065_reservation_service_supplier.sql','supabase/migrations/20261111130000_agency_team_domain_read.sql'];for(const p of migrations){await db.exec(read(p));sources.push(p);}
await db.exec(`INSERT INTO agency_membership VALUES (${qid(A)},${qid(A)},'master'),(${qid(B)},${qid(B)},'master'); INSERT INTO user_roles VALUES(${qid(ADMIN)},'admin');
INSERT INTO agency_team_members(id,auth_user_id,agency_id,status) VALUES(${qid(30)},${qid(M)},${qid(A)},'active'),(${qid(40)},${qid(N)},${qid(A)},'active');
INSERT INTO agency_team_permissions SELECT ${qid(30)},k,true FROM unnest(ARRAY['reservations.view','reservations.manage','reservations.financial.manage']) k;
INSERT INTO agency_team_permissions VALUES(${qid(40)},'reservations.view',true);
INSERT INTO subscriptions(user_id,plan,is_active) VALUES(${qid(A)},'premium',true),(${qid(B)},'premium',true);
INSERT INTO agency_entitlements VALUES(${qid(A)},'unified_workflow_v2',true,null,null),(${qid(B)},'unified_workflow_v2',true,null,null);
INSERT INTO tour_operators VALUES(${qid(101)},${qid(A)},${qid(A)},true,'approved'),(${qid(102)},${qid(B)},${qid(B)},true,'approved'),(${qid(103)},null,null,true,'approved'),(${qid(104)},null,null,false,'approved'),(${qid(105)},null,null,true,'pending');
INSERT INTO travel_files(id,agency_id,file_number,root_request_id,status,final_sale_amount,operation_id) VALUES (${qid(201)},${qid(A)},1,${qid(301)},'sale_confirmed',1234,${qid(401)}),(${qid(202)},${qid(B)},1,${qid(302)},'in_operation',4567,${qid(402)});
INSERT INTO travel_file_services(id,file_id,agency_id,service_type,product_name,supplier_name,sold_amount,cost_amount,commission_amount,snapshot,status) VALUES(${qid(501)},${qid(201)},${qid(A)},'hotel','Synthetic test','Old supplier',1234,900,334,'{"commission_rule":{"kind":"percentage","value":27},"locked":true}','booked');
INSERT INTO sales VALUES(${qid(601)},'{"total":1234,"status":"converted"}');INSERT INTO sale_products VALUES(${qid(701)},'{"commission_amount_snapshot":334}');INSERT INTO operations VALUES(${qid(401)},'{"value":1234,"status":"active"}');
INSERT INTO agency_public_domains(hostname,user_id,agency_slug,is_active) VALUES('a.example.invalid',${qid(A)},'a',true),('inactive-a.example.invalid',${qid(A)},'a',false),('b.example.invalid',${qid(B)},'b',true);`);
await db.exec(`UPDATE travel_file_services SET commission_type='percentage',commission_percent=27,commission_fixed=0,non_commissionable_fees=20,payment_rule='after_sale',payment_days=15,requires_invoice=true,financial_rule_status='confirmed',financial_rule_snapshot='{"commission":334,"rule":"locked"}',financial_rule_snapshot_at=now();`);
async function as(user,sql,role='authenticated'){await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${user===null?'':id(user)}',false);`);try{return await db.query(sql);}finally{await db.exec('RESET ROLE');}}
const call=(operator=101,name='New supplier',service=501)=>`SELECT travel_file_service_set_supplier(${qid(service)},${operator===null?'null':qid(operator)},${name===null?'null':"'"+name+"'"})`;
async function fail(user,sql,pattern,role){let error;try{await as(user,sql,role);}catch(e){error=e;}assert(error,'Expected denial');assert.match(error.message,pattern);}
async function snapshot(){return (await db.query(`SELECT jsonb_build_object('files',(SELECT jsonb_agg(to_jsonb(t)) FROM travel_files t),'services',(SELECT jsonb_agg(to_jsonb(t)-'operator_id'-'supplier_name'-'updated_at') FROM travel_file_services t),'sales',(SELECT jsonb_agg(to_jsonb(t)) FROM sales t),'sale_products',(SELECT jsonb_agg(to_jsonb(t)) FROM sale_products t),'operations',(SELECT jsonb_agg(to_jsonb(t)) FROM operations t)) AS data`)).rows[0].data;}
const initial=await snapshot();

await check('both exact migrations execute on PostgreSQL',async()=>assert.equal(migrations.length,2));
await check('own private supplier allowed for active authorized team',()=>as(M,call()));
await check('approved active global supplier allowed',()=>as(M,call(103)));
await check('other agency private supplier denied',()=>fail(M,call(102),/Fornecedor não disponível/));
await check('inactive global supplier denied',()=>fail(M,call(104),/Fornecedor não disponível/));
await check('unapproved global supplier denied',()=>fail(M,call(105),/Fornecedor não disponível/));
await check('missing supplier denied',()=>fail(M,call(999),/Fornecedor não disponível/));
await check('anonymous lacks RPC execute privilege',()=>fail(null,call(),/permission denied/,'anon'));
await check('authenticated role without identity denied',()=>fail(null,call(),/Não autenticado/));
await check('member missing management permission denied',()=>fail(N,call(),/permissão/));
await check('other tenant owner denied',()=>fail(B,call(),/não encontrado/));
await check('financial management permission independently enforced',async()=>{await db.exec("UPDATE agency_team_permissions SET enabled=false WHERE permission_key='reservations.financial.manage'");await fail(M,call(),/permissão/);await db.exec("UPDATE agency_team_permissions SET enabled=true");});
await check('entitlement disabled denies',async()=>{await db.exec('UPDATE agency_entitlements SET is_active=false');await fail(M,call(),/UNIFIED_WORKFLOW_DISABLED/);await db.exec('UPDATE agency_entitlements SET is_active=true');});
await check('expired entitlement denies',async()=>{await db.exec("UPDATE agency_entitlements SET ends_at=now()-interval '1 day'");await fail(M,call(),/UNIFIED_WORKFLOW_DISABLED/);await db.exec('UPDATE agency_entitlements SET ends_at=null');});
await check('manual reservation plan gate enforced',async()=>{await db.exec("UPDATE subscriptions SET plan='start'");await fail(M,call(),/plano atual/);await db.exec("UPDATE subscriptions SET plan='premium'");});
await check('manual expired subscription denied',async()=>{await db.exec("UPDATE subscriptions SET expires_at=now()-interval '1 day'");await fail(M,call(),/plano atual/);await db.exec('UPDATE subscriptions SET expires_at=null');});
await check('future entitlement denied',async()=>{await db.exec("UPDATE agency_entitlements SET starts_at=now()+interval '1 day'");await fail(M,call(),/UNIFIED_WORKFLOW_DISABLED/);await db.exec('UPDATE agency_entitlements SET starts_at=null');});
await check('view permission independently enforced',async()=>{await db.exec("UPDATE agency_team_permissions SET enabled=false WHERE permission_key='reservations.view'");await fail(M,call(),/permissão/);await db.exec('UPDATE agency_team_permissions SET enabled=true');});
await check('blank supplier identity denied',()=>fail(M,call(null,'   '),/Informe o fornecedor/));
await check('trimmed free-text supplier allowed',async()=>{await as(M,call(null,'  Free supplier  '));assert.equal((await db.query('SELECT supplier_name FROM travel_file_services')).rows[0].supplier_name,'Free supplier');});
await check('converted sale supplier allowed for owner',()=>as(A,call(101)));
await check('all financial snapshots, sale, operation and non-identity service fields unchanged',async()=>assert.deepEqual(await snapshot(),initial));
await check('exactly four supplier audit events with actor and identity',async()=>{const rows=(await db.query("SELECT * FROM travel_file_events WHERE event_type='service_supplier_set' ORDER BY created_at")).rows;assert.equal(rows.length,4);for(const r of rows){assert.equal(r.agency_id,id(A));assert.equal(r.file_id,id(201));assert.equal(r.payload.service_id,id(501));assert([id(A),id(M)].includes(r.actor_user_id));}});
await check('existing history trigger produces no financial/status change event',async()=>assert.equal((await db.query('SELECT count(*)::int AS n FROM quote_booking_request_events')).rows[0].n,0));
async function domains(user){return (await as(user,'SELECT hostname FROM agency_public_domains ORDER BY hostname')).rows.map(r=>r.hostname);}
await check('active member reads only active own domain',async()=>assert.deepEqual(await domains(M),['a.example.invalid']));
await check('other tenant owner sees only own domain',async()=>assert.deepEqual(await domains(B),['b.example.invalid']));
await check('owner retains active and inactive own-domain visibility',async()=>assert.deepEqual(await domains(A),['a.example.invalid','inactive-a.example.invalid']));
await check('admin retains all-domain visibility',async()=>assert.equal((await domains(ADMIN)).length,3));
await check('domain anonymous denied',()=>fail(null,'SELECT * FROM agency_public_domains',/permission denied/,'anon'));
await check('domain writes not granted to member',()=>fail(M,"UPDATE agency_public_domains SET is_active=false",/permission denied/));
await check('domain member denied by RLS even if table write privileges exist',async()=>{await db.exec('GRANT UPDATE ON agency_public_domains TO authenticated'); const r=await as(M,"UPDATE agency_public_domains SET is_active=false RETURNING id");assert.equal(r.rows.length,0);await db.exec('REVOKE UPDATE ON agency_public_domains FROM authenticated');});
await check('domain existing non-SELECT policies remain unchanged',async()=>assert.deepEqual((await db.query("SELECT * FROM pg_policies WHERE tablename='agency_public_domains' AND cmd <> 'SELECT' ORDER BY policyname")).rows,beforePolicies));
await check('domain membership revoked immediately on deactivation',async()=>{await db.exec(`UPDATE agency_team_members SET status='inactive' WHERE auth_user_id=${qid(M)}`);assert.deepEqual(await domains(M),[]);await fail(M,call(),/permissão/);await db.exec(`UPDATE agency_team_members SET status='active' WHERE auth_user_id=${qid(M)}`);});
await check('domain membership revoked immediately on deletion',async()=>{await db.exec(`DELETE FROM agency_team_members WHERE auth_user_id=${qid(M)}`);assert.deepEqual(await domains(M),[]);await fail(M,call(),/não encontrado/);});
await check('domain stranger without membership sees nothing',async()=>assert.deepEqual(await domains(987),[]));
await check('audit insert failure rolls back full service row and all events atomically',async()=>{
  const beforeService=(await db.query('SELECT to_jsonb(t) AS row FROM travel_file_services t ORDER BY id')).rows;
  const beforeEvents=(await db.query('SELECT to_jsonb(t) AS row FROM travel_file_events t ORDER BY id')).rows;
  await db.exec(`CREATE FUNCTION public.test_reject_supplier_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.event_type = 'service_supplier_set' THEN RAISE EXCEPTION 'TEST_AUDIT_INSERT_FAILURE'; END IF; RETURN NEW; END$$;
    CREATE TRIGGER test_reject_supplier_audit BEFORE INSERT ON travel_file_events FOR EACH ROW EXECUTE FUNCTION public.test_reject_supplier_audit();`);
  try {
    await fail(A,call(103,'Atomic rollback supplier'),/TEST_AUDIT_INSERT_FAILURE/);
    assert.deepEqual((await db.query('SELECT to_jsonb(t) AS row FROM travel_file_services t ORDER BY id')).rows,beforeService);
    assert.deepEqual((await db.query('SELECT to_jsonb(t) AS row FROM travel_file_events t ORDER BY id')).rows,beforeEvents);
  } finally {
    await db.exec('DROP TRIGGER test_reject_supplier_audit ON travel_file_events; DROP FUNCTION public.test_reject_supplier_audit();');
  }
});
await check('all denied operations leave snapshots and supplier audit count intact',async()=>{assert.deepEqual(await snapshot(),initial);assert.equal((await db.query("SELECT count(*)::int AS n FROM travel_file_events WHERE event_type='service_supplier_set'")).rows[0].n,4);});
const version=(await db.query('SELECT version()')).rows[0].version;
const result={version,runtime:'@electric-sql/pglite@0.3.14',passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,sources,tests,limits:['Subset schema, not full Supabase migration replay.','Supabase auth.uid shim reads synthetic session claim; all authorization helpers and membership sync copied literally from repository.','Base travel_files/services DDL and real history triggers included; unrelated production triggers/extensions/storage are not reproduced.','Sales/sale_products/operations are synthetic sentinel tables, not complete financial schema.','No remote database, production credentials, attachments, passwords, URLs or storage accessed.']};
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify({version,passed:result.passed,failed:result.failed},null,2));await db.close();if(result.failed)process.exitCode=1;
