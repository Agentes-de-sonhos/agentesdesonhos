import { describe, it, expect, vi } from "vitest";
import {
  PERSONAL_CRM_TAB_PATH,
  PERSONAL_CRM_TAB_USER_ID,
  isPersonalCrmTabUser,
  openPersonalCrmTab,
  hasOpenedPersonalCrmTab,
} from "@/lib/personalCrmTab";

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
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
    const result = openPersonalCrmTab({
      userId: "11111111-2222-3333-4444-555555555555",
      storage,
      pathname: "/dashboard",
      open,
    });
    expect(result).toBe("skipped");
    expect(open).not.toHaveBeenCalled();
    expect(hasOpenedPersonalCrmTab(storage)).toBe(false);
  });

  it("abre a aba do CRM > Oportunidades uma única vez por sessão", () => {
    const open = vi.fn(() => ({}) as Window);
    const storage = makeStorage();

    const first = openPersonalCrmTab({
      userId: PERSONAL_CRM_TAB_USER_ID,
      storage,
      pathname: "/dashboard",
      open,
    });
    expect(first).toBe("opened");
    expect(open).toHaveBeenCalledWith(PERSONAL_CRM_TAB_PATH, "_blank", "noopener,noreferrer");

    // refresh / navegação interna / restauração de sessão na mesma aba
    const second = openPersonalCrmTab({
      userId: PERSONAL_CRM_TAB_USER_ID,
      storage,
      pathname: "/financeiro",
      open,
    });
    expect(second).toBe("already-opened");
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("não duplica quando já está no CRM (retorno do CRM)", () => {
    const open = vi.fn(() => ({}) as Window);
    const storage = makeStorage();
    expect(
      openPersonalCrmTab({
        userId: PERSONAL_CRM_TAB_USER_ID,
        storage,
        pathname: "/gestao-clientes/funil",
        open,
      }),
    ).toBe("skipped");
    expect(
      openPersonalCrmTab({
        userId: PERSONAL_CRM_TAB_USER_ID,
        storage,
        pathname: "/gestao/crm/funil",
        open,
      }),
    ).toBe("skipped");
    expect(open).not.toHaveBeenCalled();
  });

  it("sinaliza pop-up bloqueado sem entrar em loop", () => {
    const open = vi.fn(() => null);
    const storage = makeStorage();
    expect(
      openPersonalCrmTab({ userId: PERSONAL_CRM_TAB_USER_ID, storage, pathname: "/dashboard", open }),
    ).toBe("blocked");
    // segunda tentativa não repete a abertura automática
    expect(
      openPersonalCrmTab({ userId: PERSONAL_CRM_TAB_USER_ID, storage, pathname: "/dashboard", open }),
    ).toBe("already-opened");
    expect(open).toHaveBeenCalledTimes(1);
  });
});
