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

function renderGate(pathname: string, hostname = "bagagemnamao.com.br") {
  Object.defineProperty(window, "location", { configurable: true, value: { hostname, pathname, search: "", hash: "", protocol: "https:" } });
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

it.each(["innovati.tur.br", "www.innovati.tur.br"])("mantém uma abertura branca com o logo oficial da Innovati em %s", async (hostname) => {
  let resolveDomain!: (value: object) => void;
  lookup.mockReturnValueOnce(new Promise((resolve) => { resolveDomain = resolve; }));
  const { container } = renderGate("/", hostname);
  const splash = container.querySelector("[data-innovati-startup]");
  expect(splash).toHaveStyle({ backgroundColor: "#fff" });
  const logo = splash?.querySelector("img");
  expect(logo).toHaveAttribute("src", expect.stringContaining("briefing-24-v1-logo.png"));
  expect(logo).toHaveClass("animate-brand-breathe", "motion-reduce:animate-none");
  expect(container.querySelector("[data-bagagem-startup]")).toBeNull();
  resolveDomain({ hostname, agency_name: "Innovati Travel", user_id: "fixture", phone: null });
  const ready = await screen.findByRole("button", { name: "Página pronta" });
  expect(container.querySelector("[data-innovati-startup]")).toBe(splash);
  fireEvent.click(ready);
  await waitFor(() => expect(container.querySelector("[data-innovati-startup]")).toBeNull());
});

it.each(["/ingressos-orlando", "/universal", "/resorts-brasil", "/area-do-cliente"])("não mostra animação de abertura da Innovati em %s", async (path) => {
  const hostname = "www.innovati.tur.br";
  lookup.mockResolvedValueOnce({ hostname, agency_name: "Innovati Travel", user_id: "fixture", phone: null });
  const { container } = renderGate(path, hostname);
  expect(container.querySelector("[data-innovati-startup], .animate-spin, .animate-brand-breathe")).toBeNull();
  await screen.findByRole("button", { name: "Página pronta" });
  expect(container.querySelector("[data-innovati-startup], .animate-spin, .animate-brand-breathe")).toBeNull();
});

it.each(["dricaviagens.com.br", "www.dricaviagens.com.br"])("exibe só uma abertura com a marca da Drica em %s", async (hostname) => {
  let resolveDomain!: (value: object) => void;
  lookup.mockReturnValueOnce(new Promise((resolve) => { resolveDomain = resolve; }));
  const { container } = renderGate("/", hostname);
  const splash = container.querySelector("[data-drica-startup]");
  expect(splash?.querySelector("img")).toHaveAttribute("src", expect.stringContaining("briefing-16-v1-logo.png"));
  expect(splash?.querySelector("img")).toHaveClass("animate-brand-breathe");
  resolveDomain({ hostname, agency_name: "Drica Viagens", user_id: "fixture", phone: null });
  const ready = await screen.findByRole("button", { name: "Página pronta" });
  expect(container.querySelectorAll("[data-drica-startup]")).toHaveLength(1);
  expect(container.querySelector("[data-drica-startup]")).toBe(splash);
  fireEvent.click(ready);
  await waitFor(() => expect(container.querySelector("[data-drica-startup]")).toBeNull());
});

it.each(["/disney", "/universal", "/resorts-brasil", "/area-do-cliente"])("abre %s da Drica sem animação", async (pathname) => {
  const hostname = "www.dricaviagens.com.br";
  lookup.mockResolvedValueOnce({ hostname, agency_name: "Drica Viagens", user_id: "fixture", phone: null });
  const { container } = renderGate(pathname, hostname);
  const animation = "[data-drica-startup], .animate-spin, .animate-brand-breathe";
  expect(container.querySelector(animation)).toBeNull();
  await screen.findByRole("button", { name: "Página pronta" });
  expect(container.querySelector(animation)).toBeNull();
});
