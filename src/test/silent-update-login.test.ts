import { describe, it, expect } from "vitest";
import { shouldSilentUpdate } from "@/hooks/useAppVersion";
const base = { flagActive: true, flagVersion: "v2", currentVersion: "v1", lastAttemptVersion: null };
describe("atualização silenciosa no login", () => {
  it("atualiza quando há versão nova", () => expect(shouldSilentUpdate(base)).toBe(true));
  it("não atualiza se já está na versão", () => expect(shouldSilentUpdate({ ...base, currentVersion: "v2" })).toBe(false));
  it("tenta só uma vez por versão", () => expect(shouldSilentUpdate({ ...base, lastAttemptVersion: "v2" })).toBe(false));
  it("não atualiza com aviso desligado", () => expect(shouldSilentUpdate({ ...base, flagActive: false })).toBe(false));
});
