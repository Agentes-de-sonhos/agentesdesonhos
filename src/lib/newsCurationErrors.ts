/** Traduz erros técnicos da curadoria de notícias em mensagens amigáveis ao admin. */
export function friendlyCurationError(error: unknown): string {
  const raw =
    (typeof error === "object" && error !== null
      ? String((error as { message?: string }).message ?? "")
      : String(error ?? "")) || "";
  const msg = raw.toLowerCase();

  if (msg.includes("not authorized") || msg.includes("permission denied") || msg.includes("row-level security")) {
    return "Você não tem permissão para alterar a curadoria de notícias.";
  }
  if (msg.includes("news not found")) {
    return "Notícia não encontrada. Atualize a lista e tente novamente.";
  }
  if (msg.includes("must be approved and visible")) {
    return "Só é possível destacar notícias aprovadas e visíveis.";
  }
  if (msg.includes("was not published on")) {
    return "A Notícia do Dia precisa ter sido publicada na data selecionada.";
  }
  if (msg.includes("outside the week")) {
    return "A notícia escolhida está fora da semana em curadoria.";
  }
  if (msg.includes("period_start must be a monday")) {
    return "A semana de curadoria deve começar em uma segunda-feira.";
  }
  if (msg.includes("position must be between")) {
    return "A posição deve estar entre 1 e 5.";
  }
  if (msg.includes("position only applies")) {
    return "Posição só se aplica ao Top 5 da semana.";
  }
  if (msg.includes("invalid curation_type")) {
    return "Tipo de curadoria inválido.";
  }
  if (msg.includes("does not exist") || msg.includes("column") || msg.includes("relation") || msg.includes("syntax")) {
    return "Não foi possível salvar a curadoria por uma inconsistência interna. Tente novamente em instantes.";
  }
  if (msg.includes("duplicate key") || msg.includes("unique")) {
    return "Essa notícia já está destacada nesse período.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  return "Não foi possível concluir a ação da curadoria. Tente novamente.";
}
