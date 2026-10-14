import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { isPublicUpdateContext, resolveUpdatePrompt, useAppVersion } from "@/hooks/useAppVersion";

const ORIGINAL_LOCATION_DESCRIPTOR = Object.getOwnPropertyDescriptor(window, "location");

function setLocation(href: string) {
  const url = new URL(href);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      href: url.href,
      reload: () => {},
    },
  });
}

function restoreLocation() {
  if (ORIGINAL_LOCATION_DESCRIPTOR) {
    Object.defineProperty(window, "location", ORIGINAL_LOCATION_DESCRIPTOR);
  }
}

afterEach(() => {
  restoreLocation();
});

describe("isPublicUpdateContext — white label suppression", () => {
  it("suppresses generic custom domains on .com", () => {
    setLocation("https://exemploagencia.com/");
    expect(isPublicUpdateContext()).toBe(true);
  });

  it("suppresses generic custom domains on .com.br", () => {
    setLocation("https://www.exemploagencia.com.br/");
    expect(isPublicUpdateContext()).toBe(true);
  });

  it("suppresses generic custom domains on .tur.br", () => {
    setLocation("https://exemploagencia.tur.br/");
    expect(isPublicUpdateContext()).toBe(true);
  });

  it("suppresses the white-label preview mode on a technical host", () => {
    setLocation("https://id-preview--abc.lovable.app/dashboard?__agency_host=exemploagencia.com");
    expect(isPublicUpdateContext()).toBe(true);
  });

  it("keeps the modal allowed on official platform hosts and internal routes", () => {
    setLocation("https://app.agentesdesonhos.com.br/dashboard");
    expect(isPublicUpdateContext()).toBe(false);
    setLocation("https://agentedesonhoproject.lovable.app/crm");
    expect(isPublicUpdateContext()).toBe(false);
    setLocation("http://localhost:8080/financeiro");
    expect(isPublicUpdateContext()).toBe(false);
  });

  it("keeps suppressing existing public platform routes", () => {
    for (const path of ["/roteiro/ABC", "/orcamento/ABC", "/viagem/ABC", "/planos", "/lp/x", "/minha-agencia/ofertas"]) {
      setLocation(`https://app.agentesdesonhos.com.br${path}`);
      expect(isPublicUpdateContext(), path).toBe(true);
    }
  });

  it("suppresses Site Lab demo routes on the main host", () => {
    for (const path of ["/sitelab-base", "/sitelab-base/area-do-cliente", "/sitelab-base/gestao"]) {
      setLocation(`https://app.agentesdesonhos.com.br${path}`);
      expect(isPublicUpdateContext(), path).toBe(true);
    }
  });

  it("suppresses agency client area and public agency surfaces", () => {
    for (const path of ["/area-do-cliente", "/area-do-cliente/viagens/1", "/gestao/login"]) {
      setLocation(`https://app.agentesdesonhos.com.br${path}`);
      expect(isPublicUpdateContext(), path).toBe(true);
      setLocation(`https://exemploagencia.com.br${path}`);
      expect(isPublicUpdateContext(), `agency ${path}`).toBe(true);
    }
  });

  it("allows the white-label agency management panel (/gestao)", () => {
    for (const path of ["/gestao", "/gestao/clientes", "/minha-agencia/gestao/financeiro"]) {
      setLocation(`https://exemploagencia.com.br${path}`);
      expect(isPublicUpdateContext(), `agency ${path}`).toBe(false);
    }
    setLocation("https://exemploagencia.com.br/minha-agencia/gestao/login");
    expect(isPublicUpdateContext()).toBe(true);
  });

  it("keeps the main platform CRM management route eligible", () => {
    setLocation("https://app.agentesdesonhos.com.br/gestao-clientes/funil");
    expect(isPublicUpdateContext()).toBe(false);
  });
});


describe("useAppVersion — no polling in white-label context", () => {
  const fetchSpy = vi.fn();
  let originalFetch: typeof globalThis.fetch;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let intervalSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy.mockReset();
    originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchSpy;
    (globalThis as any).__APP_VERSION__ = "1.0.0";
    addSpy = vi.spyOn(document, "addEventListener");
    intervalSpy = vi.spyOn(window, "setInterval");
  });

  afterEach(() => {
    cleanup();
    addSpy.mockRestore();
    intervalSpy.mockRestore();
    (globalThis as any).fetch = originalFetch;
    delete (globalThis as any).__APP_VERSION__;
  });

  it("does not fetch /version.json, set intervals nor listen to visibilitychange", () => {
    setLocation("https://exemploagencia.com/");
    const { result } = renderHook(() => useAppVersion());
    expect(result.current.updateAvailable).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(intervalSpy).not.toHaveBeenCalled();
    expect(addSpy.mock.calls.some((c) => c[0] === "visibilitychange")).toBe(false);
  });
});


describe("resolveUpdatePrompt — pop-up manual de atualização (1x por versão)", () => {
  const base = {
    flagActive: true,
    flagVersion: "2026.10.14-v1",
    currentVersion: "2026.10.13-v1",
    dismissedVersion: null as string | null,
  };

  it("não mostra quando o sinal está inativo", () => {
    expect(resolveUpdatePrompt({ ...base, flagActive: false }).prompt).toBe(false);
  });

  it("não mostra quando a versão ativa já é a versão do app", () => {
    expect(resolveUpdatePrompt({ ...base, currentVersion: "2026.10.14-v1" }).prompt).toBe(false);
  });

  it("mostra o aviso quando há versão nova ativa", () => {
    const decision = resolveUpdatePrompt(base);
    expect(decision.prompt).toBe(true);
    expect(decision.targetVersion).toBe("2026.10.14-v1");
  });

  it("não mostra de novo depois que o usuário fechou o aviso daquela versão", () => {
    expect(resolveUpdatePrompt({ ...base, dismissedVersion: "2026.10.14-v1" }).prompt).toBe(false);
  });

  it("mostra de novo em um release posterior ativado manualmente", () => {
    const decision = resolveUpdatePrompt({
      ...base,
      flagVersion: "2026.11.01-v1",
      dismissedVersion: "2026.10.14-v1",
    });
    expect(decision.prompt).toBe(true);
    expect(decision.targetVersion).toBe("2026.11.01-v1");
  });
});
