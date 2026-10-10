import { useMemo, useState } from "react";
import { ArrowRight, Award, Building2, Clock } from "lucide-react";
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

  const city = CITIES.find((c) => c.key === selected) ?? CITIES[0];
  const wait = waits?.[selected];
  const sourceDate = formatDate(data?.wait_times_source_updated_at);
  const fee = typeof data?.mrv_fee_usd === "number" ? data.mrv_fee_usd : null;


  return (
    <section id="visto-americano" className="scroll-mt-24 bg-card py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-[1.08fr_1fr] md:items-center md:gap-10">
          <img
            src={visaPassportImg}
            alt="Passaporte brasileiro com bandeira dos Estados Unidos e miniatura da Estátua da Liberdade"
            width={1024}
            height={768}
            loading="lazy"
            className="aspect-[1.46/1] w-full rounded-2xl object-cover"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)] wl-kicker">
              Visto americano
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-4xl">
              Quanto tempo falta para a sua entrevista?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/75">
              Escolha a cidade e consulte a espera para a próxima entrevista de visto de turismo e negócios (B1/B2).
              A Amanda orienta você em cada etapa.
            </p>
            {fee !== null && (
              <p className="mt-4 text-sm text-foreground/75">
                Taxa consular: <strong className="text-foreground">US$ {fee}</strong> por pessoa.
              </p>
            )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href={agencySiteHref("/visto-americano")}>
                  Conhecer a assessoria completa <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card p-5 md:px-7 md:py-5">
            <h3 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">Consulte o tempo de espera</h3>
            <p className="mt-1 text-sm text-muted-foreground">Selecione o consulado</p>
            <div role="tablist" aria-label="Escolha a cidade" className="mt-4 flex flex-wrap gap-2">
              {CITIES.map((c) => {
                const active = c.key === selected;
                return (
                  <Button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelected(c.key)}
                    variant="outline"
                    className={`h-9 rounded-full border px-5 text-xs font-medium transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:border-foreground/40"
                    }`}
                  >
                    {c.label}
                  </Button>
                );
              })}
            </div>

            <div key={selected} className="mt-4 grid gap-5 md:grid-cols-2 md:items-center md:gap-6">
              <div className="flex gap-5 md:border-r md:border-border/60 md:pr-6">
                <Building2 className="mt-1 h-8 w-8 shrink-0 text-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <h4 className="text-2xl font-semibold leading-tight text-foreground">{city.label}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{city.place}</p>
                  <p className="mt-2 text-sm leading-snug text-muted-foreground">
                    Tempo até a próxima entrevista disponível. Não corresponde ao prazo de emissão do visto.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl bg-primary/10 px-5 py-4 md:px-6" aria-live="polite">
                <Clock className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-primary)] wl-accent-icon" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Próxima entrevista</p>
                  <p className="mt-1 text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                    {isLoading ? "…" : wait?.display_pt || "Indisponível"}
                  </p>
                {fastest === selected && (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
                    <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Menor espera entre as 5 cidades
                  </p>
                )}
                </div>
              </div>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Fonte:
              <a href={data?.wait_times_source_url || OFFICIAL_WAIT_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">travel.state.gov</a>
              {sourceDate && <span>· Atualizado em {sourceDate}.</span>}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
