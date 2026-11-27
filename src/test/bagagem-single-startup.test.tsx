import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgencyDomainGate } from "@/components/routing/AgencyDomainGate";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("@/lib/agencyDomains", async (original) => ({
  ...await original<typeof import("@/lib/agencyDomains")>(),
  fetchAgencyDomain: lookup,
}));
vi.mock("@/components/routing/AgencyDomainRoutes", () => ({
  default: ({ onStartupReady }: { onStartupReady?: () => void }) => <button onClick={onStartupReady}>Página pronta</button>,
}));
const locationDescriptor = Object.getOwnPropertyDescriptor(window, "location")!;
afterEach(() => { cleanup(); Object.defineProperty(window, "location", locationDescriptor); });

function renderGate(pathname: string) {
  Object.defineProperty(window, "location", { configurable: true, value: { hostname: "bagagemnamao.com.br", pathname, search: "", hash: "", protocol: "https:" } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AgencyDomainGate><p>Plataforma</p></AgencyDomainGate></QueryClientProvider>);
}

it("mantém o mesmo nó branco enquanto chega o domínio e a rota, e só o remove quando a página está pronta", async () => {
  let resolveDomain!: (value: object) => void;
  lookup.mockReturnValueOnce(new Promise((resolve) => { resolveDomain = resolve; }));
  const { container } = renderGate("/");
  const splash = container.querySelector("[data-bagagem-startup]");
  expect(splash).toHaveStyle({ backgroundColor: "#fff" });
  expect(splash?.querySelector("img")).toHaveClass("animate-brand-breathe");
  resolveDomain({ hostname: "bagagemnamao.com.br", agency_name: "Bagagem na Mão Viagens", user_id: "fixture", phone: null });
  const ready = await screen.findByRole("button", { name: "Página pronta" });
  expect(container.querySelectorAll("[data-bagagem-startup]")).toHaveLength(1);
  expect(container.querySelector("[data-bagagem-startup]")).toBe(splash);
  fireEvent.click(ready);
  await waitFor(() => expect(container.querySelector("[data-bagagem-startup]")).toBeNull());
  expect(ready).toBeInTheDocument();
});

it("não exibe tela de abertura fora da página inicial da Bagagem", async () => {
  lookup.mockResolvedValueOnce({ hostname: "bagagemnamao.com.br", agency_name: "Bagagem na Mão Viagens", user_id: "fixture", phone: null });
  const { container } = renderGate("/blog");
  expect(container.querySelector("[data-bagagem-startup]")).toBeNull();
  await screen.findByRole("button", { name: "Página pronta" });
  expect(container.querySelector("[data-bagagem-startup]")).toBeNull();
});
