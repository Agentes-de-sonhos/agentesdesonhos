/**
 * Helpers PUROS para registros abertos por link direto (`?sale=`, `?operation=`).
 *
 * Um registro buscado direto no servidor pode estar fora da lista carregada
 * (limite de páginas) — ele precisa ficar visível sem duplicar e sem aparecer
 * em um mês ao qual não pertence.
 */

/**
 * Mescla o registro direto na coleção renderizada:
 * - nunca duplica (o registro da lista, mais novo, tem prioridade);
 * - só entra quando pertence à visão atual (`belongsToView`).
 */
export function mergeDirectRecord<T extends { id: string }>(
  list: T[],
  direct: T | null | undefined,
  belongsToView: (record: T) => boolean = () => true,
): T[] {
  if (!direct) return list;
  if (list.some((r) => r.id === direct.id)) return list;
  if (!belongsToView(direct)) return list;
  return [direct, ...list];
}

/**
 * Faz upsert do registro no cache/lista existente, preservando a ordem:
 * substitui pelo id quando já existe, insere no início quando não existe.
 */
export function upsertRecord<T extends { id: string }>(list: T[], record: T): T[] {
  const index = list.findIndex((r) => r.id === record.id);
  if (index === -1) return [record, ...list];
  const next = list.slice();
  next[index] = record;
  return next;
}

/**
 * O registro direto deixa de valer quando outra origem passa a ser autoridade
 * (ele foi alterado, excluído, ou já apareceu na lista).
 */
export function shouldDropDirectRecord<T extends { id: string }>(
  direct: T | null | undefined,
  list: T[],
  changedIds: Array<string | null | undefined> = [],
): boolean {
  if (!direct) return false;
  if (changedIds.some((id) => id === direct.id)) return true;
  return list.some((r) => r.id === direct.id);
}
