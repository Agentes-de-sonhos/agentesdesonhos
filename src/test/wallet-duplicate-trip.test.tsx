import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const USER_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: USER_ID } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/roteiro-domain", () => ({ cloneItineraryForTrip: vi.fn() }));

/** Banco sintético em memória. */
const db: Record<string, any[]> = {};
const storageObjects = new Set<string>();
let failServiceInsertAt: number | null = null;
let serviceInsertCount = 0;
const deletedTrips: string[] = [];
const removedFiles: string[] = [];

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function tableApi(table: string) {
  const rows = () => (db[table] ??= []);
  return {
    select: (_cols?: string) => {
      const filtered: any[] = [...rows()];
      const chain: any = {
        _rows: filtered,
        eq(col: string, value: any) {
          chain._rows = chain._rows.filter((r: any) => r[col] === value);
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        single: async () => ({ data: chain._rows[0] ?? null, error: chain._rows[0] ? null : new Error("not found") }),
        maybeSingle: async () => ({ data: chain._rows[0] ?? null, error: null }),
        then: (resolve: any) => resolve({ data: chain._rows, error: null }),
      };
      return chain;
    },
    insert: (payload: any) => {
      const list = Array.isArray(payload) ? payload : [payload];
      if (table === "trip_services") {
        serviceInsertCount += 1;
        if (failServiceInsertAt === serviceInsertCount) {
          const failed: any = {
            select: () => failed,
            single: async () => ({ data: null, error: new Error("insert failure") }),
            then: (resolve: any) => resolve({ data: null, error: new Error("insert failure") }),
          };
          return failed;
        }
      }
      const created = list.map((r) => ({ ...r, id: newId(table) }));
      rows().push(...created);
      const api: any = {
        select: () => api,
        single: async () => ({ data: created[0], error: null }),
        then: (resolve: any) => resolve({ data: created, error: null }),
      };
      return api;
    },
    delete: () => ({
      eq: async (col: string, value: any) => {
        if (table === "trips") deletedTrips.push(value);
        db[table] = rows().filter((r) => r[col] !== value);
        if (table === "trips") {
          db.trip_services = (db.trip_services ?? []).filter((s) => s.trip_id !== value);
        }
        return { error: null };
      },
    }),
    update: () => ({ eq: async () => ({ error: null }) }),
  };
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => tableApi(table),
    storage: {
      from: () => ({
        copy: async (from: string, to: string) => {
          if (!storageObjects.has(from)) return { error: new Error("missing") };
          storageObjects.add(to);
          return { error: null };
        },
        download: async () => ({ data: null, error: new Error("missing") }),
        upload: async () => ({ error: new Error("missing") }),
        remove: async (paths: string[]) => {
          paths.forEach((p) => {
            storageObjects.delete(p);
            removedFiles.push(p);
          });
          return { error: null };
        },
      }),
    },
  },
}));

import { useTrips } from "@/hooks/useTrips";

const SOURCE_ID = "trip-source";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function seed() {
  Object.keys(db).forEach((k) => delete db[k]);
  storageObjects.clear();
  removedFiles.length = 0;
  deletedTrips.length = 0;
  serviceInsertCount = 0;
  failServiceInsertAt = null;

  db.trips = [{
    id: SOURCE_ID,
    user_id: USER_ID,
    client_name: "Maria Teste",
    client_id: null,
    destination: "Roma",
    start_date: "2026-10-01",
    end_date: "2026-10-10",
    status: "active",
    trip_title: "Viagem Roma",
    wallet_cover_url: "https://cdn.test/capa.jpg",
    signature_snapshot: { name: "Assinatura Original", accepted_at: "2026-09-01T12:00:00Z" },
    itinerary_mode: "none",
    itinerary_id: null,
    share_token: "aaaa",
    access_password: "123456",
  }];
  db.trip_services = [
    {
      id: "svc-1", trip_id: SOURCE_ID, service_type: "hotel",
      service_data: { name: "Hotel A", status: "confirmed", notes: "obs" },
      order_index: 0, image_url: null, image_urls: [], place_id: "p1",
      voucher_url: `${USER_ID}/${SOURCE_ID}/voucher1.pdf`, voucher_name: "Voucher Hotel.pdf",
      attachments: [{ url: `${USER_ID}/${SOURCE_ID}/anexo1.pdf`, name: "Anexo 1.pdf" }],
    },
    {
      id: "svc-2", trip_id: SOURCE_ID, service_type: "flight",
      service_data: { airline: "LATAM" },
      order_index: 1, image_url: null, image_urls: [], place_id: null,
      voucher_url: null, voucher_name: null,
      attachments: [
        { url: `${USER_ID}/${SOURCE_ID}/bilhete.pdf`, name: "Bilhete.pdf" },
        { url: `${USER_ID}/${SOURCE_ID}/seguro.pdf`, name: "Seguro.pdf" },
      ],
    },
  ];
  db.trip_itinerary_activities = [{
    id: "act-1", trip_id: SOURCE_ID, day_date: "2026-10-02", period: "morning",
    title: "City tour", order_index: 0, origin: "manual",
    photo_urls: ["https://cdn.test/foto.jpg"],
    document_urls: [`${USER_ID}/${SOURCE_ID}/roteiro.pdf`],
    linked_service_id: "svc-1",
  }];
  db.trip_itinerary_period_images = [];
  db.trip_reminders = [{
    id: "rem-1", trip_id: SOURCE_ID, user_id: USER_ID,
    days_before: 7, reminder_date: "2026-09-24", follow_up_note: "Ligar cliente", is_completed: false,
  }, {
    id: "rem-2", trip_id: SOURCE_ID, user_id: USER_ID,
    days_before: -1, reminder_date: "2026-10-09", follow_up_note: null, is_completed: true,
  }];

  [
    "voucher1.pdf", "anexo1.pdf", "bilhete.pdf", "seguro.pdf", "roteiro.pdf",
  ].forEach((f) => storageObjects.add(`${USER_ID}/${SOURCE_ID}/${f}`));
}

describe("duplicação completa da Carteira Digital", () => {
  beforeEach(seed);

  it("copia todos os serviços, anexos e remapeia vínculos", async () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    const copy = await result.current.duplicateTrip(SOURCE_ID);

    const newServices = db.trip_services.filter((s) => s.trip_id === copy.id);
    expect(newServices).toHaveLength(2);
    expect(newServices.map((s) => s.order_index)).toEqual([0, 1]);
    expect(newServices[0].service_data).toEqual({ name: "Hotel A", status: "confirmed", notes: "obs" });

    // Voucher e anexos apontam para novos caminhos dentro da nova carteira.
    expect(newServices[0].voucher_url).toContain(`${USER_ID}/${copy.id}/`);
    expect(newServices[0].voucher_name).toBe("Voucher Hotel.pdf");
    expect(newServices[0].attachments[0].name).toBe("Anexo 1.pdf");
    expect(newServices[0].attachments[0].url).not.toBe(`${USER_ID}/${SOURCE_ID}/anexo1.pdf`);
    expect(newServices[1].attachments.map((a: any) => a.name)).toEqual(["Bilhete.pdf", "Seguro.pdf"]);

    // Identificadores públicos não são herdados.
    const created = db.trips.find((t) => t.id === copy.id)!;
    expect(created.share_token).not.toBe("aaaa");
    expect(created.access_password).not.toBe("123456");
    expect(created.opportunity_id).toBeNull();

    // Atividade legada aponta para o novo serviço e novo documento.
    const act = db.trip_itinerary_activities.find((a) => a.trip_id === copy.id)!;
    expect(act.linked_service_id).toBe(newServices[0].id);
    expect(act.document_urls[0]).toContain(`${USER_ID}/${copy.id}/`);
  });

  it("mantém independência: excluir arquivos da cópia não afeta a origem", async () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    const copy = await result.current.duplicateTrip(SOURCE_ID);
    const copyPaths = db.trip_services
      .filter((s) => s.trip_id === copy.id)
      .flatMap((s) => [s.voucher_url, ...s.attachments.map((a: any) => a.url)])
      .filter(Boolean) as string[];

    copyPaths.forEach((p) => storageObjects.delete(p));

    const sourcePaths = db.trip_services
      .filter((s) => s.trip_id === SOURCE_ID)
      .flatMap((s) => [s.voucher_url, ...s.attachments.map((a: any) => a.url)])
      .filter(Boolean) as string[];
    sourcePaths.forEach((p) => expect(storageObjects.has(p)).toBe(true));
  });

  it("carteira sem anexos duplica normalmente", async () => {
    db.trip_services = [{
      id: "svc-1", trip_id: SOURCE_ID, service_type: "other",
      service_data: { title: "Sem anexo" }, order_index: 0,
      image_url: null, image_urls: [], place_id: null,
      voucher_url: null, voucher_name: null, attachments: [],
    }];
    db.trip_itinerary_activities = [];
    const { result } = renderHook(() => useTrips(), { wrapper });
    const copy = await result.current.duplicateTrip(SOURCE_ID);
    const svc = db.trip_services.find((s) => s.trip_id === copy.id)!;
    expect(svc.attachments).toEqual([]);
    expect(svc.voucher_url).toBeNull();
  });

  it("falha intermediária não deixa cópia parcial", async () => {
    failServiceInsertAt = 2;
    const { result } = renderHook(() => useTrips(), { wrapper });
    await expect(result.current.duplicateTrip(SOURCE_ID)).rejects.toThrow();

    await waitFor(() => expect(deletedTrips).toHaveLength(1));
    const newTripId = deletedTrips[0];
    expect(db.trips.some((t) => t.id === newTripId)).toBe(false);
    expect(db.trip_services.every((s) => s.trip_id === SOURCE_ID)).toBe(true);
    // Arquivos copiados antes da falha foram removidos.
    expect(removedFiles.length).toBeGreaterThan(0);
    removedFiles.forEach((p) => expect(storageObjects.has(p)).toBe(false));
    expect(storageObjects.has(`${USER_ID}/${SOURCE_ID}/voucher1.pdf`)).toBe(true);
  });

  it("não herda assinatura e não copia lembretes", async () => {
    const { result } = renderHook(() => useTrips(), { wrapper });
    const copy = await result.current.duplicateTrip(SOURCE_ID);

    const created = db.trips.find((t) => t.id === copy.id)!;
    expect(created.signature_snapshot).toBeNull();

    const copyReminders = db.trip_reminders.filter((r) => r.trip_id === copy.id);
    expect(copyReminders).toHaveLength(0);

    // A origem permanece inalterada.
    expect(db.trip_reminders.filter((r) => r.trip_id === SOURCE_ID)).toHaveLength(2);
  });
});
