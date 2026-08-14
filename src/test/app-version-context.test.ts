import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isPublicUpdateContext } from "@/hooks/useAppVersion";

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
});

describe("useAppVersion — no polling in white-label context", () => {
  const fetchSpy = vi.fn();
  let addSpy: ReturnType<typeof vi.spyOn>;
  let intervalSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy.mockReset();
    (globalThis as any).fetch = fetchSpy;
    (globalThis as any).__APP_VERSION__ = "1.0.0";
    addSpy = vi.spyOn(document, "addEventListener");
    intervalSpy = vi.spyOn(window, "setInterval");
  });

  afterEach(() => {
    addSpy.mockRestore();
    intervalSpy.mockRestore();
    delete (globalThis as any).__APP_VERSION__;
  });

  it("does not fetch /version.json, set intervals nor listen to visibilitychange", async () => {
    setLocation("https://exemploagencia.com/");
    const { renderHook } = await import("@testing-library/react");
    const { result } = renderHook(() => {
      const mod = require("@/hooks/useAppVersion");
      return mod.useAppVersion();
    });
    expect(result.current.updateAvailable).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(intervalSpy).not.toHaveBeenCalled();
    expect(addSpy.mock.calls.some((c) => c[0] === "visibilitychange")).toBe(false);
  });
});
