import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Mountain, Snowflake } from "lucide-react";
import { CLUB_MED_SNOW, CLUB_MED_SNOW_BASE, groupByCountry, type ClubMedSnowResort } from "@/lib/clubMedSnow";
import { getClubMedSnowPhotos } from "@/lib/clubMedSnow/photos";
import { agencySiteHref } from "@/lib/agencyContextLink";
import { CountryFilters } from "./CountryFilters";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

function ResortCard({ r }: { r: ClubMedSnowResort }) {
  const photo = getClubMedSnowPhotos(r.slug)[0];
  return (
    <li>
      <a href={agencySiteHref(`${CLUB_MED_SNOW_BASE}/${r.slug}`)} className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-lg">
        <div className="relative aspect-[4/3] bg-muted">
          {photo ? (
            <img src={photo.url} alt={r.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground"><Snowflake className="h-10 w-10" aria-hidden /></div>
          )}
          {photo && <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] text-background">Foto: {photo.credit}</span>}
          {r.kind === "chalet" && <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold">Chalés</span>}
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{[r.village, r.country].filter(Boolean).join(" · ")}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">{r.name}</h3>
          {r.tagline && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{r.tagline}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {r.altitude && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><Mountain className="h-3 w-3" aria-hidden />{r.altitude}</span>}
            {r.status !== "confirmado" && <span className="rounded-full bg-muted px-2 py-0.5">Disponibilidade a confirmar</span>}
          </div>
        </div>
      </a>
    </li>
  );
}

export default function ClubMedSnowCollectionPage({ info }: { info: AgencyDomainInfo }) {
  const groups = groupByCountry();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCountries = [...new Set(searchParams.getAll("pais"))].filter((key) => groups.some((group) => group.key === key));
  const setSelectedCountries = (next: string[]) => setSearchParams((current) => {
    const updated = new URLSearchParams(current);
    updated.delete("pais");
    next.forEach((country) => updated.append("pais", country));
    return updated;
  }, { replace: true, preventScrollReset: true });
  const visibleGroups = selectedCountries.length ? groups.filter((g) => selectedCountries.includes(g.key)) : groups;
  const visibleCount = visibleGroups.reduce((total, g) => total + g.items.length, 0);
  const toggleCountry = (key: string) => setSelectedCountries(selectedCountries.includes(key) ? selectedCountries.filter((x) => x !== key) : [...selectedCountries, key]);
  useEffect(() => { document.title = `Club Med na neve · ${info.agency_name ?? "Viagens"}`; }, [info.agency_name]);
  return (
    <div className="bg-background px-4 py-12 md:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Club Med na neve</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Resorts de esqui com tudo organizado</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
          {CLUB_MED_SNOW.filter((r) => r.kind === "resort").length} resorts Club Med de montanha na França, Itália, Suíça, Canadá, Japão e China.
          Compare áreas de esqui, clubes infantis e o que está incluído em cada um, e peça seu orçamento direto para {info.agency_name ?? "a agência"}.
        </p>
        <CountryFilters countries={groups.map((g) => ({ key: g.key, country: g.country, count: g.items.length }))}
          selected={selectedCountries} onToggle={toggleCountry} onReset={() => setSelectedCountries([])} />
        <p role="status" aria-live="polite" aria-atomic="true" className="mt-6 text-sm text-muted-foreground">
          {visibleCount} {visibleCount === 1 ? "opção de hospedagem" : "opções de hospedagem"}{selectedCountries.length ? ` em ${visibleGroups.map((g) => g.country).join(", ")}` : " em todos os países"}
        </p>
        <div id="club-med-snow-results">
        {visibleGroups.map((g) => (
          <section key={g.key} id={g.key} className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-semibold md:text-3xl">{g.country}</h2>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((r) => <ResortCard key={r.slug} r={r} />)}
            </ul>
          </section>
        ))}
        </div>
        <p className="mt-12 text-xs text-muted-foreground">
          Informações conferidas nas páginas oficiais do Club Med; condições de neve dependem do clima e não são garantidas. Avaliações e mapas via Google Maps. Fotos oficiais do Club Med, selecionadas por resort; créditos nas galerias.
        </p>
      </div>
    </div>
  );
}
