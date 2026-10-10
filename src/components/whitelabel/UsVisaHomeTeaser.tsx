import { useMemo, useState } from "react";
import { ArrowRight, Award, Building2, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsVisaPublicInfo } from "@/hooks/useUsVisaPublicInfo";
import { agencySiteHref } from "@/lib/agencyContextLink";
import visaPassportImg from "@/assets/whitelabel/visto-passaporte-eua.jpg";

const CITIES = [
  { key: "Sao Paulo", label: "São Paulo", place: "Consulado-Geral" },
  { key: "Rio De Janeiro", label: "Rio de Janeiro", place: "Consulado-Geral" },
  { key: "Brasilia", label: "Brasília", place: "Embaixada" },
  { key: "Recife", label: "Recife", place: "Consulado-Geral" },
  { key: "Porto Alegre", label: "Porto Alegre", place: "Consulado-Geral" },
];

const OFFICIAL_WAIT_URL =
  "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/global-visa-wait-times.html";

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

/** Vitrine interativa da home: espera por consulado (dados oficiais) + CTA para /visto-americano. */
export function UsVisaHomeTeaser() {
  const { data, isLoading } = useUsVisaPublicInfo();
  const waits = data?.interview_wait_times ?? null;
  const [selected, setSelected] = useState(CITIES[0].key);

  const fastest = useMemo(() => {
    if (!waits) return null;
    let best: { key: string; months: number } | null = null;
    for (const c of CITIES) {
      const m = waits[c.key]?.months;
      if (typeof m === "number" && (!best || m < best.months)) best = { key: c.key, months: m };
    }
    return best?.key ?? null;
  }, [waits]);

  const city = CITIES.find((c) => c.key === selected)!;
  const wait = waits?.[selected];
  const sourceDate = formatDate(data?.wait_times_source_updated_at);
  const fee = typeof data?.mrv_fee_usd === "number" ? data.mrv_fee_usd : null;


  return (
    <section id="visto-americano" className="scroll-mt-24 bg-card py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
          <img
            src={visaPassportImg}
            alt="Passaporte brasileiro com bandeira dos Estados Unidos e miniatura da Estátua da Liberdade"
            width={1024}
            height={768}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-md"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)] wl-kicker">
              Visto americano
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-4xl">
              Quanto tempo falta para a sua entrevista?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/75">
              Escolha a cidade e veja a espera oficial para a próxima entrevista de visto de turismo e negócios (B1/B2).
              A Amanda orienta cada etapa: formulário, taxa, agendamento e preparação.
            </p>
            {fee !== null && (
              <p className="mt-4 text-sm text-foreground/75">
                Taxa consular oficial: <strong className="text-foreground">US$ {fee}</strong> por pessoa.
              </p>
            )}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href={agencySiteHref("/visto-americano")}>
                  Conhecer a assessoria completa <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-10 md:mt-12">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm md:p-8">
            <div role="tablist" aria-label="Escolha a cidade" className="flex flex-wrap gap-2">
              {CITIES.map((c) => {
                const active = c.key === selected;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelected(c.key)}
                    className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:border-foreground/40"
                    }`}
                  >
                    {c.label}
                    {fastest === c.key && (
                      <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-[var(--brand-primary)]" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            <div key={selected} className="mt-6 grid animate-fade-in gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-10">
              <div className="md:order-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" aria-hidden="true" /> {city.place} em {city.label}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Tempo até a próxima entrevista disponível, não prazo de emissão do visto. A coleta de foto e digitais no CASV, quando aplicável, é agendada à parte.
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {sourceDate && <span>Fonte oficial atualizada em {sourceDate}</span>}
                  <a
                    href={data?.wait_times_source_url || OFFICIAL_WAIT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
                  >
                    travel.state.gov <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </p>
              </div>
              <div className="order-first md:order-2 md:text-right">
                <div className="flex items-end gap-3 md:justify-end">
                  <Clock className="mb-1.5 h-7 w-7 text-[var(--brand-primary)] wl-accent-icon" aria-hidden="true" />
                  <p className="text-4xl font-semibold text-foreground md:text-5xl">
                    {isLoading ? "…" : wait?.display_pt || "Indisponível"}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">de espera para a próxima entrevista</p>
                {fastest === selected && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
                    <Award className="h-3.5 w-3.5" aria-hidden="true" /> Menor espera entre as 5 cidades no momento
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
