import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  agendeErrorMessage,
  firstSelectableIndex,
  formatSessionDate,
  formatSessionTime,
  isSessionSelectable,
  maskWhatsapp,
  parseTracking,
  registerAgende,
  fetchAgendeSessions,
  sanitizeAnalyticsPayload,
  seatsLabel,
  sortSessions,
  trackAgende,
  validateAgendeForm,
  type AgendeSession,
} from "@/lib/agendePublic";

const session = (over: Partial<AgendeSession> = {}): AgendeSession => ({
  id: over.id ?? "s1",
  slug: over.slug ?? "sessao-1",
  starts_at: over.starts_at ?? "2026-08-20T20:00:00.000Z",
  seats_left: over.seats_left ?? 10,
  is_full: over.is_full ?? false,
  ...over,
});

describe("agende dates (pt-BR / America/Sao_Paulo)", () => {
  const now = new Date("2026-08-12T15:00:00.000Z"); // 12h in São Paulo

  it("labels today and tomorrow", () => {
    expect(formatSessionDate("2026-08-12T20:00:00.000Z", now)).toBe("Hoje, 12 de agosto");
    expect(formatSessionDate("2026-08-13T20:00:00.000Z", now)).toBe("Amanhã, 13 de agosto");
  });

  it("labels further dates with weekday", () => {
    expect(formatSessionDate("2026-08-14T20:00:00.000Z", now)).toBe("sexta-feira, 14 de agosto");
  });

  it("uses São Paulo timezone for the hour", () => {
    expect(formatSessionTime("2026-08-12T20:00:00.000Z")).toBe("às 17h");
    expect(formatSessionTime("2026-08-12T20:30:00.000Z")).toBe("às 17h30");
  });

  it("respects the São Paulo day boundary", () => {
    // 02:00Z on the 13th is still 23h of the 12th in São Paulo
    expect(formatSessionDate("2026-08-13T02:00:00.000Z", now)).toBe("Hoje, 12 de agosto");
  });
});

describe("seats", () => {
  it("shows real availability above 3", () => {
    expect(seatsLabel(session({ seats_left: 12 }))).toEqual({
      text: "12 vagas disponíveis",
      tone: "available",
    });
  });

  it("only flags scarcity at 3 or less", () => {
    expect(seatsLabel(session({ seats_left: 4 })).tone).toBe("available");
    expect(seatsLabel(session({ seats_left: 3 }))).toEqual({ text: "Últimas 3 vagas", tone: "scarce" });
    expect(seatsLabel(session({ seats_left: 1 })).text).toBe("Última 1 vaga");
  });

  it("marks full sessions as unavailable", () => {
    expect(seatsLabel(session({ is_full: true })).text).toBe("Vagas esgotadas");
    expect(seatsLabel(session({ seats_left: 0 })).tone).toBe("full");
    expect(isSessionSelectable(session({ is_full: true }))).toBe(false);
  });
});

describe("session ordering", () => {
  const now = new Date("2026-08-12T15:00:00.000Z");

  it("sorts chronologically and drops past sessions", () => {
    const list = sortSessions(
      [
        session({ id: "c", slug: "c", starts_at: "2026-08-22T20:00:00.000Z" }),
        session({ id: "old", slug: "old", starts_at: "2026-08-01T20:00:00.000Z" }),
        session({ id: "a", slug: "a", starts_at: "2026-08-13T20:00:00.000Z" }),
      ],
      now,
    );
    expect(list.map((s) => s.slug)).toEqual(["a", "c"]);
  });

  it("points to the nearest selectable session", () => {
    const list = [session({ slug: "full", is_full: true }), session({ slug: "open" })];
    expect(firstSelectableIndex(list)).toBe(1);
  });
});

describe("tracking", () => {
  it("preserves UTMs and ad click ids", () => {
    const tracking = parseTracking(
      "?utm_source=meta&utm_medium=cpc&utm_campaign=agende&utm_content=v1&utm_term=agencia&fbclid=ABC&gclid=XYZ&other=1",
    );
    expect(tracking).toEqual({
      utm_source: "meta",
      utm_medium: "cpc",
      utm_campaign: "agende",
      utm_content: "v1",
      utm_term: "agencia",
      fbclid: "ABC",
      gclid: "XYZ",
    });
  });

  it("ignores unrelated params", () => {
    expect(parseTracking("?foo=bar")).toEqual({});
  });
});

describe("validation", () => {
  const valid = {
    email: "ana@agencia.com.br",
    firstName: "Ana",
    lastName: "Souza",
    whatsapp: "(11) 99999-9999",
    whatsappOptIn: true,
    agencyName: "Agência Sonhos",
    state: "SP",
    city: "São Paulo",
  };

  it("accepts a complete form", () => {
    expect(validateAgendeForm(valid)).toEqual({});
  });

  it("rejects bad email, short phone and missing opt-in", () => {
    const errors = validateAgendeForm({
      ...valid,
      email: "ana@",
      whatsapp: "1199",
      whatsappOptIn: false,
      state: "",
    });
    expect(errors.email).toBeTruthy();
    expect(errors.whatsapp).toBeTruthy();
    expect(errors.whatsappOptIn).toBeTruthy();
    expect(errors.state).toBeTruthy();
  });

  it("masks whatsapp progressively", () => {
    expect(maskWhatsapp("11999998888")).toBe("(11) 99999-8888");
    expect(maskWhatsapp("1133334444")).toBe("(11) 3333-4444");
  });
});

describe("analytics", () => {
  it("never forwards PII", () => {
    const clean = sanitizeAnalyticsPayload({
      session_slug: "sessao-1",
      email: "ana@agencia.com",
      whatsapp: "(11) 99999-9999",
      name: "Ana",
      utm_source: "meta",
      seats_left: 4,
    });
    expect(clean).toEqual({ session_slug: "sessao-1", utm_source: "meta", seats_left: 4 });
  });

  it("pushes sanitized events to the dataLayer", () => {
    const dl: unknown[] = [];
    (window as unknown as { dataLayer: unknown[] }).dataLayer = dl;
    trackAgende("agende_success", { session_slug: "s", email: "a@b.com" });
    expect(dl).toEqual([{ event: "agende_success", session_slug: "s" }]);
    delete (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  });
});

describe("api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const ok = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response;
  const fail = (status: number, body: unknown) =>
    ({ ok: false, status, json: async () => body }) as unknown as Response;

  it("lists sessions with a public CORS call and no secrets", async () => {
    fetchMock.mockResolvedValue(ok({ ok: true, sessions: [session()] }));
    const list = await fetchAgendeSessions(15);
    expect(list).toHaveLength(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "sessions", limit: 15 });
    expect(Object.keys(init.headers)).toEqual(["Content-Type"]);
  });

  it("sends the register payload with utms preserved", async () => {
    fetchMock.mockResolvedValue(ok({ ok: true }));
    const result = await registerAgende(
      {
        slug: "sessao-1",
        firstName: "Ana",
        lastName: "Souza",
        email: "Ana@Agencia.com ",
        whatsapp: "(11) 99999-9999",
        whatsappOptIn: true,
        agencyName: "Agência",
        state: "SP",
        city: "São Paulo",
      },
      { utm_source: "meta", gclid: "XYZ" },
    );
    expect(result).toEqual({ ok: true, alreadyRegistered: false });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.action).toBe("register");
    expect(body.name).toBe("Ana Souza");
    expect(body.email).toBe("ana@agencia.com");
    expect(body.utm_source).toBe("meta");
    expect(body.gclid).toBe("XYZ");
  });

  it("detects already_registered as success", async () => {
    fetchMock.mockResolvedValue(ok({ ok: true, status: "already_registered" }));
    const result = await registerAgende({
      slug: "s",
      firstName: "Ana",
      lastName: "Souza",
      email: "a@b.com",
      whatsapp: "11999998888",
      whatsappOptIn: false,
      agencyName: "Ag",
      state: "SP",
      city: "SP",
    });
    expect(result.alreadyRegistered).toBe(true);
  });

  it("surfaces friendly messages for API errors", async () => {
    fetchMock.mockResolvedValue(fail(409, { error: "session_full" }));
    await expect(
      registerAgende({
        slug: "s",
        firstName: "Ana",
        lastName: "Souza",
        email: "a@b.com",
        whatsapp: "11999998888",
        whatsappOptIn: true,
        agencyName: "Ag",
        state: "SP",
        city: "SP",
      }),
    ).rejects.toThrow("session_full");
    expect(agendeErrorMessage("session_full")).toContain("lotar");
    expect(agendeErrorMessage("Failed to fetch")).toContain("conexão");
  });
});
