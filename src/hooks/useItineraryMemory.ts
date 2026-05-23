import { useCallback, useEffect, useState } from "react";

export interface ItineraryMemory {
  avoid: string[];
  preferred_style: string[];
  pace?: string;
  approved: string[]; // titles of approved activities (recent)
}

const empty = (): ItineraryMemory => ({
  avoid: [],
  preferred_style: [],
  approved: [],
});

const keyFor = (id?: string) => (id ? `itin-mem:${id}` : null);

function uniqLower(arr: string[]) {
  const seen = new Set<string>();
  return arr.filter((v) => {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Lightweight per-itinerary memory persisted in sessionStorage.
 * Captures dislikes ("avoid"), preferred styles and approved titles
 * to feed back into AI refinement calls (cheap, no extra round-trips).
 */
export function useItineraryMemory(itineraryId?: string) {
  const [memory, setMemory] = useState<ItineraryMemory>(empty);

  useEffect(() => {
    const k = keyFor(itineraryId);
    if (!k) return;
    try {
      const raw = sessionStorage.getItem(k);
      setMemory(raw ? { ...empty(), ...JSON.parse(raw) } : empty());
    } catch {
      setMemory(empty());
    }
  }, [itineraryId]);

  const persist = useCallback(
    (next: ItineraryMemory) => {
      const k = keyFor(itineraryId);
      if (k) {
        try {
          sessionStorage.setItem(k, JSON.stringify(next));
        } catch {
          /* quota */
        }
      }
      setMemory(next);
    },
    [itineraryId]
  );

  /** Add a free-text instruction to extract avoid/preferred hints. */
  const learnFromInstruction = useCallback(
    (instruction: string) => {
      const text = instruction.toLowerCase();
      const avoid: string[] = [];
      const prefer: string[] = [];

      const dislikeWords = [
        "não gosta",
        "nao gosta",
        "evitar",
        "sem ",
        "tira ",
        "remover ",
        "menos ",
      ];
      if (dislikeWords.some((w) => text.includes(w))) {
        // capture the noun after the trigger
        const m = text.match(
          /(?:não gosta de|nao gosta de|evitar|sem|tira|remover|menos)\s+([\p{L} ]{3,30})/u
        );
        if (m?.[1]) avoid.push(m[1].trim().split(/[,.;]/)[0]);
      }
      const preferTriggers = ["mais ", "deixa mais", "deixe mais", "quero algo mais", "prefiro"];
      if (preferTriggers.some((w) => text.includes(w))) {
        const m = text.match(
          /(?:mais|deixe mais|deixa mais|quero algo mais|prefiro)\s+([\p{L} ]{3,30})/u
        );
        if (m?.[1]) prefer.push(m[1].trim().split(/[,.;]/)[0]);
      }
      if (avoid.length || prefer.length) {
        persist({
          ...memory,
          avoid: uniqLower([...memory.avoid, ...avoid]).slice(-12),
          preferred_style: uniqLower([...memory.preferred_style, ...prefer]).slice(-12),
        });
      }
    },
    [memory, persist]
  );

  const recordApproved = useCallback(
    (title: string) => {
      if (!title) return;
      const next = {
        ...memory,
        approved: uniqLower([...memory.approved, title]).slice(-20),
      };
      persist(next);
    },
    [memory, persist]
  );

  const recordRemoved = useCallback(
    (title: string) => {
      if (!title) return;
      const next = {
        ...memory,
        avoid: uniqLower([...memory.avoid, title]).slice(-12),
      };
      persist(next);
    },
    [memory, persist]
  );

  const reset = useCallback(() => persist(empty()), [persist]);

  return { memory, learnFromInstruction, recordApproved, recordRemoved, reset };
}
