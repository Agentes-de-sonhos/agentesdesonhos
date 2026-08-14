import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { PREVIEW_MAX_TTL_MS, previewStorageKey } from "@/lib/agencyPreviewAccess";

const verifyMock = vi.fn();

vi.mock("@/lib/agencyPreviewAccess", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agencyPreviewAccess")>();
  return { ...actual, verifyPreviewPassword: (...args: unknown[]) => verifyMock(...args) };
});

vi.mock("@/components/whitelabel/AgencySiteLayout", () => ({
  AgencySiteLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/pages/whitelabel/AgencySiteHome", () => ({
  default: () => <div data-testid="agency-site-home">home white label</div>,
}));

const TENANT = "100limites.tur.br";

const info: AgencyDomainInfo = {
  user_id: "u1",
  agency_slug: "100-limites-viagens",
  hostname: TENANT,
  is_primary: true,
  agency_name: "100 Limites Viagens",
  owner_name: null,
  logo_url: null,
  cover_image_url: null,
  primary_color: "#F40000",
  phone: null,
  city: null,
  state: null,
  bio: null,
  public_slug: "100-limites-viagens",
  cnpj: null,
};

/** Simula o preview técnico do Lovable: a Origin não é o domínio do tenant. */
function setTechnicalPreviewLocation() {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      hostname: "id-preview--abc.lovable.app",
      pathname: "/preview",
      search: `?__agency_host=${TENANT}`,
      href: `https://id-preview--abc.lovable.app/preview?__agency_host=${TENANT}`,
      reload: () => {},
    },
  });
}

const ORIGINAL_LOCATION = Object.getOwnPropertyDescriptor(window, "location");

async function renderGate() {
  const { default: AgencyPreviewGate } = await import("@/pages/whitelabel/AgencyPreviewGate");
  return render(<AgencyPreviewGate info={info} />);
}

async function login() {
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "qualquer" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Acessar preview/i }));
  });
}

beforeEach(() => {
  verifyMock.mockReset();
  verifyMock.mockResolvedValue({ ok: true });
  window.sessionStorage.clear();
  setTechnicalPreviewLocation();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
  if (ORIGINAL_LOCATION) Object.defineProperty(window, "location", ORIGINAL_LOCATION);
});

describe("host canônico do tenant", () => {
  it("usa info.hostname (não window.location) para verificar a senha e escopar o grant", async () => {
    await renderGate();
    await login();

    expect(verifyMock).toHaveBeenCalledWith(TENANT, "qualquer");
    expect(screen.getByTestId("agency-site-home")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(previewStorageKey(TENANT))).toBeTruthy();
    expect(window.sessionStorage.getItem(previewStorageKey("id-preview--abc.lovable.app"))).toBeNull();
  });

  it("o logout limpa o grant do host canônico e volta à tela de senha", async () => {
    await renderGate();
    await login();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Sair do preview/i }));
    });
    expect(window.sessionStorage.getItem(previewStorageKey(TENANT))).toBeNull();
    expect(screen.queryByTestId("agency-site-home")).toBeNull();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });
});

describe("expiração real com a aba aberta", () => {
  it("desautoriza exatamente no vencimento, sem recarregar a página", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderGate();
    await login();
    expect(screen.getByTestId("agency-site-home")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(PREVIEW_MAX_TTL_MS - 1000);
    });
    expect(screen.getByTestId("agency-site-home")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(screen.queryByTestId("agency-site-home")).toBeNull();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(previewStorageKey(TENANT))).toBeNull();
  });

  it("um grant já expirado não autoriza a montagem", async () => {
    const past = Date.now() - 1000;
    window.sessionStorage.setItem(
      previewStorageKey(TENANT),
      JSON.stringify({ h: TENANT, exp: past }),
    );
    await renderGate();
    expect(screen.queryByTestId("agency-site-home")).toBeNull();
    expect(window.sessionStorage.getItem(previewStorageKey(TENANT))).toBeNull();
  });
});
