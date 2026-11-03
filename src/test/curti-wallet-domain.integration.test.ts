// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const client = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const code = "3g2mVeFTKPtshm5fNVhP";

describe("Curti wallet owner-domain compatibility (live RPC)", () => {
  it("accepts curti and the legacy curti-viagens slug for the same wallet", async () => {
    const ids: string[] = [];
    for (const slug of ["curti", "curti-viagens"]) {
      const { data, error } = await client.rpc("get_trip_by_public_code", {
        p_agency_slug: slug, p_code: code,
      });
      expect(error).toBeNull();
      const payload = data as { error?: string; trip?: { id: string } };
      expect(payload.error).toBeUndefined();
      expect(payload.trip?.id).toBeTruthy();
      if (payload.trip) ids.push(payload.trip.id);
    }
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  }, 20000);

  it("still requires the password through either Curti slug", async () => {
    for (const slug of ["curti", "curti-viagens"]) {
      const { data, error } = await client.rpc("verify_trip_by_public_code", {
        p_agency_slug: slug, p_code: code, p_password: "",
      });
      expect(error).toBeNull();
      expect(data).toEqual({ error: "Senha inválida" });
    }
  }, 20000);

  it("rejects another agency in both wallet lookup and password verification", async () => {
    const lookup = await client.rpc("get_trip_by_public_code", {
      p_agency_slug: "essyatur", p_code: code,
    });
    const verify = await client.rpc("verify_trip_by_public_code", {
      p_agency_slug: "essyatur", p_code: code, p_password: "",
    });
    expect(lookup.error).toBeNull();
    expect(verify.error).toBeNull();
    expect(lookup.data).toEqual({ error: "Carteira não encontrada" });
    expect(verify.data).toEqual({ error: "Carteira não encontrada" });
  }, 20000);
});