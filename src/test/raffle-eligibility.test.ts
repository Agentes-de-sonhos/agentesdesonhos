import { describe, expect, it } from "vitest";
import {
  collectFilterOptions,
  computeDashboard,
  computeStats,
  evaluateEligibility,
  markDuplicates,
  normalizeEmail,
  participantKey,
} from "@/lib/raffle/eligibility";
import { pickWinners, secureRandomInt, secureShuffle } from "@/lib/raffle/draw";
import { rowsToParticipants, detectFileCapabilities } from "@/lib/raffle/parseFile";
import { winnersToCsv } from "@/lib/raffle/export";
import {
  DEFAULT_RAFFLE_FILTERS,
  type RaffleCapabilities,
  type RaffleParticipant,
} from "@/lib/raffle/types";

const CAPS: RaffleCapabilities = {
  attendance: true,
  watchedMinutes: true,
  survey: true,
  registrationStatus: true,
  subscribers: false,
};

function p(over: Partial<RaffleParticipant> & { id: string; name: string }): RaffleParticipant {
  return { raw: {}, ...over };
}

const base: RaffleParticipant[] = [
  p({ id: "1", name: "Ana", email: "ana@x.com", state: "SP", city: "Santos", company: "Alfa", attended: true, watchedMinutes: 45, surveyAnswered: true, registrationStatus: "confirmado", eventsParticipated: 3 }),
  p({ id: "2", name: "Bruno", email: "ANA@x.com", state: "RJ", city: "Rio", company: "Beta", attended: false, watchedMinutes: 0, surveyAnswered: false, registrationStatus: "inscrito", eventsParticipated: 1 }),
  p({ id: "3", name: "Carla", email: "carla@x.com", state: "SP", city: "Santos", company: "Alfa", attended: true, watchedMinutes: 10, surveyAnswered: false, registrationStatus: "cancelado", eventsParticipated: 2 }),
];

describe("normalização e deduplicação", () => {
  it("normaliza e-mails ignorando caixa, espaços e sufixo +tag", () => {
    expect(normalizeEmail("  Ana+news@X.com ")).toBe("ana@x.com");
    expect(normalizeEmail("sem-arroba")).toBe("");
  });

  it("marca apenas a ocorrência repetida como duplicada", () => {
    const dups = markDuplicates(base);
    expect(dups.has("1")).toBe(false);
    expect(dups.has("2")).toBe(true);
  });

  it("usa nome como chave quando não há e-mail", () => {
    expect(participantKey(p({ id: "x", name: "José Maria" }))).toBe("jose maria");
  });
});

describe("elegibilidade", () => {
  it("por padrão exclui cancelados e duplicados", () => {
    const r = evaluateEligibility(base, DEFAULT_RAFFLE_FILTERS, { capabilities: CAPS });
    expect(r.map((x) => x.eligible)).toEqual([true, false, false]);
    expect(r[1].reason).toBe("E-mail duplicado");
    expect(r[2].reason).toBe("Inscrição cancelada");
  });

  it("combina filtros de presença, minutos e pesquisa", () => {
    const r = evaluateEligibility(
      base,
      { ...DEFAULT_RAFFLE_FILTERS, onlyAttended: true, minWatchedMinutes: 30, onlySurveyAnswered: true },
      { capabilities: CAPS },
    );
    expect(r.filter((x) => x.eligible).map((x) => x.participant.id)).toEqual(["1"]);
  });

  it("combina filtros de localização, agência e busca", () => {
    const r = evaluateEligibility(
      base,
      { ...DEFAULT_RAFFLE_FILTERS, excludeDuplicateEmails: false, excludeCancelled: false, states: ["SP"], agencies: ["Alfa"], search: "carla" },
      { capabilities: CAPS },
    );
    expect(r.filter((x) => x.eligible).map((x) => x.participant.id)).toEqual(["3"]);
  });

  it("ignora filtros indisponíveis na origem (degradação graciosa)", () => {
    const r = evaluateEligibility(
      base,
      { ...DEFAULT_RAFFLE_FILTERS, excludeDuplicateEmails: false, excludeCancelled: false, minWatchedMinutes: 999, onlySubscribers: true },
      { capabilities: { attendance: false, watchedMinutes: false, survey: false, registrationStatus: false, subscribers: false } },
    );
    expect(r.every((x) => x.eligible)).toBe(true);
  });

  it("exclui vencedores anteriores por chave canônica", () => {
    const r = evaluateEligibility(base, DEFAULT_RAFFLE_FILTERS, {
      capabilities: CAPS,
      previousWinnerKeys: new Set(["ana@x.com"]),
    });
    expect(r[0].eligible).toBe(false);
    expect(r[0].reason).toBe("Já foi sorteado");
  });
});

describe("dashboard e estatísticas", () => {
  it("calcula métricas reais e sinaliza assinantes indisponíveis", () => {
    const d = computeDashboard(evaluateEligibility(base, DEFAULT_RAFFLE_FILTERS, { capabilities: CAPS }), CAPS);
    expect(d).toMatchObject({ total: 3, attended: 2, eligible: 1, duplicates: 1, states: 2, agencies: 2, subscribers: null });
  });

  it("agrupa e calcula recorrência sem contagem dupla", () => {
    const s = computeStats(base);
    expect(s.byState[0]).toEqual({ label: "SP", count: 2 });
    // Bruno compartilha o e-mail de Ana, então conta uma única vez.
    expect(s.recurrence.available).toBe(true);
    expect(s.recurrence.firstTime + s.recurrence.recurring).toBe(2);
  });

  it("expõe opções de filtro únicas e ordenadas", () => {
    expect(collectFilterOptions(base).agencies).toEqual(["Alfa", "Beta"]);
  });
});

describe("sorteio seguro", () => {
  it("gera índices dentro do intervalo", () => {
    for (let i = 0; i < 50; i++) expect(secureRandomInt(5)).toBeLessThan(5);
  });

  it("embaralha preservando os itens", () => {
    expect(secureShuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });

  it("não repete vencedor dentro do mesmo sorteio", () => {
    const { winners, remainingPool } = pickWinners({ pool: base, count: 3, removeWinners: true });
    expect(new Set(winners.map((w) => w.id)).size).toBe(3);
    expect(remainingPool).toHaveLength(0);
  });

  it("mantém o pool quando a remoção está desligada", () => {
    expect(pickWinners({ pool: base, count: 1, removeWinners: false }).remainingPool).toHaveLength(3);
  });

  it("valida quantidade de vencedores contra elegíveis", () => {
    expect(() => pickWinners({ pool: base, count: 4, removeWinners: true })).toThrow(/apenas 3/);
    expect(() => pickWinners({ pool: base, count: 0, removeWinners: true })).toThrow(/inválida/);
    expect(() => pickWinners({ pool: [], count: 1, removeWinners: true })).toThrow(/elegível/);
  });
});

describe("não regressão do upload CSV/Excel", () => {
  const rows = [
    { Nome: "Ana Silva", Agência: "Alfa Turismo", "E-mail": "ana@alfa.com", Cidade: "Santos", UF: "SP", Extra: "manter" },
    { Nome: "", Agência: "Beta", "E-mail": "", Cidade: "", UF: "", Extra: "" },
  ];

  it("mapeia nome/agência como antes e descarta linhas sem nome", () => {
    const list = rowsToParticipants(rows);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Ana Silva", company: "Alfa Turismo", city: "Santos", state: "SP" });
  });

  it("preserva todas as colunas originais no snapshot", () => {
    expect(rowsToParticipants(rows)[0].raw).toMatchObject({ Extra: "manter" });
  });

  it("detecta capacidades ausentes na planilha", () => {
    expect(detectFileCapabilities(rows)).toMatchObject({ attendance: false, watchedMinutes: false, subscribers: false });
  });

  it("usa a primeira coluna como nome quando não há cabeçalho 'nome'", () => {
    expect(rowsToParticipants([{ Participante: "Zé", Outro: 1 }])[0].name).toBe("Zé");
  });
});

describe("exportação", () => {
  it("gera CSV com BOM e acentuação preservada", () => {
    const csv = winnersToCsv([{ position: 1, participant: base[0] }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Empresa/Agência");
    expect(csv).toContain("Ana");
  });
});