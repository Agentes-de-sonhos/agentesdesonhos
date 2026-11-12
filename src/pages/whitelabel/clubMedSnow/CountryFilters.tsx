import { Check } from "lucide-react";

interface CountryOption { key: string; country: string; count: number }

export function CountryFilters({ countries, selected, onToggle, onReset }: {
  countries: CountryOption[];
  selected: string[];
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-8 border-y border-border py-6 md:mt-10 md:py-8" role="group" aria-label="Filtrar hotéis por país">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Selecione um ou mais países</p>
        <button type="button" data-preview-local="true" onClick={onReset} aria-pressed={selected.length === 0} aria-controls="club-med-snow-results"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${selected.length === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"}`}>
          Todos os países
        </button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
        {countries.map(({ key, country, count }) => {
          const active = selected.includes(key);
          return (
            <button key={key} type="button" data-preview-local="true" onClick={() => onToggle(key)} aria-label={country} aria-pressed={active} aria-controls="club-med-snow-results"
              className={`group relative flex min-w-0 flex-col items-center rounded-2xl border px-2 pb-4 pt-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${active ? "border-primary/60 bg-primary/5 shadow-sm" : "border-transparent hover:border-border hover:bg-muted/50"}`}>
              {active && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" aria-hidden="true" /></span>}
              <img src={`/club-med-neve/countries/${key}.svg`} alt="" aria-hidden="true" width={160} height={120}
                className="h-20 w-full max-w-[140px] object-contain transition-transform group-hover:scale-105 motion-reduce:transform-none sm:h-24" />
              <span className={`mt-3 rounded-full border px-3 py-1.5 text-sm font-medium transition sm:px-4 ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground group-hover:border-primary/40"}`}>{country}</span>
              <span className="mt-2 text-xs tabular-nums text-muted-foreground">{count} {count === 1 ? "opção" : "opções"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
