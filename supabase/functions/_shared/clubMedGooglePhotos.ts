import reviews from "./clubMedGooglePhotoReviews.json" with { type: "json" };

export interface GoogleHotelPhoto { url: string; credit: string; creditUri?: string | null; alt?: string }
interface ReviewedPhoto { uriSha256: string; authorUri: string; credit: string; alt: string }
const reviewed = reviews as Record<string, { photos: ReviewedPhoto[] }>;

/** Exact author AND reviewed image, never a name/prefix or position-based rule.
 * No Google image files, photo names or media URIs are stored in this registry.
 * If a temporary URI changes, it needs review again; fail closed in the meantime.
 */
export async function selectReviewedGooglePhotos(slug: string, photos: GoogleHotelPhoto[] = []): Promise<GoogleHotelPhoto[]> {
  const selection = reviewed[slug]?.photos ?? [];
  if (!selection.length || !Array.isArray(photos)) return [];
  const matches = await Promise.all(photos.map(async (photo) => {
    if (!photo || typeof photo.url !== "string" || !photo.creditUri) return null;
    const authorMatches = selection.filter((item) => item.authorUri === photo.creditUri && item.credit === photo.credit);
    if (!authorMatches.length) return null;
    let url: URL;
    try { url = new URL(photo.url); } catch { return null; }
    if (url.protocol !== "https:" || url.hostname !== "lh3.googleusercontent.com") return null;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(photo.url));
    const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const index = selection.findIndex((item) => item.uriSha256 === hash && item.authorUri === photo.creditUri && item.credit === photo.credit);
    return index < 0 ? null : { index, photo: { ...photo, alt: selection[index].alt } };
  }));
  const result = matches.filter((m): m is NonNullable<typeof m> => m !== null).sort((a, b) => a.index - b.index);
  return [...new Map(result.map((m) => [m.photo.url, m.photo])).values()];
}
