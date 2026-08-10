import { describe, it, expect } from 'vitest'
import { checkMasterDeletion, parseDeleteUserError } from '@/lib/adminDeleteGuard'

describe('proteção da conta master na exclusão administrativa', () => {
  it('bloqueia quando a master ainda tem colaboradores', () => {
    const r = checkMasterDeletion({ teamMembers: 3, pendingInvites: 0 })
    expect(r.blocked).toBe(true)
    expect(r.code).toBe('master_has_team')
    expect(r.message).toContain('3 colaborador(es)')
    expect(r.message).toContain('Equipe e Permissões')
  })

  it('bloqueia quando só existem convites pendentes', () => {
    const r = checkMasterDeletion({ teamMembers: 0, pendingInvites: 1 })
    expect(r.blocked).toBe(true)
    expect(r.message).toContain('1 convite(s) pendente(s)')
    expect(r.message).not.toContain('colaborador(es)')
  })

  it('cita colaboradores e convites juntos', () => {
    const r = checkMasterDeletion({ teamMembers: 2, pendingInvites: 2 })
    expect(r.message).toContain('2 colaborador(es) e 2 convite(s) pendente(s)')
  })

  it('libera a exclusão apenas quando não há equipe nem convites', () => {
    expect(checkMasterDeletion({ teamMembers: 0, pendingInvites: 0 })).toEqual({ blocked: false })
  })

  it('não existe confirmação que ignore a proteção', () => {
    // A regra é determinística: não recebe nem considera nenhum "confirm_master".
    const r = checkMasterDeletion({ teamMembers: 1, pendingInvites: 0, ...( { confirm_master: true } as any) })
    expect(r.blocked).toBe(true)
  })

  it('lê a mensagem real do corpo 409 em vez de "non-2xx"', async () => {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: new Response(JSON.stringify({ error: 'Esta é a conta principal...', code: 'master_has_team' }), { status: 409 }),
    }
    await expect(parseDeleteUserError(error)).resolves.toBe('Esta é a conta principal...')
  })

  it('nunca devolve "non-2xx" quando o corpo não é legível', async () => {
    await expect(parseDeleteUserError({ message: 'Edge Function returned a non-2xx status code' }))
      .resolves.toBe('Não foi possível excluir este usuário. Tente novamente.')
  })
})
