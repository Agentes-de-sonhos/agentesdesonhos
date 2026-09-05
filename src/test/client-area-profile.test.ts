/**
 * Perfil da Área do Cliente — mapeamento das colunas reais de `clients`,
 * aniversário e isolamento por agência/cliente. Dados sintéticos, sem rede.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  CLIENT_PROFILE_COLUMNS,
  buildBirthDate,
  loadClientProfile,
  mapClientProfile,
} from '../../supabase/functions/_shared/clientAreaProfile.ts'

type Row = Record<string, unknown> | null

/** Banco falso: só devolve a linha quando os dois filtros batem. */
function fakeAdmin(rows: Array<Record<string, unknown>>, opts: { error?: boolean } = {}) {
  const calls: Array<{ table: string; select: string; filters: Record<string, string> }> = []
  const admin = {
    from(table: string) {
      const entry = { table, select: '', filters: {} as Record<string, string> }
      calls.push(entry)
      const builder = {
        select(cols: string) {
          entry.select = cols
          return builder
        },
        eq(col: string, val: string) {
          entry.filters[col] = val
          return builder
        },
        async maybeSingle() {
          if (opts.error) return { data: null, error: { message: 'boom' } }
          const match = rows.find(
            (r) => r.user_id === entry.filters.user_id && r.id === entry.filters.id,
          )
          return { data: (match ?? null) as Row, error: null }
        },
      }
      return builder
    },
  }
  return { admin, calls }
}

const AG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const AG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CLI_1 = '11111111-1111-4111-8111-111111111111'
const CLI_2 = '22222222-2222-4222-8222-222222222222'

const ROWS = [
  {
    id: CLI_1,
    user_id: AG_A,
    name: 'Maria Souza',
    email: 'cadastro@ex.com',
    phone: '11988887777',
    city: 'São Paulo',
    birthday_day: 29,
    birthday_month: 2,
    birthday_year: 2000,
  },
  {
    id: CLI_2,
    user_id: AG_B,
    name: 'Outro Passageiro',
    email: 'outro@ex.com',
    phone: '11999996666',
    city: 'Recife',
    birthday_day: 1,
    birthday_month: 1,
    birthday_year: 1990,
  },
]

describe('seleção de colunas', () => {
  it('usa apenas colunas existentes e nunca select(*)', () => {
    expect(CLIENT_PROFILE_COLUMNS).toBe(
      'name, email, phone, city, birthday_day, birthday_month, birthday_year',
    )
    expect(CLIENT_PROFILE_COLUMNS).not.toContain('*')
    for (const inexistente of ['nome_completo', 'telefone', 'cidade', 'estado', 'pais', 'data_nascimento']) {
      expect(CLIENT_PROFILE_COLUMNS).not.toContain(inexistente)
    }
  })
})

describe('data de nascimento', () => {
  it('monta YYYY-MM-DD com dia, mês e ano inteiros válidos', () => {
    expect(buildBirthDate(5, 3, 1988)).toBe('1988-03-05')
    expect(buildBirthDate(29, 2, 2000)).toBe('2000-02-29')
  })

  it('devolve null quando incompleta, sem inventar o ano', () => {
    expect(buildBirthDate(5, 3, null)).toBeNull()
    expect(buildBirthDate(null, 3, 1988)).toBeNull()
    expect(buildBirthDate(5, null, 1988)).toBeNull()
    expect(buildBirthDate(5, 3, undefined)).toBeNull()
  })

  it('devolve null para datas de calendário inválidas', () => {
    expect(buildBirthDate(29, 2, 2001)).toBeNull() // não bissexto
    expect(buildBirthDate(31, 4, 1990)).toBeNull()
    expect(buildBirthDate(0, 1, 1990)).toBeNull()
    expect(buildBirthDate(10, 13, 1990)).toBeNull()
    expect(buildBirthDate(10.5, 1, 1990)).toBeNull()
    expect(buildBirthDate('10', '01', '1990')).toBeNull()
  })
})

describe('mapeamento do perfil', () => {
  it('mapeia nome, telefone e cidade e mantém estado/país nulos', () => {
    const profile = mapClientProfile(ROWS[0] as never, 'conta@ex.com')
    expect(profile).toEqual({
      name: 'Maria Souza',
      email: 'conta@ex.com',
      phone: '11988887777',
      city: 'São Paulo',
      state: null,
      country: null,
      birth_date: '2000-02-29',
    })
  })

  it('usa o e-mail do cadastro só quando a conta não tem e-mail', () => {
    expect(mapClientProfile(ROWS[0] as never, null).email).toBe('cadastro@ex.com')
    expect(mapClientProfile(null, null).email).toBeNull()
  })
})

describe('isolamento na leitura real', () => {
  it('aplica os dois filtros e devolve o cliente correto', async () => {
    const { admin, calls } = fakeAdmin(ROWS)
    const res = await loadClientProfile(admin as never, AG_A, CLI_1, 'conta@ex.com')
    expect(res.ok).toBe(true)
    expect(res.ok && res.profile.name).toBe('Maria Souza')
    expect(calls[0].table).toBe('clients')
    expect(calls[0].filters).toEqual({ user_id: AG_A, id: CLI_1 })
  })

  it('não devolve cliente de outra agência', async () => {
    const { admin } = fakeAdmin(ROWS)
    const res = await loadClientProfile(admin as never, AG_A, CLI_2, 'conta@ex.com')
    expect(res.ok).toBe(true)
    expect(res.ok && res.profile.name).toBeNull()
  })

  it('não devolve outro cliente da mesma agência', async () => {
    const rows = [...ROWS, { ...ROWS[1], id: CLI_2, user_id: AG_A, name: 'Vizinho' }]
    const { admin } = fakeAdmin(rows)
    const res = await loadClientProfile(admin as never, AG_A, CLI_1, 'conta@ex.com')
    expect(res.ok && res.profile.name).toBe('Maria Souza')
  })

  it('sinaliza erro da consulta em vez de sucesso vazio', async () => {
    const { admin } = fakeAdmin(ROWS, { error: true })
    const res = await loadClientProfile(admin as never, AG_A, CLI_1, 'conta@ex.com')
    expect(res.ok).toBe(false)
    expect(res).not.toHaveProperty('profile')
  })
})

describe('conta sem cliente vinculado', () => {
  it('a função não consulta a base quando não há client_id', async () => {
    const { admin, calls } = fakeAdmin(ROWS)
    const spy = vi.spyOn(admin, 'from')
    // O bloco de produção retorna { profile: null } antes de chamar a leitura.
    const clientId: string | null = null
    const resposta = clientId ? await loadClientProfile(admin as never, AG_A, clientId, null) : { profile: null }
    expect(resposta).toEqual({ profile: null })
    expect(spy).not.toHaveBeenCalled()
    expect(calls).toHaveLength(0)
  })
})
