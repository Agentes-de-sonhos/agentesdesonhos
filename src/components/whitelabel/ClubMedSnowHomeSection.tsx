import { ArrowRight } from "lucide-react";
import { CLUB_MED_SNOW, CLUB_MED_SNOW_BASE, groupByCountry } from "@/lib/clubMedSnow";
import { agencySiteHref } from "@/lib/agencyContextLink";
import type { AgencySiteProfile } from "@/lib/agencySiteProfile";

/** Opt-in home introduction; countries and resort counts share the live catalogue. */
export function ClubMedSnowHomeSection({ config, container, agencyName }: {
  config: NonNullable<AgencySiteProfile["clubMedSnowHome"]>;
  container: string;
  agencyName: string;
}) {
  const countries = groupByCountry();
  const resorts = CLUB_MED_SNOW.filter((r) => r.kind === "resort").length;
  return (
    <section id="campanhas" aria-labelledby="club-med-home-title" className="bg-background py-14 md:py-20" data-testid="club-med-snow-home">
      <div className={`${container} grid items-center gap-8 lg:grid-cols-[11fr_9fr] lg:gap-14`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Club Med na neve</p>
          <h2 id="club-med-home-title" className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">Resorts de esqui com tudo organizado</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{resorts} resorts de montanha em {countries.length} países. Da primeira descida aos dias de descanso depois do esqui, encontre a experiência que combina com você.</p>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">Compare áreas de esqui, estrutura para famílias e os benefícios de cada resort, com a orientação da {agencyName}.</p>
          <ul className="mt-7 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6" aria-label="Países dos resorts Club Med na neve">
            {countries.map((country) => (
              <li key={country.key}>
                <a href={agencySiteHref(`${CLUB_MED_SNOW_BASE}?pais=${country.key}`)} className="group flex flex-col items-center gap-2 rounded-xl p-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <img src={`/club-med-neve/countries/${country.key}.svg`} alt="" aria-hidden="true" loading="lazy" width={73} height={62} className="h-[62px] w-[73px] object-contain transition group-hover:scale-105" />
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground group-hover:bg-muted">{country.country}</span>
                </a>
              </li>
            ))}
          </ul>
          <a href={agencySiteHref(CLUB_MED_SNOW_BASE)} className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Conheça os resorts Club Med <ArrowRight className="h-4 w-4" aria-hidden /></a>
        </div>
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
            <iframe
              title="Club Med — férias de esqui"
              src={`https://www.youtube-nocookie.com/embed/${config.youtubeId}?rel=0&hl=pt&cc_lang_pref=pt&playsinline=1`}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Vídeo: Club Med · canal oficial.</p>
        </div>
      </div>
    </section>
  );
}
