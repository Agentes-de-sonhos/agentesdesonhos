import { describe, it, expect, vi } from "vitest";
import {
  PERSONAL_CRM_TAB_PATH,
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

  it("abre uma única aba nomeada após login real com senha", () => {
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
    expect(open).toHaveBeenCalledWith(PERSONAL_CRM_TAB_PATH, PERSONAL_CRM_TAB_TARGET);
    expect(focus).toHaveBeenCalledOnce();

    // refresh / navegação interna / restauração de sessão na mesma aba
    const second = openPersonalCrmAfterPasswordLogin({
      userId: PERSONAL_CRM_TAB_USER_ID,
      storage,
      isImpersonating: false,
      open,
    });
    expect(second).toBe("already-opened");
    expect(open).toHaveBeenCalledTimes(1);
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

  it("sinaliza pop-up bloqueado sem entrar em loop", () => {
    const open = vi.fn(() => null);
    const storage = makeStorage();
    expect(
      openPersonalCrmAfterPasswordLogin({ userId: PERSONAL_CRM_TAB_USER_ID, storage, isImpersonating: false, open }),
    ).toBe("blocked");
    // segunda tentativa não repete a abertura automática
    expect(
      openPersonalCrmAfterPasswordLogin({ userId: PERSONAL_CRM_TAB_USER_ID, storage, isImpersonating: false, open }),
    ).toBe("already-opened");
    expect(open).toHaveBeenCalledTimes(1);
    expect(openPersonalCrmFromFallback(open)).toBe(false);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("permite nova abertura depois do logout limpar o controle compartilhado", () => {
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
