import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*, authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function sha256(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function syntheticEmail(login: string, ownerId: string) {
  const safe = String(login).toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${safe}.${ownerId.slice(0, 8)}@team.agentesdesonhos.local`
}

function moduleOf(key: string): string {
  const head = key.split('.')[0]
  const map: Record<string, string> = {
    dashboard: 'dashboard', clients: 'clients', opportunities: 'opportunities', operations: 'operations',
    sales: 'sales', quotes: 'quotes', itineraries: 'itineraries', wallet: 'wallet',
    agenda: 'agenda', tasks: 'agenda', trips: 'agenda', financial: 'financial', marketing: 'marketing',
    academy: 'education', courses: 'education', mentorships: 'education', community: 'community',
    chat: 'community', online_users: 'community', settings: 'settings', account: 'settings',
    subscription: 'settings', integrations: 'settings', team: 'settings', audit: 'settings',
  }
  return map[head] ?? 'tools'
}

const INVITE_FROM = 'Agentes de Sonhos <fernando.nobre@agentesdesonhos.com.br>'

/**
 * Reenvia o e-mail de ativação de um convite pendente. Exige a posse do token
 * bruto do convite e envia SEMPRE para o e-mail já registrado no convite,
 * portanto não expõe nenhuma informação nova a quem chama.
 */
async function sendInviteEmail(opts: {
  to: string; name: string | null; agencyName: string; url: string; expiresAt: string
}): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return false
  const validade = new Date(opts.expiresAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="font-size:20px;margin:0 0 12px">Ative o seu acesso à equipe de ${opts.agencyName}</h2>
      <p style="font-size:14px;line-height:1.6">Olá${opts.name ? ` ${opts.name}` : ''}, use o link abaixo para criar a sua senha e ativar o seu acesso.
      Você mesma definirá a senha — nenhuma senha é enviada por e-mail.</p>
      <p style="margin:24px 0"><a href="${opts.url}"
        style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px">
        Criar minha senha</a></p>
      <p style="font-size:12px;color:#666">Este link é de uso único e válido até ${validade}. Se você não esperava esta mensagem, ignore-a.</p>
    </div>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: INVITE_FROM, to: [opts.to],
        subject: `Ative o seu acesso — equipe de ${opts.agencyName}`,
        html,
      }),
    })
    if (!res.ok) console.error('resend error', res.status, await res.text())
    return res.ok
  } catch (e) {
    console.error('invite email error', e)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { token, mode, password, full_name } = await req.json()
    if (typeof token !== 'string' || token.length < 32) return json({ error: 'Convite inválido.' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token_hash = await sha256(token)

    const { data: invite } = await admin.from('agency_team_invites')
      .select('*').eq('token_hash', token_hash).maybeSingle()
    if (!invite) return json({ error: 'Convite não encontrado.' }, 404)
    if (invite.revoked_at) return json({ error: 'Este convite foi cancelado.' }, 400)
    if (invite.accepted_at) return json({ error: 'Este convite já foi utilizado.' }, 400)
    if (new Date(invite.expires_at) < new Date()) return json({ error: 'Este convite expirou.' }, 400)

    if (mode === 'inspect') {
      return json({
        email: invite.email, full_name: invite.full_name,
        role_title: invite.role_title, department: invite.department,
      })
    }

    /**
     * Reenvio do e-mail de ativação para o e-mail já registrado no convite.
     * Requer a posse do token bruto; nada é revelado ao solicitante.
     */
    if (mode === 'send') {
      const { data: agencyProfile } = await admin.from('profiles')
        .select('agency_name, name').eq('user_id', invite.agency_id).maybeSingle()
      const agencyName = agencyProfile?.agency_name || agencyProfile?.name || 'sua agência'
      const origin = typeof (invite as any).origin === 'string' ? '' : ''
      const url = `https://app.agentesdesonhos.com.br/convite/${token}${origin}`
      const emailed = await sendInviteEmail({
        to: invite.email, name: invite.full_name, agencyName,
        url, expiresAt: invite.expires_at,
      })
      if (emailed) {
        await admin.from('agency_team_invites').update({
          last_sent_at: new Date().toISOString(),
          sent_count: (invite.sent_count ?? 0) + 1,
        }).eq('id', invite.id)
      }
      return json({ ok: emailed, emailed })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return json({ error: 'A senha precisa ter ao menos 6 caracteres.' }, 400)
    }
    const name = String(full_name ?? invite.full_name ?? invite.email).trim().slice(0, 120)
    const login = String(invite.email).toLowerCase()

    /**
     * Convite de ativação de colaborador LEGADO: o registro em
     * agency_team_members já existe (sem auth user sintético). Reutiliza o
     * MESMO id, cria o auth user, grava a senha escolhida pela própria pessoa
     * e preserva perfil de acesso, permissões, scopes, etapas e status.
     */
    if (invite.member_id) {
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, full_name, login, login_normalized, email, status, auth_user_id, synthetic_email')
        .eq('id', invite.member_id).maybeSingle()
      if (!member || member.agency_id !== invite.agency_id) {
        return json({ error: 'Cadastro não encontrado.' }, 404)
      }
      if (member.auth_user_id || member.synthetic_email) {
        return json({ error: 'Este acesso já foi ativado.' }, 400)
      }

      const memberLogin = String(member.login_normalized ?? member.login ?? login).toLowerCase()
      const email = syntheticEmail(memberLogin, invite.agency_id)
      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { name, is_team_member: true, agency_id: invite.agency_id, team_login: memberLogin },
      })
      if (authErr || !created?.user) return json({ error: 'Não foi possível criar o acesso.' }, 400)

      const password_hash = await bcrypt.hash(password, 10)
      const { error: updErr } = await admin.from('agency_team_members').update({
        auth_user_id: created.user.id,
        synthetic_email: email,
        email: member.email ?? invite.email,
        activated_at: new Date().toISOString(),
      }).eq('id', member.id)
      if (updErr) {
        await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
        return json({ error: 'Não foi possível concluir a ativação.' }, 400)
      }

      const { data: secret } = await admin.from('agency_team_member_secrets')
        .select('member_id').eq('member_id', member.id).maybeSingle()
      if (secret) {
        await admin.from('agency_team_member_secrets')
          .update({ password_hash }).eq('member_id', member.id)
      } else {
        await admin.from('agency_team_member_secrets')
          .insert({ member_id: member.id, password_hash })
      }

      await admin.from('agency_team_invites').update({
        accepted_at: new Date().toISOString(),
      }).eq('id', invite.id)

      await admin.from('agency_team_audit_log').insert({
        agency_id: invite.agency_id, team_member_id: member.id, action: 'member_activation_completed',
        module_key: 'team', entity_type: 'team_invite', entity_id: invite.id,
      })

      return json({ ok: true, login: memberLogin })
    }

    const { data: taken } = await admin.from('agency_team_members')
      .select('id').eq('login_normalized', login).maybeSingle()
    if (taken) return json({ error: 'Já existe um acesso com este e-mail.' }, 400)

    const email = syntheticEmail(login, invite.agency_id)
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name, is_team_member: true, agency_id: invite.agency_id, team_login: login },
    })
    if (authErr || !created?.user) return json({ error: 'Não foi possível criar o acesso.' }, 400)

    const password_hash = await bcrypt.hash(password, 10)
    const { data: member, error } = await admin.from('agency_team_members').insert({
      agency_id: invite.agency_id, full_name: name, login,
      email: invite.email, role_title: invite.role_title,
      department: invite.department, team_name: invite.team_name,
      access_profile_id: invite.access_profile_id,
      status: 'active', auth_user_id: created.user.id, synthetic_email: email,
      invited_at: invite.created_at, activated_at: new Date().toISOString(),
      created_by: invite.invited_by,
    }).select('id').single()
    if (error || !member) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
      return json({ error: error?.message?.includes('Limite') ? error.message : 'Não foi possível concluir o convite.' }, 400)
    }

    await admin.from('agency_team_member_secrets').insert({ member_id: member.id, password_hash })

    const keys: string[] = invite.permission_keys ?? []
    if (keys.length) {
      await admin.from('agency_team_permissions').insert(keys.map(k => ({
        agency_id: invite.agency_id, team_member_id: member.id,
        module_key: moduleOf(k), permission_key: k, enabled: true,
      })))
    }
    const scopes = (invite.scopes ?? {}) as Record<string, string>
    const scopeRows = Object.entries(scopes).map(([module_key, scope]) => ({
      agency_id: invite.agency_id, team_member_id: member.id, module_key, scope,
    }))
    if (scopeRows.length) await admin.from('agency_team_scopes').insert(scopeRows)

    await admin.from('agency_team_invites').update({
      accepted_at: new Date().toISOString(), member_id: member.id,
    }).eq('id', invite.id)

    await admin.from('agency_team_audit_log').insert({
      agency_id: invite.agency_id, team_member_id: member.id, action: 'invite_accepted',
      module_key: 'team', entity_type: 'team_invite', entity_id: invite.id,
    })

    return json({ ok: true, login })
  } catch (e) {
    console.error('team-invite-accept error', e)
    return json({ error: 'Erro interno' }, 500)
  }
})
