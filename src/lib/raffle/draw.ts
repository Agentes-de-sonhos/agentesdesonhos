import type { RaffleParticipant } from "./types";

/** Inteiro aleatório criptograficamente seguro em [0, max). Nunca usa Math.random. */
export function secureRandomInt(max: number): number {
  if (max <= 0) throw new Error("max deve ser maior que zero");
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Ambiente sem gerador aleatório seguro (crypto.getRandomValues)");
  }
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    cryptoObj.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

/** Fisher-Yates com fonte segura. Não muta o array recebido. */
export function secureShuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface PickWinnersOptions {
  pool: RaffleParticipant[];
  count: number;
  /** Remove os vencedores do pool da sessão (sem repetição). */
  removeWinners: boolean;
}

export interface PickWinnersResult {
  winners: RaffleParticipant[];
  remainingPool: RaffleParticipant[];
}

export function pickWinners({ pool, count, removeWinners }: PickWinnersOptions): PickWinnersResult {
  if (!pool.length) throw new Error("Nenhum participante elegível para sortear.");
  if (!Number.isInteger(count) || count < 1) throw new Error("Quantidade de vencedores inválida.");
  if (count > pool.length) {
    throw new Error(`Existem apenas ${pool.length} participantes elegíveis.`);
  }

  const winners: RaffleParticipant[] = [];
  const working = [...pool];
  for (let i = 0; i < count; i++) {
    const index = secureRandomInt(working.length);
    winners.push(working[index]);
    working.splice(index, 1);
  }

  return { winners, remainingPool: removeWinners ? working : [...pool] };
}