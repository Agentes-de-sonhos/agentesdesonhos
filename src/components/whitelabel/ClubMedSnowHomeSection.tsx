import { useEffect, useRef } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting && entry.intersectionRatio >= 0.35;
      if (visible) {
        void video.play().then(() => { if (!visible) video.pause(); }).catch(() => {});
      } else video.pause();
    }, { threshold: 0.35 });
    observer.observe(video);
    return () => { visible = false; observer.disconnect(); video.pause(); };
  }, [config.videoUrl]);
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
            <video
              ref={videoRef}
              src={config.videoUrl}
              controls
              muted
              playsInline
              preload="metadata"
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              aria-label="Club Med — férias de esqui"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
