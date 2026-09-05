import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getPromoAccessState, getPlanOfferState } from "@/lib/promoAccess";

// ---------------------------------------------------------------- mocks base
const invokeMock = vi.fn(async () => ({ data: { url: "https://checkout.test" }, error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...(args as [])) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    rpc: async () => ({ data: null, error: null }),
  },
}));

let authState: any = { user: { id: "u1", email: "agente@teste.com" }, loading: false };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authState }));

let subState: any = null;
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => subState,
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/team/TeamMembersDialog", () => ({
  TeamMembersDialog: () => null,
}));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ role: "user" }) }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ isMaster: false, can: () => false }),
}));
vi.mock("@/hooks/useTeamMembers", () => ({ useTeamQuota: () => ({ data: null }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const PLAN_LABELS_PROMO = "Promoção Grupo SC";

function makeSubscriptionCtx(plan: string, subscription: any, extra: Partial<any> = {}) {
  return {
    plan,
    subscription,
    loading: false,
    planInherited: false,
    getPlanLabel: (p: string) =>
      p === "promo_grupo_sc"
        ? PLAN_LABELS_PROMO
        : p === "premium"
          ? "Plano Premium"
          : p === "profissional"
            ? "Plano Profissional"
            : p === "fundador"
              ? "Plano Fundador"
              : "Plano Start",
    getRequiredPlan: () => "premium",
    hasFeature: () => false,
    refetch: async () => {},
    ...extra,
  };
}

async function renderMinhaConta() {
  const { default: MinhaConta } = await import("@/pages/MinhaConta");
  return render(
    <MemoryRouter>
      <MinhaConta />
    </MemoryRouter>,
  );
}

async function renderPlanos() {
  const { default: Planos } = await import("@/pages/Planos");
  return render(
    <MemoryRouter>
      <Planos />
    </MemoryRouter>,
  );
}

async function renderUpgradeDialog() {
  const { UpgradeDialog } = await import("@/components/subscription/UpgradeDialog");
  return render(
    <MemoryRouter>
      <UpgradeDialog open onOpenChange={() => {}} />
    </MemoryRouter>,
  );
}

const FUTURE = "2099-12-31T00:00:00.000Z";
const PAST = "2020-01-31T00:00:00.000Z";

beforeEach(() => {
  invokeMock.mockClear();
  authState = { user: { id: "u1", email: "agente@teste.com" }, loading: false };
  subState = makeSubscriptionCtx("start", null);
});
afterEach(() => cleanup());

// ------------------------------------------------------------------- helper
describe("promoAccess helper", () => {
  it("classifica promoção ativa, expirada, inativa e sem data", () => {
    expect(getPromoAccessState({ plan: "promo_grupo_sc", expires_at: FUTURE, is_active: true }).status)
      .toBe("active");
    expect(getPromoAccessState({ plan: "promo_grupo_sc", expires_at: PAST, is_active: true }).status)
      .toBe("expired");
    expect(getPromoAccessState({ plan: "promo_grupo_sc", expires_at: FUTURE, is_active: false }).status)
      .toBe("inactive");
    expect(getPromoAccessState({ plan: "promo_grupo_sc", expires_at: null, is_active: true }).status)
      .toBe("unknown");
    expect(getPromoAccessState({ plan: "premium", expires_at: FUTURE }).isPromo).toBe(false);
  });

  it("promo vigente equivale a premium; encerrada não marca premium", () => {
    const active = getPlanOfferState({
      hasUser: true,
      plan: "promo_grupo_sc",
      subscription: { plan: "promo_grupo_sc", expires_at: FUTURE, is_active: true },
    });
    expect(active.effectivePlan).toBe("premium");
    expect(active.purchaseBlocked).toBe(true);
    expect(active.blockedReason).toBe("promo_active");

    const expired = getPlanOfferState({
      hasUser: true,
      plan: "promo_grupo_sc",
      subscription: { plan: "promo_grupo_sc", expires_at: PAST, is_active: true },
    });
    expect(expired.effectivePlan).toBe("start");
    expect(expired.purchaseBlocked).toBe(false);
  });

  it("bloqueia durante carregamento e para colaborador com plano herdado", () => {
    expect(getPlanOfferState({ loading: true, hasUser: true, plan: "start" }).blockedReason).toBe("loading");
    expect(
      getPlanOfferState({ hasUser: true, plan: "premium", planInherited: true }).blockedReason,
    ).toBe("team_inherited");
    expect(getPlanOfferState({ hasUser: false, plan: null }).purchaseBlocked).toBe(false);
  });

  it("mantém comportamento dos planos tradicionais", () => {
    for (const p of ["start", "profissional", "premium", "fundador"]) {
      const s = getPlanOfferState({ hasUser: true, plan: p, subscription: { plan: p, expires_at: FUTURE } });
      expect(s.effectivePlan).toBe(p);
      expect(s.coveredByPromo).toBe(false);
      expect(s.purchaseBlocked).toBe(false);
    }
  });
});

// -------------------------------------------------------------- MinhaConta
describe("MinhaConta — promoção manual", () => {
  it("promoção ativa: nome preservado, validade e equivalência Premium, sem aviso gratuito", async () => {
    subState = makeSubscriptionCtx("promo_grupo_sc", {
      plan: "promo_grupo_sc",
      expires_at: FUTURE,
      is_active: true,
    });
    await renderMinhaConta();
    expect(screen.getAllByText(PLAN_LABELS_PROMO).length).toBeGreaterThan(0);
    expect(screen.getByText(/Acesso promocional válido até/)).toBeTruthy();
    expect(screen.getByText(/equivalentes ao Plano Premium/)).toBeTruthy();
    expect(screen.queryByText(/plano gratuito/)).toBeNull();
  });

  it("promoção não exibe portal Stripe nem cancelamento", async () => {
    subState = makeSubscriptionCtx("promo_grupo_sc", {
      plan: "promo_grupo_sc",
      expires_at: FUTURE,
      is_active: true,
    });
    await renderMinhaConta();
    expect(screen.queryByText("Gerenciar assinatura")).toBeNull();
    expect(screen.queryByText("Cancelar assinatura")).toBeNull();
    expect(screen.queryByText(/Próxima renovação/)).toBeNull();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("promoção expirada informa encerramento e não afirma ativo", async () => {
    subState = makeSubscriptionCtx("promo_grupo_sc", {
      plan: "promo_grupo_sc",
      expires_at: PAST,
      is_active: true,
    });
    await renderMinhaConta();
    expect(screen.getByText(/Acesso promocional encerrado em/)).toBeTruthy();
    expect(screen.queryByText(/válido até/)).toBeNull();
  });

  it("promoção sem data não inventa data nem presume encerramento", async () => {
    subState = makeSubscriptionCtx("promo_grupo_sc", {
      plan: "promo_grupo_sc",
      expires_at: null,
      is_active: true,
    });
    await renderMinhaConta();
    expect(screen.getByText(/data de validade\s+não está registrada/)).toBeTruthy();
    expect(screen.queryByText(/encerrado/)).toBeNull();
  });

  it("plano recorrente mantém portal e próxima renovação", async () => {
    subState = makeSubscriptionCtx("premium", { plan: "premium", expires_at: null, is_active: true });
    await renderMinhaConta();
    expect(screen.getByText("Gerenciar assinatura")).toBeTruthy();
    expect(screen.getByText("Cancelar assinatura")).toBeTruthy();
  });

  it("plano start mantém aviso gratuito", async () => {
    subState = makeSubscriptionCtx("start", null);
    await renderMinhaConta();
    expect(screen.getByText(/plano gratuito/)).toBeTruthy();
  });
});

// ------------------------------------------------------------------ Planos
describe("Planos — promoção encerrada para novas contratações", () => {
  it("promo vigente: Premium incluído e nenhum checkout ao clicar", async () => {
    subState = makeSubscriptionCtx("promo_grupo_sc", {
      plan: "promo_grupo_sc",
      expires_at: FUTURE,
      is_active: true,
    });
    await renderPlanos();
    const btn = screen.getByText("Incluído na sua promoção").closest("button")!;
    expect(btn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(btn);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Assinar Premium/)).toBeNull();
  });

  it("não existe card/preço/oferta nova da promoção para Start nem deslogado", async () => {
    subState = makeSubscriptionCtx("start", null);
    const { unmount } = await renderPlanos();
    expect(screen.queryByText(/Grupo SC/i)).toBeNull();
    unmount();
    cleanup();

    authState = { user: null, loading: false };
    subState = makeSubscriptionCtx("start", null);
    await renderPlanos();
    expect(screen.queryByText(/Grupo SC/i)).toBeNull();
    expect(screen.getByText("Assinar Premium")).toBeTruthy();
  });

  it("promoção expirada volta às opções tradicionais sem cobrança automática", async () => {
    subState = makeSubscriptionCtx("promo_grupo_sc", {
      plan: "promo_grupo_sc",
      expires_at: PAST,
      is_active: true,
    });
    await renderPlanos();
    expect(screen.queryByText("Incluído na sua promoção")).toBeNull();
    expect(screen.getByText("Fazer upgrade para Premium")).toBeTruthy();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("durante carregamento não permite compra nem mostra 'gratuito'", async () => {
    authState = { user: { id: "u1", email: "a@b.c" }, loading: true };
    subState = makeSubscriptionCtx("start", null, { loading: true });
    await renderPlanos();
    const buttons = screen.getAllByText("Carregando…");
    expect(buttons.length).toBe(2);
    fireEvent.click(buttons[0].closest("button")!);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("colaborador com plano herdado não inicia cobrança própria", async () => {
    subState = makeSubscriptionCtx("premium", { plan: "premium" }, { planInherited: true });
    await renderPlanos();
    const btn = screen.getAllByText("Plano da conta principal")[0].closest("button")!;
    expect(btn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(btn);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------- UpgradeDialog
describe("UpgradeDialog — promoção encerrada para novas contratações", () => {
  it("promo vigente marca Premium como incluído e não chama checkout", async () => {
    subState = makeSubscriptionCtx("promo_grupo_sc", {
      plan: "promo_grupo_sc",
      expires_at: FUTURE,
      is_active: true,
    });
    await renderUpgradeDialog();
    const btn = screen.getByText("Incluído na sua promoção").closest("button")!;
    expect(btn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(btn);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("promo expirada permite upgrade tradicional apenas por clique explícito", async () => {
    subState = makeSubscriptionCtx("promo_grupo_sc", {
      plan: "promo_grupo_sc",
      expires_at: PAST,
      is_active: true,
    });
    await renderUpgradeDialog();
    expect(invokeMock).not.toHaveBeenCalled();
    const btn = screen.getAllByText("Fazer Upgrade")[0].closest("button")!;
    expect(btn.hasAttribute("disabled")).toBe(false);
  });

  it("carregamento bloqueia checkout", async () => {
    authState = { user: { id: "u1", email: "a@b.c" }, loading: true };
    subState = makeSubscriptionCtx("start", null, { loading: true });
    await renderUpgradeDialog();
    const btn = screen.getAllByText("Carregando…")[0].closest("button")!;
    expect(btn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(btn);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("premium tradicional continua marcado como plano atual", async () => {
    subState = makeSubscriptionCtx("premium", { plan: "premium", is_active: true });
    await renderUpgradeDialog();
    expect(screen.getByText("Plano Atual")).toBeTruthy();
  });
});
