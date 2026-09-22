import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Comportamento real da reordenação do funil: numa mudança de etapa, o card
 * movido é atualizado PRIMEIRO e sozinho. Se o servidor recusar (guard
 * USE_CONFIRM_SALE do fluxo unificado), nenhuma posição de outro card pode ser
 * enviada e o aviso amigável fica com a interface (sem toast bruto duplicado).
 */

const updates: Array<{ table: string; patch: any; id: string }> = [];
const inserts: Array<{ table: string; payload: any }> = [];
let updateError: any = null;
const toastMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () => ({ order: async () => ({ data: [], error: null }) }),
        }),
      }),
      insert: async (payload: any) => {
        inserts.push({ table, payload });
        return { data: null, error: null };
      },
      update: (patch: any) => ({
        eq: async (_col: string, id: string) => {
          updates.push({ table, patch, id });
          if (updateError && patch.stage_id) return { data: null, error: updateError };
          return { data: null, error: null };
        },
      }),
    }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/useAgencyOwnerId", () => ({
  useAgencyOwnerId: () => ({ agencyOwnerId: "user-1" }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock("@/hooks/usePermissions", () => ({
  ensurePermission: () => true,
  ensureStagePermission: () => true,
  denyAction: () => {
    throw new Error("denied");
  },
}));
vi.mock("@/lib/audit", () => ({ logTeamAction: vi.fn() }));
vi.mock("@/lib/gamification", () => ({
  awardGamificationPoints: vi.fn(),
  POINTS_CONFIG: {},
}));

import { useOpportunities } from "@/hooks/useCRM";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const move = {
  movedId: "opp-1",
  fromStageId: "stage-a",
  toStageId: "stage-b",
  toStageLegacyKey: "closed",
  fromStageLegacyKey: "negotiation",
  orderedTargetIds: ["opp-1", "opp-2", "opp-3"],
  orderedSourceIds: ["opp-9"],
};

describe("reordenação do funil", () => {
  beforeEach(() => {
    updates.length = 0;
    inserts.length = 0;
    updateError = null;
    toastMock.mockReset();
  });

  it("recusa do servidor no card movido não envia nenhuma posição de outro card", async () => {
    updateError = { message: 'USE_CONFIRM_SALE: confirme na Central' };
    const { result } = renderHook(() => useOpportunities(), { wrapper });
    await waitFor(() => expect(result.current.reorderOpportunities).toBeTypeOf("function"));

    await expect(result.current.reorderOpportunities(move)).rejects.toThrow(/USE_CONFIRM_SALE/);

    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe("opp-1");
    expect(updates[0].patch.stage_id).toBe("stage-b");
    expect(inserts).toHaveLength(0);
  });

  it("USE_CONFIRM_SALE não gera toast bruto do hook (aviso único fica na interface)", async () => {
    updateError = { message: 'USE_CONFIRM_SALE: confirme na Central' };
    const { result } = renderHook(() => useOpportunities(), { wrapper });
    await waitFor(() => expect(result.current.reorderOpportunities).toBeTypeOf("function"));
    await expect(result.current.reorderOpportunities(move)).rejects.toThrow();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("WORKFLOW_LINK_CONFLICT também não duplica aviso", async () => {
    updateError = { message: 'WORKFLOW_LINK_CONFLICT: outro processo' };
    const { result } = renderHook(() => useOpportunities(), { wrapper });
    await waitFor(() => expect(result.current.reorderOpportunities).toBeTypeOf("function"));
    await expect(result.current.reorderOpportunities(move)).rejects.toThrow();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("mudança aceita atualiza o card movido primeiro e depois as posições", async () => {
    const { result } = renderHook(() => useOpportunities(), { wrapper });
    await waitFor(() => expect(result.current.reorderOpportunities).toBeTypeOf("function"));
    await result.current.reorderOpportunities(move);

    expect(updates[0].id).toBe("opp-1");
    expect(updates[0].patch.stage_id).toBe("stage-b");
    const rest = updates.slice(1).map((u) => u.id);
    expect(rest).toEqual(["opp-2", "opp-3", "opp-9"]);
    // O card movido não é atualizado duas vezes.
    expect(updates.filter((u) => u.id === "opp-1")).toHaveLength(1);
    expect(inserts[0].table).toBe("opportunity_history");
  });
});
