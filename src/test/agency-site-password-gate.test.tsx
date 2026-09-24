import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import {
  isPasswordExemptPath,
  isTenantPasswordProtected,
  readStoredUnlock,
  saveUnlock,
  unlockStorageKey,
  SITE_UNLOCK_TTL_MS,
} from "@/lib/agencySitePassword";

const unlockMock = vi.fn();
const verifyMock = vi.fn();
vi.mock("@/lib/agencySitePassword", async (orig) => {
  const actual = await orig<typeof import("@/lib/agencySitePassword")>();
  return {
    ...actual,
    unlockWithPassword: (...a: unknown[]) => unlockMock(...a),
    verifyUnlockToken: (...a: unknown[]) => verifyMock(...a),
  };
});

const OWNERS = [
  "9433421c-2252-4030-acab-135c03ab009e",
  "4d028510-034f-4c0f-9a33-4275dca0607a",
  "d14b95d2-7eeb-4717-bfca-b76482ddfb4f",
  "4d5a7157-59b6-4329-8768-7f8895e8ce92",
];
const FAE_LIKE = "00000000-0000-0000-0000-000000000001";

const info = (user_id: string): AgencyDomainInfo => ({
  user_id,
  agency_slug: "x",
  hostname: "destinoscomaju.com.br",
  is_primary: true,
  agency_name: "Agência Teste",
  owner_name: null,
  logo_url: null,
  cover_image_url: null,
  primary_color: null,
  phone: null,
  city: null,
  state: null,
  bio: null,
  public_slug: "x",
  cnpj: null,
});

async function renderGate(userId: string, path = "/") {
  const { AgencySitePasswordGate } = await import("@/components/whitelabel/AgencySitePasswordGate");
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AgencySitePasswordGate info={info(userId)}>
        <div data-testid="site">site</div>
      </AgencySitePasswordGate>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  unlockMock.mockReset();
  verifyMock.mockReset();
});
afterEach(() => cleanup());

describe("configuração declarativa", () => {
  it("protege exatamente os quatro tenants", () => {
    OWNERS.forEach((o) => expect(isTenantPasswordProtected(o)).toBe(true));
    expect(isTenantPasswordProtected(FAE_LIKE)).toBe(false);
    expect(isTenantPasswordProtected(null)).toBe(false);
  });
  it("rotas excluídas", () => {
    ["/area-do-cliente", "/area-do-cliente/viagens/1", "/gestao", "/gestao/login", "/orcamento/abc", "/roteiro/abc", "/carteira/abc", "/viagem/abc"].forEach(
      (p) => expect(isPasswordExemptPath(p)).toBe(true),
    );
    ["/", "/ofertas", "/politicasdeprivacidade", "/termosdeuso"].forEach((p) =>
      expect(isPasswordExemptPath(p)).toBe(false),
    );
  });
});

describe("gate", () => {
  it("outros tenants ficam livres", async () => {
    await renderGate(FAE_LIKE);
    expect(screen.getByTestId("site")).toBeInTheDocument();
  });
  it("rota excluída não bloqueia tenant protegido", async () => {
    await renderGate(OWNERS[0], "/gestao/login");
    expect(screen.getByTestId("site")).toBeInTheDocument();
  });
  it("tenant protegido mostra a tela de senha", async () => {
    for (const o of OWNERS) {
      await renderGate(o, "/ofertas");
      expect(screen.getByText("Digite a senha para acessar este site")).toBeInTheDocument();
      expect(screen.queryByTestId("site")).toBeNull();
      cleanup();
    }
  });
  it("senha errada mostra mensagem discreta", async () => {
    unlockMock.mockResolvedValue({ status: "invalid" });
    await renderGate(OWNERS[1]);
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Entrar" })));
    expect(screen.getByText(/Senha incorreta/)).toBeInTheDocument();
    expect(localStorage.getItem(unlockStorageKey(OWNERS[1]))).toBeNull();
  });
  it("indisponibilidade permite tentar novamente", async () => {
    unlockMock.mockResolvedValue({ status: "unavailable" });
    await renderGate(OWNERS[1]);
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "x" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Entrar" })));
    expect(screen.getByText(/Não foi possível validar/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
  it("senha correta guarda somente o token e libera", async () => {
    const exp = Date.now() + SITE_UNLOCK_TTL_MS;
    unlockMock.mockResolvedValue({ status: "ok", token: "p.s", exp });
    await renderGate(OWNERS[2]);
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "segredo-digitado" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Entrar" })));
    expect(screen.getByTestId("site")).toBeInTheDocument();
    const raw = localStorage.getItem(unlockStorageKey(OWNERS[2]))!;
    expect(raw).toContain("p.s");
    expect(raw).not.toContain("segredo-digitado");
  });
  it("token armazenado é verificado no servidor", async () => {
    saveUnlock(OWNERS[3], "tok.sig", Date.now() + 1000 * 60);
    verifyMock.mockResolvedValue({ status: "ok", token: "tok.sig", exp: Date.now() + 60000 });
    await act(async () => {
      await renderGate(OWNERS[3]);
    });
    expect(verifyMock).toHaveBeenCalledWith(OWNERS[3], "tok.sig");
    expect(screen.getByTestId("site")).toBeInTheDocument();
  });
  it("token expirado é descartado", () => {
    localStorage.setItem(unlockStorageKey(OWNERS[0]), JSON.stringify({ token: "a.b", exp: Date.now() - 1 }));
    expect(readStoredUnlock(OWNERS[0])).toBeNull();
    expect(localStorage.getItem(unlockStorageKey(OWNERS[0]))).toBeNull();
    saveUnlock(OWNERS[0], "a.b", Date.now() + SITE_UNLOCK_TTL_MS * 2);
    expect(readStoredUnlock(OWNERS[0])).toBeNull();
  });
});

describe("senha fora do frontend", () => {
  const LITERAL = ["agentes", "2026"].join("");
  function scan(dir: string, out: string[] = []) {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) scan(p, out);
      else if (/\.(tsx?|jsx?|html|json|css)$/.test(f) && readFileSync(p, "utf8").includes(LITERAL)) out.push(p);
    }
    return out;
  }
  it("src e dist não contêm a senha literal", () => {
    expect(scan("src")).toEqual([]);
    if (existsSync("dist")) expect(scan("dist")).toEqual([]);
  });
});
