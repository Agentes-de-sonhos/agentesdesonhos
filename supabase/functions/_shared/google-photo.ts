// Resolves a Google Places Photo API URL to its final googleusercontent.com URL.
// Google's place/photo endpoint returns a 302 redirect to a long-lived
// lh3.googleusercontent.com URL that does NOT require the API key and does NOT
// expire when the underlying photo_reference rotates. Storing the final URL
// instead of the raw place/photo URL avoids both API-key exposure in public
// HTML and breakage when references are invalidated.
export async function resolveGooglePlacePhotoUrl(
  photoReference: string,
  apiKey: string,
  maxwidth = 1600,
): Promise<string | null> {
  if (!photoReference || !apiKey) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=${maxwidth}` +
      `&photo_reference=${encodeURIComponent(photoReference)}` +
      `&key=${apiKey}`;
    const resp = await fetch(url, { redirect: "manual" });
    const loc = resp.headers.get("location") || resp.headers.get("Location");
    if (loc && /^https:\/\//i.test(loc)) return loc;
    return null;
  } catch (e) {
    console.warn("resolveGooglePlacePhotoUrl failed", e);
    return null;
  }
}
