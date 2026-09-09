import { mapQuoteServiceToTripService } from "@/utils/quoteToTrip";
import type { QuoteService } from "@/types/quote";
import type { TripServiceData, TripServiceType } from "@/types/trip";

export interface PackageServiceInput {
  service_type: string;
  service_data: Record<string, any>;
  option_label?: string | null;
  description?: string | null;
}

export interface MappedTripService {
  type: TripServiceType;
  data: TripServiceData;
  image_url: string | null;
}

/**
 * Converte um serviço identificado pela importação de pacote (formato de
 * orçamento) no serviço equivalente da carteira digital, reutilizando o
 * mapeador oficial `mapQuoteServiceToTripService`.
 *
 * Nada é gravado em tabelas de orçamento: o objeto abaixo é apenas um envelope
 * em memória para reaproveitar o mapeamento existente.
 */
export function packageServiceToTripService(input: PackageServiceInput): MappedTripService | null {
  const envelope = {
    id: "",
    quote_id: "",
    service_type: input.service_type,
    service_data: input.service_data,
    option_label: input.option_label ?? null,
    description: input.description ?? null,
    image_url: (input.service_data as any)?.image_url ?? null,
    image_urls: (input.service_data as any)?.image_urls ?? null,
  } as unknown as QuoteService;
  return mapQuoteServiceToTripService(envelope);
}

/** Grava um serviço confirmado diretamente em `trip_services`. */
export async function insertPackageServiceIntoTrip(
  supabase: any,
  tripId: string,
  input: PackageServiceInput,
  orderIndex: number,
): Promise<boolean> {
  const mapped = packageServiceToTripService(input);
  if (!mapped) return false;
  const { error } = await supabase.from("trip_services").insert({
    trip_id: tripId,
    service_type: mapped.type,
    service_data: mapped.data as any,
    image_url: mapped.image_url,
    attachments: [] as any,
    order_index: orderIndex,
  });
  if (error) throw error;
  return true;
}
