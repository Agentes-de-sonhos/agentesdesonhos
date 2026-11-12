import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../supabase/functions/_shared/clubMedGooglePhotoReviews.json", async () => {
  const { createHash } = await import("node:crypto");
  return { default: { pilot: { photos: [{
    uriSha256: createHash("sha256").update("https://lh3.googleusercontent.com/reviewed").digest("hex"),
    authorUri: "https://maps.google.com/maps/contrib/123", credit: "Club Med Pilot", alt: "Quarto revisado",
  }] } } };
});
import { selectReviewedGooglePhotos } from "../../supabase/functions/_shared/clubMedGooglePhotos";

beforeAll(() => vi.stubGlobal("crypto", webcrypto));
const photo = { url: "https://lh3.googleusercontent.com/reviewed", credit: "Club Med Pilot", creditUri: "https://maps.google.com/maps/contrib/123" };
describe("seleção individual das fotos Club Med do Google", () => {
  it("aceita a imagem revisada, com perfil e crédito exatos, sem duplicatas", async () => {
    expect(await selectReviewedGooglePhotos("pilot", [photo, photo])).toEqual([{ ...photo, alt: "Quarto revisado" }]);
  });
  it("rejeita pessoa particular, nome de hotel com perfil diferente e foto sem autoria", async () => {
    expect(await selectReviewedGooglePhotos("pilot", [
      { ...photo, credit: "Viajante" },
      { ...photo, creditUri: "https://maps.google.com/maps/contrib/999" },
      { ...photo, creditUri: null },
    ])).toEqual([]);
  });
  it("não aprova automaticamente foto nova do mesmo perfil nem foto de outro resort", async () => {
    expect(await selectReviewedGooglePhotos("pilot", [{ ...photo, url: "https://lh3.googleusercontent.com/new" }])).toEqual([]);
    expect(await selectReviewedGooglePhotos("other-resort", [photo])).toEqual([]);
  });
});
