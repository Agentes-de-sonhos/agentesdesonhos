import type { HotelPhoto } from "@/components/hotel-page/types";

export interface OfficialSnowPhoto extends HotelPhoto {
  sourcePage: string;
  rightsReference: string;
  officialSource: true;
  visualReview: "approved";
}

/**
 * Only resort-specific, visually reviewed official media with confirmed rights
 * belongs here. Google photos (including photos credited to a hotel account)
 * must never be used as a fallback. Candidate URLs live in the audit document,
 * outside the public gallery, until rights and visual selection are verified.
 */
export const OFFICIAL_SNOW_PHOTOS: Record<string, OfficialSnowPhoto[]> = {};

export function getClubMedSnowPhotos(slug: string): HotelPhoto[] {
  return (OFFICIAL_SNOW_PHOTOS[slug] ?? []).filter((photo) =>
    photo.officialSource && photo.visualReview === "approved" && !!photo.rightsReference.trim(),
  );
}
