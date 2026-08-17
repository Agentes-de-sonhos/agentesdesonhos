import { useState } from "react";
import { HotelPhotoGallery } from "@/components/quote/HotelPhotoGallery";

export default function DevGalleryHarness() {
  const params = new URLSearchParams(window.location.search);
  const n = Number(params.get("n") || "3");
  const existing = params.get("existing") !== "0";
  const [urls, setUrls] = useState<string[]>(
    Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/h${i}/640/480`),
  );
  return (
    <div className="mx-auto max-w-3xl p-4">
      <HotelPhotoGallery imageUrls={urls} onImageUrlsChange={setUrls} placeId="PLACE_TEST" hasSavedService={existing} />
    </div>
  );
}
