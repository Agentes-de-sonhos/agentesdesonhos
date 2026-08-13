import { describe, it, expect } from "vitest";
import {
  buildSystemSignature,
  getEffectiveCommercialSignature,
  isSystemSignatureEffective,
  isSystemSignatureId,
  resolveSnapshotSignature,
  systemSignatureId,
} from "@/lib/effectiveSignature";
import type { CommercialSignature } from "@/types/signature";

const OWNER = "11111111-1111-1111-1111-111111111111";
const OTHER_OWNER = "22222222-2222-2222-2222-222222222222";
const MEMBER = "33333333-3333-3333-3333-333333333333";

const base = { user_id: OWNER, name: "Fernando Nobre", phone: "11988887777", avatar_url: null, email: "titular@ag.com" };

function custom(over: Partial<CommercialSignature> = {}): CommercialSignature {
  return {
    id: "sig-1", user_id: OWNER, name: "Consultora Ana", title: "Consultora",
    phone: "11999990000", whatsapp: "11999990000", email: "ana@ag.com",
    photo_url: null, custom_message: null, display_order: 0,
    is_active: true, is_default: false, created_at: "", updated_at: "", ...over,
  };
}

describe("automatic (registration) signature", () => {
  it("builds from the agency holder data", () => {
    const sys = buildSystemSignature(OWNER, base)!;
    expect(sys.id).toBe(systemSignatureId(OWNER));
    expect(sys.name).toBe("Fernando Nobre");
    expect(sys.phone).toBe("11988887777");
    expect(sys.whatsapp).toBe(sys.phone); // same single source, never duplicated visually
    expect(sys.email).toBe("titular@ag.com");
    expect(sys.is_active).toBe(true);
  });

  it("never invents missing data", () => {
    const sys = buildSystemSignature(OWNER, { ...base, phone: null, email: null })!;
    expect(sys.phone).toBeNull();
    expect(sys.whatsapp).toBeNull();
    expect(sys.email).toBeNull();
  });

  it("returns null without holder or name", () => {
    expect(buildSystemSignature(null, base)).toBeNull();
    expect(buildSystemSignature(OWNER, { ...base, name: "  " })).toBeNull();
  });

  it("is virtual and deterministic (no duplicates per agency)", () => {
    const a = buildSystemSignature(OWNER, base)!;
    const b = buildSystemSignature(OWNER, base)!;
    expect(a.id).toBe(b.id);
    expect(isSystemSignatureId(a.id)).toBe(true);
  });

  it("tracks holder data updates", () => {
    const updated = buildSystemSignature(OWNER, { ...base, name: "Fernando N.", phone: "11900001111" })!;
    expect(updated.name).toBe("Fernando N.");
    expect(updated.whatsapp).toBe("11900001111");
  });

  it("is isolated per agency", () => {
    const a = buildSystemSignature(OWNER, base)!;
    const b = buildSystemSignature(OTHER_OWNER, { ...base, user_id: OTHER_OWNER, name: "Outra Agência" })!;
    expect(a.id).not.toBe(b.id);
    expect(b.user_id).toBe(OTHER_OWNER);
    // holder is the agency, never the logged-in member
    expect(a.user_id).not.toBe(MEMBER);
  });
});

describe("getEffectiveCommercialSignature", () => {
  const sys = buildSystemSignature(OWNER, base)!;

  it("agency without custom signatures uses the automatic one", () => {
    expect(getEffectiveCommercialSignature({ signatures: [], systemSignature: sys })!.id).toBe(sys.id);
    expect(isSystemSignatureEffective({ signatures: [], systemSignature: sys })).toBe(true);
  });

  it("custom signatures without explicit default keep the automatic one", () => {
    const list = [custom(), custom({ id: "sig-2", name: "Bruno" })];
    expect(getEffectiveCommercialSignature({ signatures: list, systemSignature: sys })!.id).toBe(sys.id);
  });

  it("explicit custom default wins", () => {
    const list = [custom(), custom({ id: "sig-2", name: "Bruno", is_default: true })];
    const eff = getEffectiveCommercialSignature({ signatures: list, systemSignature: sys })!;
    expect(eff.id).toBe("sig-2");
    expect(isSystemSignatureEffective({ signatures: list, systemSignature: sys })).toBe(false);
  });

  it("only one effective default even with inconsistent data", () => {
    const list = [custom({ id: "sig-a", is_default: true }), custom({ id: "sig-b", is_default: true })];
    const eff = getEffectiveCommercialSignature({ signatures: list, systemSignature: sys })!;
    expect([eff.id]).toHaveLength(1);
    expect(eff.id).toBe("sig-a");
  });

  it("falls back to the automatic one when the custom default is deactivated", () => {
    const list = [custom({ is_default: true, is_active: false })];
    expect(getEffectiveCommercialSignature({ signatures: list, systemSignature: sys })!.id).toBe(sys.id);
  });

  it("falls back to the automatic one when the custom default is deleted", () => {
    expect(getEffectiveCommercialSignature({ signatures: [], systemSignature: sys })!.id).toBe(sys.id);
  });

  it("never leaves an agency without an effective signature when holder data exists", () => {
    expect(getEffectiveCommercialSignature({ signatures: null, systemSignature: sys })).not.toBeNull();
  });

  it("returns null only when there is no data at all", () => {
    expect(getEffectiveCommercialSignature({ signatures: [], systemSignature: null })).toBeNull();
  });
});

describe("document snapshots", () => {
  const sys = buildSystemSignature(OWNER, base)!;

  it("resolves a system snapshot to the live automatic signature", () => {
    const resolved = resolveSnapshotSignature({ id: sys.id, name: "old name" }, [], sys);
    expect(resolved?.name).toBe("Fernando Nobre");
  });

  it("resolves a custom snapshot to the stored signature", () => {
    const list = [custom()];
    expect(resolveSnapshotSignature({ id: "sig-1", name: "x" }, list, sys)?.name).toBe("Consultora Ana");
  });

  it("returns null for unknown snapshots (legacy documents keep their snapshot)", () => {
    expect(resolveSnapshotSignature({ id: "gone", name: "x" }, [], sys)).toBeNull();
    expect(resolveSnapshotSignature(null, [], sys)).toBeNull();
  });
});
