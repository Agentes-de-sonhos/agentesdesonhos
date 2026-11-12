import type { HotelAmenityIcon } from "@/components/hotel-page/types";
import type { ClubMedSnowResort } from ".";

/** Same continuous, three-paragraph presentation as the Brazil resort pages. */
export function snowDescription(resort: ClubMedSnowResort): string[] {
  const reasons = resort.whyChoose.map((reason) => reason.text.trim()).filter(Boolean);
  const size = Math.max(1, Math.ceil(reasons.length / 3));
  const paragraphs: string[] = [];
  for (let i = 0; i < reasons.length; i += size) {
    paragraphs.push(reasons.slice(i, i + size).join(" "));
  }
  return paragraphs;
}

export function snowHighlightIcon(label: string): HotelAmenityIcon {
  const text = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/piscina|onsen|rotenburo|termal/.test(text)) return "pool";
  if (/spa|bem-estar|ioga|yoga|sauna/.test(text)) return "spa";
  if (/crianc|famil|infanti|baby|petit|mini club|teen|adolesc|jardim de neve/.test(text)) return "kids";
  if (/gastronom|restaurante|cozinha|sabores|fondue/.test(text)) return "restaurant";
  if (/bar|apres-ski|festiv/.test(text)) return "bar";
  if (/gondola|teleferico/.test(text)) return "cable-car";
  if (/vista|panoram|paisage|mont blanc/.test(text)) return "view";
  if (/quarto|suite|acomod/.test(text)) return "all-inclusive";
  if (/chale|arquitet|lareira|vilarejo|telhado/.test(text)) return "home";
  if (/concierge|mordomo|servico/.test(text)) return "room-service";
  if (/fitness|escalada|academia/.test(text)) return "gym";
  if (/ski|esqui|snow|pista|powder|raquete/.test(text)) return "snow";
  return "mountain";
}
