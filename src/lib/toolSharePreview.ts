/**
 * Prévia de link (WhatsApp/redes sociais) para orçamento, roteiro e carteira.
 * Título: destino · noites (datas) | cliente · agência. Imagem híbrida:
 * foto do destino quando existir; senão, banner/logotipo oficial da agência.
 */
import { useEffect } from "react";
import { setOgMeta } from "@/lib/ogMeta";
import { resolveAgencySharePreview } from "@/lib/agencySharePreview";

export type ToolShareKind = "quote" | "itinerary" | "wallet";

export interface ToolShareInput {
  kind: ToolShareKind;
  destination?: string | null;
  clientName?: string | null;
  agencyName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  coverImage?: string | null;
  agencyLogo?: string | null;
  hostname?: string | null;
}

function parseYmd(v?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Primeiro nome do cliente (ex.: "Adriana Augusta" → "Adriana"). */
export function firstName(name?: string | null): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function nightsBetween(start?: string | null, end?: string | null): number | null {
  const s = parseYmd(start), e = parseYmd(end);
  if (!s || !e) return null;
  const n = Math.round((e.getTime() - s.getTime()) / 86400000);
  return n > 0 ? n : null;
}

const DESCRIPTIONS: Record<ToolShareKind, (agency: string) => string> = {
  quote: (a) => (a ? `Proposta de viagem personalizada preparada por ${a}.` : "Proposta de viagem personalizada."),
  itinerary: () => "Acompanhe sua programação diária, passeios e dicas da viagem.",
  wallet: () => "Seus vouchers, passagens e documentos de viagem organizados em um só lugar.",
};

export function buildToolSharePreview(input: ToolShareInput) {
  const dest = (input.destination ?? "").trim();
  const client = firstName(input.clientName);
  const agency = (input.agencyName ?? "").trim();
  const s = parseYmd(input.startDate), e = parseYmd(input.endDate);
  const nights = nightsBetween(input.startDate, input.endDate);

  const head: string[] = [];
  if (input.kind === "itinerary") head.push(dest ? `Roteiro ${dest}` : "Roteiro de viagem");
  else if (input.kind === "wallet") head.push(dest ? `Carteira de Viagem · ${dest}` : "Carteira de Viagem");
  else head.push(dest || "Proposta de viagem");
  if (nights) {
    const label = input.kind === "itinerary" ? `${nights + 1} dias` : `${nights} ${nights === 1 ? "noite" : "noites"}`;
    head.push(s && e ? `${label} (${ddmm(s)} a ${ddmm(e)})` : label);
  }

  const tail: string[] = [];
  if (client) tail.push(input.kind === "quote" ? `Proposta ${client}` : client);
  if (agency) tail.push(agency);

  const title = tail.length ? `${head.join(" · ")} | ${tail.join(" · ")}` : head.join(" · ");
  const agencyImage = resolveAgencySharePreview(input.hostname)?.image ?? null;
  const image = input.coverImage || agencyImage || input.agencyLogo || undefined;
  return { title, description: DESCRIPTIONS[input.kind](agency), image };
}

/** Aplica a prévia na página pública quando os dados estiverem prontos. */
export function useToolSharePreview(input: ToolShareInput | null) {
  const key = input ? JSON.stringify(input) : "";
  useEffect(() => {
    if (!input) return;
    const p = buildToolSharePreview({
      ...input,
      hostname: input.hostname ?? (typeof window !== "undefined" ? window.location.hostname : null),
    });
    setOgMeta({ title: p.title, description: p.description, image: p.image });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
