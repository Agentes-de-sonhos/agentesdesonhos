/**
 * Runtime real: a árvore AUTENTICADA da gestão do SiteLab monta com um único
 * router/workspace ativo. Antes desta correção o painel era montado dentro do
 * WorkspaceGate do App (router externo) e o React Router lançava o invariant
 * "Router dentro de Router" — em produção sem mensagem.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Component, type ReactNode, useEffect } from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isSiteLabAdminPath, SITELAB_BASE_PATH } from "@/lib/sitelabModels";

/** Contador de instâncias do WorkspaceProvider durante o teste. */
const workspaceMounts = { count: 0 };

vi.mock("@/workspace/WorkspaceProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/workspace/WorkspaceProvider")>();
  return {
    ...actual,
    WorkspaceProvider: (props: Parameters<typeof actual.WorkspaceProvider>[0]) => {
      /* Conta INSTÂNCIAS MONTADAS (effect roda uma vez por montagem). */
      useEffect(() => {
        workspaceMounts.count += 1;
      }, []);
      return <actual.WorkspaceProvider {...props} />;
    },
  };
});

vi.mock("@/lib/sitelabAccess", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sitelabAccess")>();
  return { ...actual, hasSitelabAccess: () => true };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: null, error: null })),
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    })),
    auth: {
      getUser: async () => ({ data: { user: null } }),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock("@/lib/agencyDomains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agencyDomains")>();
  return { ...actual, fetchAgencyDomain: async () => null };
});

const PORTAL = {
  user_id: "tech-user",
  agency_slug: "sitelab-base",
  hostname: "sitelab.local",
  is_primary: true,
  agency_name: "Site Lab Base",
  owner_name: "Site Lab Base",
  logo_url: null,
  cover_image_url: null,
  primary_color: "#4B2A6E",
  secondary_color: "#FFD600",
  tertiary_color: "#F3EFF7",
  phone: null,
  city: null,
  state: null,
  bio: null,
  public_slug: "sitelab-base",
  cnpj: null,
  admin_portal_enabled: true,
};

vi.mock("@/lib/agencyAdmin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agencyAdmin")>();
  return {
    ...actual,
    fetchAgencyAdminPortal: async () => PORTAL,
    checkAgencyAdminAccess: async () => true,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: { id: "tech-user" }, loading: false, signOut: async () => {} }),
}));
vi.mock("@/contexts/TeamSessionContext", () => ({
  TeamSessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTeamSession: () => ({ session: null, loading: false }),
}));
vi.mock("@/hooks/useSubscription", () => ({
  SubscriptionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSubscription: () => ({ plan: "premium", loading: false }),
}));

/* O layout real do painel puxa a plataforma inteira: aqui basta o markup mínimo
   que prova que a árvore autenticada montou dentro do workspace. */
vi.mock("@/components/whitelabel/admin/AgencyAdminLayout", () => ({
  AgencyAdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="agency-admin-layout">{children}</div>
  ),
}));
vi.mock("@/pages/whitelabel/admin/AgencyAdminHome", () => ({
  default: () => <div data-testid="agency-admin-home">painel</div>,
}));

const ORIGINAL_LOCATION = Object.getOwnPropertyDescriptor(window, "location");

function setPath(pathname: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      hostname: "app.agentesdesonhos.com.br",
      pathname,
      search: "",
      hash: "",
      href: `https://app.agentesdesonhos.com.br${pathname}`,
      origin: "https://app.agentesdesonhos.com.br",
      replace: () => {},
      assign: () => {},
      reload: () => {},
    },
  });
}

class Catcher extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { message: String(error?.message || error) };
  }
  render() {
    if (this.state.message) return <div data-testid="boundary">{this.state.message}</div>;
    return this.props.children;
  }
}

async function renderAdminEntry(wrapInRouter = false, catchErrors = false) {
  const { default: SiteLabAdminEntry } = await import("@/pages/sitelab/SiteLabAdminEntry");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (
    <QueryClientProvider client={client}>
      <SiteLabAdminEntry />
    </QueryClientProvider>
  );
  const inner = catchErrors ? <Catcher>{tree}</Catcher> : tree;
  return render(wrapInRouter ? <BrowserRouter>{inner}</BrowserRouter> : inner);
}

describe("SiteLab /gestao — árvore autenticada com um único router", { timeout: 30000 }, () => {
  beforeEach(() => {
    workspaceMounts.count = 0;
    setPath(`${SITELAB_BASE_PATH}/gestao`);
  });

  afterEach(() => {
    cleanup();
    if (ORIGINAL_LOCATION) Object.defineProperty(window, "location", ORIGINAL_LOCATION);
  });

  it("monta o painel real sem erro de render e com um único WorkspaceProvider", async () => {
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args[0]);
    });

    await renderAdminEntry();

    await waitFor(() => expect(screen.getByTestId("agency-admin-home")).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.getByTestId("agency-admin-layout")).toBeInTheDocument();
    expect(workspaceMounts.count).toBe(1);
    expect(errors.map(String).join("\n")).not.toMatch(/cannot render a <Router> inside/i);
    /* O fallback do ErrorBoundary global nunca aparece. */
    expect(screen.queryByText("Algo deu errado")).toBeNull();
    spy.mockRestore();
  });

  it("subrota /gestao/reservas preserva o prefixo do laboratório", async () => {
    setPath(`${SITELAB_BASE_PATH}/gestao/reservas`);
    await renderAdminEntry();
    await waitFor(
      () => expect(screen.getByRole("heading", { name: "Reservas" })).toBeInTheDocument(),
      { timeout: 15000 },
    );
    expect(workspaceMounts.count).toBe(1);
    expect(window.location.pathname.startsWith(`${SITELAB_BASE_PATH}/gestao`)).toBe(true);
  });

  it("o mesmo painel DENTRO de um router externo quebra — por isso o ramo fica fora do router do App", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await renderAdminEntry(true, true);
    await waitFor(() => expect(screen.getByTestId("boundary")).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.getByTestId("boundary").textContent).toMatch(/Router/i);
    spy.mockRestore();
  });
});

describe("SiteLab — helper central de rota da gestão", () => {
  it("reconhece a gestão e as subrotas, e ignora as outras visões", () => {
    expect(isSiteLabAdminPath("/sitelab-base/gestao")).toBe(true);
    expect(isSiteLabAdminPath("/sitelab-base/gestao/")).toBe(true);
    expect(isSiteLabAdminPath("/sitelab-base/gestao/login")).toBe(true);
    expect(isSiteLabAdminPath("/sitelab-base/gestao/reservas/123")).toBe(true);
    expect(isSiteLabAdminPath("/sitelab-base")).toBe(false);
    expect(isSiteLabAdminPath("/sitelab-base/area-do-cliente")).toBe(false);
    expect(isSiteLabAdminPath("/gestao")).toBe(false);
  });
});
