/** Serviço "Outro" marcado como texto informativo: sem valor, sem seleção, fora do contador. */
export function isInfoOnlyService(service: { service_type?: string | null; service_data?: any } | null | undefined): boolean {
  return !!service && service.service_type === "other" && service.service_data?.info_only === true;
}

export function countCommercialServices<T extends { service_type?: string | null; service_data?: any }>(services: T[]): number {
  return services.filter((s) => !isInfoOnlyService(s)).length;
}
