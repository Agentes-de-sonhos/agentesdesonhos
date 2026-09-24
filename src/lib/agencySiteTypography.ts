/**
 * Tipografia responsiva compartilhada pelos sites white label.
 *
 * As classes ampliam a largura útil no desktop e mantêm quebra natural no
 * mobile. Não usam `whitespace-nowrap` nem line-clamp: nenhum conteúdo é
 * cortado quando uma tradução, nome próprio ou viewport exigir mais espaço.
 */
export const AGENCY_SECTION_HEADING_CLASS = "mb-8 w-full md:mb-10";

export const AGENCY_SECTION_TITLE_CLASS =
  "w-full break-words text-pretty text-3xl font-extrabold leading-[1.12] text-foreground md:text-[clamp(2.25rem,3.25vw,2.75rem)] md:leading-[1.08]";

export const AGENCY_SECTION_SUBTITLE_CLASS =
  "mt-4 w-full max-w-5xl break-words text-pretty text-[15px] leading-relaxed text-muted-foreground md:text-base";

export const AGENCY_HERO_COPY_CLASS = "w-full md:max-w-[82%] lg:max-w-[78%]";

export const AGENCY_HERO_TITLE_CLASS =
  "w-full max-w-[30ch] break-words text-pretty text-[2rem] font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_12px_hsl(220_12%_7%/0.45)] md:text-[clamp(2.5rem,4vw,3.25rem)] md:leading-[1.04]";

export const AGENCY_HERO_SUBTITLE_CLASS =
  "mt-4 w-full max-w-[72rem] break-words text-pretty text-[15px] leading-relaxed text-white/90 md:text-[1.0625rem] md:leading-relaxed";

export const AGENCY_CARD_TITLE_CLASS =
  "break-words text-pretty font-bold leading-snug";

export const AGENCY_CARD_DESCRIPTION_CLASS =
  "break-words text-pretty leading-relaxed";