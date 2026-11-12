import type { HotelPhoto } from "@/components/hotel-page/types";
import manifest from "./officialPhotos.json";

export interface OfficialSnowPhoto extends HotelPhoto {
  sourcePage: string;
  reviewedAt: string;
  officialSource: true;
  visualReview: "approved";
}

type OfficialGallery = {
  sourcePage: string;
  reviewedAt: string;
  photos: { asset: string; alt: string }[];
};

/** Manually selected from each resort's official gallery, at the user's request.
 * Attribution identifies the source; it does not assert an open commercial license.
 * Never append Google contributor photos or approve newly discovered images automatically.
 */
export const OFFICIAL_SNOW_PHOTOS: Record<string, OfficialSnowPhoto[]> = Object.fromEntries(
  Object.entries(manifest as Record<string, OfficialGallery>).map(([slug, gallery]) => [
    slug,
    gallery.photos.map((photo) => ({
      url: `https://production.media.dcx.clubmed/?url=${encodeURIComponent(photo.asset)}&format=webp&width=1600&quality=80`,
      alt: photo.alt,
      credit: "Club Med",
      creditUrl: gallery.sourcePage,
      sourcePage: gallery.sourcePage,
      reviewedAt: gallery.reviewedAt,
      officialSource: true as const,
      visualReview: "approved" as const,
    })),
  ]),
);

export function getClubMedSnowPhotos(slug: string): HotelPhoto[] {
  return OFFICIAL_SNOW_PHOTOS[slug] ?? [];
}
