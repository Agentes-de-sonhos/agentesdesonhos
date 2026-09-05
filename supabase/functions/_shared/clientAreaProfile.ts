/**
 * Leitura somente-consulta do perfil do passageiro na Área do Cliente.
 *
 * A tabela `clients` guarda apenas: name, email, phone, city e o aniversário
 * em três colunas inteiras (birthday_day / birthday_month / birthday_year).
 * Não existem colunas de estado, país ou data de nascimento — por isso
 * `state` e `country` sempre voltam nulos e a data é montada aqui.
 *
 * A identidade (agência + cliente) vem sempre da sessão validada, nunca do
 * corpo da requisição: os dois filtros são obrigatórios.
 */

export type ClientAreaProfile = {
  name: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: null
  country: null
  birth_date: string | null
}

export type ClientProfileRow = {
  name?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  birthday_day?: number | null
  birthday_month?: number | null
  birthday_year?: number | null
}

/** Colunas realmente existentes em `clients` usadas pelo perfil. */
export const CLIENT_PROFILE_COLUMNS =
  'name, email, phone, city, birthday_day, birthday_month, birthday_year'

const isInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v)

/**
 * Monta "YYYY-MM-DD" apenas quando dia, mês e ano estão presentes como
 * inteiros e formam uma data de calendário válida (inclusive 29/02 em anos
 * bissextos). Qualquer outro caso devolve null — nunca se inventa o ano.
 */
export function buildBirthDate(
  day: unknown,
  month: unknown,
  year: unknown,
): string | null {
  if (!isInt(day) || !isInt(month) || !isInt(year)) return null
  if (year < 1 || year > 9999) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  // Use setUTCFullYear so years 1-99 are validated literally instead of being
  // mapped to 1900-1999 by Date.UTC.
  const probe = new Date(Date.UTC(2000, month - 1, day))
  probe.setUTCFullYear(year)
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null
  }
  const yyyy = String(year).padStart(4, '0')
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function mapClientProfile(
  row: ClientProfileRow | null | undefined,
  accountEmail: string | null | undefined,
): ClientAreaProfile {
  return {
    name: row?.name ?? null,
    email: accountEmail ?? row?.email ?? null,
    phone: row?.phone ?? null,
    city: row?.city ?? null,
    state: null,
    country: null,
    birth_date: buildBirthDate(row?.birthday_day, row?.birthday_month, row?.birthday_year),
  }
}

type MinimalAdmin = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: ClientProfileRow | null; error: unknown }>
        }
      }
    }
  }
}

/**
 * Lê o perfil do cliente aplicando SEMPRE os dois filtros de isolamento.
 * Em caso de erro da consulta, devolve `{ ok: false }` — o chamador responde
 * com a mensagem genérica, sem vazar detalhe de SQL.
 */
export async function loadClientProfile(
  admin: MinimalAdmin,
  agencyId: string,
  clientId: string,
  accountEmail: string | null | undefined,
): Promise<{ ok: true; profile: ClientAreaProfile } | { ok: false }> {
  const { data, error } = await admin
    .from('clients')
    .select(CLIENT_PROFILE_COLUMNS)
    .eq('user_id', agencyId)
    .eq('id', clientId)
    .maybeSingle()

  if (error) return { ok: false }
  return { ok: true, profile: mapClientProfile(data, accountEmail) }
}
