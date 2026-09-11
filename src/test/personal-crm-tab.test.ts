import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  PERSONAL_CRM_TAB_URL,
  PERSONAL_CRM_TAB_TARGET,
  PERSONAL_CRM_TAB_USER_ID,
  clearPersonalCrmLoginControl,
  isPersonalCrmTabUser,
  openPersonalCrmAfterPasswordLogin,
  openPersonalCrmFromFallback,
  hasOpenedPersonalCrmTab,
} from "@/lib/personalCrmTab";

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("customização individual — segunda aba do CRM", () => {
  it("mantém o gatilho somente no login por senha e fora da área autenticada", () => {
    const authSource = readFileSync("src/pages/Auth.tsx", "utf8");
    const protectedShellSource = readFileSync("src/components/auth/ProtectedShell.tsx", "utf8");
    const authProviderSource = readFileSync("src/hooks/useAuth.tsx", "utf8");

    expect(authSource.match(/openPersonalCrmAfterPasswordLogin\(/g)).toHaveLength(1);
    expect(authSource.indexOf("openPersonalCrmAfterPasswordLogin({")).toBeGreaterThan(authSource.indexOf("const handleLogin"));
    expect(protectedShellSource).not.toContain("PersonalCrmTabLauncher");
    expect(protectedShellSource).not.toContain("openPersonalCrm");
    expect(authProviderSource).toContain('event === "SIGNED_OUT"');
    expect(authProviderSource).not.toContain("openPersonalCrmAfterPasswordLogin");
  });

  it("é exclusiva do UUID autorizado", () => {
    expect(isPersonalCrmTabUser(PERSONAL_CRM_TAB_USER_ID)).toBe(true);
    expect(isPersonalCrmTabUser(PERSONAL_CRM_TAB_USER_ID.toUpperCase())).toBe(true);
    expect(isPersonalCrmTabUser("11111111-2222-3333-4444-555555555555")).toBe(false);
    expect(isPersonalCrmTabUser(null)).toBe(false);
    expect(isPersonalCrmTabUser(undefined)).toBe(false);
  });

  it("não abre nada para outro usuário", () => {
    const open = vi.fn(() => ({}) as Window);
    const storage = makeStorage();
    const result = openPersonalCrmAfterPasswordLogin({
      userId: "11111111-2222-3333-4444-555555555555",
      storage,
      isImpersonating: false,
      open,
    });
    expect(result).toBe("skipped");
    expect(open).not.toHaveBeenCalled();
    expect(hasOpenedPersonalCrmTab(storage)).toBe(false);
  });

  it("abre a aba nomeada após login real com senha, sem duplicar", () => {
    const focus = vi.fn();
    const open = vi.fn(() => ({ focus }) as unknown as Window);
    const storage = makeStorage();

    const first = openPersonalCrmAfterPasswordLogin({
      userId: PERSONAL_CRM_TAB_USER_ID,
      storage,
      isImpersonating: false,
      open,
    });
    expect(first).toBe("opened");
    expect(open).toHaveBeenCalledWith(PERSONAL_CRM_TAB_URL, PERSONAL_CRM_TAB_TARGET);
    expect(focus).toHaveBeenCalledOnce();
    expect(hasOpenedPersonalCrmTab(storage)).toBe(true);

    // Novo login explícito reaproveita SEMPRE o mesmo target nomeado.
    const second = openPersonalCrmAfterPasswordLogin({
      userId: PERSONAL_CRM_TAB_USER_ID,
      storage,
      isImpersonating: false,
      open,
    });
    expect(second).toBe("opened");
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenLastCalledWith(PERSONAL_CRM_TAB_URL, PERSONAL_CRM_TAB_TARGET);
  });

  it("não abre durante impersonação/suporte", () => {
    const open = vi.fn(() => ({}) as Window);
    const storage = makeStorage();
    expect(openPersonalCrmAfterPasswordLogin({
      userId: PERSONAL_CRM_TAB_USER_ID,
      storage,
      isImpersonating: true,
      open,
    })).toBe("skipped");
    expect(open).not.toHaveBeenCalled();
    expect(hasOpenedPersonalCrmTab(storage)).toBe(false);
  });

  it("pop-up bloqueado não marca controle e permite nova tentativa no próximo login", () => {
    const open = vi.fn(() => null);
    const storage = makeStorage();
    const params = { userId: PERSONAL_CRM_TAB_USER_ID, storage, isImpersonating: false, open };

    expect(openPersonalCrmAfterPasswordLogin(params)).toBe("blocked");
    expect(hasOpenedPersonalCrmTab(storage)).toBe(false);
    expect(openPersonalCrmAfterPasswordLogin(params)).toBe("blocked");
    expect(open).toHaveBeenCalledTimes(2);
    expect(openPersonalCrmFromFallback(open)).toBe(false);
    expect(open).toHaveBeenCalledTimes(3);
  });

  it("logout limpa o controle compartilhado", () => {
    const open = vi.fn(() => ({ focus: vi.fn() }) as unknown as Window);
    const storage = makeStorage();
    const params = { userId: PERSONAL_CRM_TAB_USER_ID, storage, isImpersonating: false, open };

    expect(openPersonalCrmAfterPasswordLogin(params)).toBe("opened");
    clearPersonalCrmLoginControl(storage);
    expect(hasOpenedPersonalCrmTab(storage)).toBe(false);
    expect(openPersonalCrmAfterPasswordLogin(params)).toBe("opened");
    expect(open).toHaveBeenCalledTimes(2);
  });
});
