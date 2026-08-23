/**
 * Área do Cliente — Etapa 5. Helpers puros de documentos e acessos.
 *
 * Regras de segurança que este módulo garante:
 * - O caminho de storage NUNCA vem do navegador: é derivado no servidor a
 *   partir do registro já autorizado (anexo da operação ou contrato da venda).
 * - Nomes de arquivo nunca decidem autorização; só rotulam a exibição.
 * - Path traversal e caminhos absolutos são rejeitados.
 */

export const SIGNED_URL_TTL_SECONDS = 120
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024

/** Extensões que o passageiro pode abrir/baixar na Área do Cliente. */
const ALLOWED_EXTENSIONS = [
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt',
]

export function sanitizeStoragePath(raw: string): string | null {
  const clean = (raw || '').trim().replace(/^\/+/, '')
  if (!clean || clean.length > 400) return null
  if (clean.includes('..') || clean.includes('\\') || clean.includes('\0')) return null
  return clean
}

/**
 * Caminho dentro do bucket, aceitando registros legados que guardaram uma URL
 * assinada completa. Qualquer outro formato é recusado (sem palpites).
 */
export function storagePathFromValue(bucket: string, value?: string | null): string | null {
  const raw = (value || '').trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) return sanitizeStoragePath(raw)
  const marker = `/${bucket}/`
  const idx = raw.indexOf(marker)
  if (idx === -1) return null
  const tail = raw.slice(idx + marker.length).split('?')[0].split('#')[0]
  try {
    return sanitizeStoragePath(decodeURIComponent(tail))
  } catch {
    return sanitizeStoragePath(tail)
  }
}

export function isAllowedDocumentFile(fileName?: string | null, fileSize?: number | null): boolean {
  if (typeof fileSize === 'number' && fileSize > MAX_DOCUMENT_BYTES) return false
  const ext = (fileName || '').toLowerCase().split('.').pop() || ''
  return ALLOWED_EXTENSIONS.includes(ext)
}

/** Mesma normalização de categoria usada na apresentação (src/lib/clientAreaDocuments.ts). */
export function normalizeDocumentCategory(raw?: string | null): string {
  const value = (raw || '').trim().toLowerCase()
  if (!value) return 'outro'
  if (/contrat/.test(value)) return 'contrato'
  if (/voucher|reserva/.test(value)) return 'voucher'
  if (/passag|bilhet|aere|aéreo|ticket|e-?ticket|flight/.test(value)) return 'passagem'
  if (/hotel|hosped|acomod/.test(value)) return 'hospedagem'
  if (/seguro|apolice|apólice|insur/.test(value)) return 'seguro'
  if (/ingress|atracao|atração|park|attraction/.test(value)) return 'ingresso'
  if (/comprov|recibo|pagamento|receipt/.test(value)) return 'comprovante'
  return 'outro'
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
}

/** Slug da agência igual ao usado pelos links públicos (carteira/roteiro). */
export function agencySlugFromName(agencyName?: string | null): string {
  return (agencyName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Roteiros só aparecem para o passageiro quando realmente publicados. */
export const PUBLISHED_ITINERARY_STATUS = ['published', 'approved']

export function isPublishedItinerary(row?: { status?: string | null; public_access_code?: string | null } | null): boolean {
  if (!row) return false
  if (!row.public_access_code) return false
  return PUBLISHED_ITINERARY_STATUS.includes((row.status || '').toLowerCase())
}

export const WALLET_GRANT_TTL_MS = 120_000
