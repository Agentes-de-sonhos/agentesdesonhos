import { useUsVisaPublicInfo } from "@/hooks/useUsVisaPublicInfo";

const CITY_LABELS: Record<string, string> = {
  Brasilia: "Brasília",
  "Sao Paulo": "São Paulo",
  "Rio De Janeiro": "Rio de Janeiro",
  Recife: "Recife",
  "Porto Alegre": "Porto Alegre",
};
const CITY_ORDER = Object.keys(CITY_LABELS);

/** "YYYY-MM-DD" → "DD/MM/AAAA" sem conversão de fuso. */
function fmtDate(value?: string | null) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : null;
}

/**
 * Bloco opt-in com dados oficiais do visto B1/B2. Não é renderizado por padrão
 * em nenhum site: cada página decide incluí-lo. Sem dado confirmado, mostra
 * estado indisponível em vez de valores.
 */
export function UsVisaOfficialInfo({ className = "" }: { className?: string }) {
  const { data, isLoading } = useUsVisaPublicInfo();
  if (isLoading) return null;

  if (!data) {
    return (
      <div className={`rounded-xl border border-border/60 p-5 text-sm text-muted-foreground ${className}`}>
        Informações oficiais de taxa e espera indisponíveis no momento.
      </div>
    );
  }

  const waits = data.interview_wait_times ?? {};
  const cities = CITY_ORDER.filter((c) => waits[c]?.display_pt);
  const feesDate = fmtDate(data.fees_source_updated_at);
  const waitsDate = fmtDate(data.wait_times_source_updated_at);
  const checked = fmtDate(data.checked_at);

  return (
    <div className={`rounded-xl border border-border/60 bg-background p-5 text-sm ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Dados oficiais · Visto B1/B2
      </p>

      <div className="mt-3">
        <p className="font-semibold text-foreground">Taxa consular (MRV)</p>
        <p className="text-foreground/80">
          {data.mrv_fee_usd != null ? `US$ ${data.mrv_fee_usd}` : "Indisponível no momento"}
          {feesDate && <span className="text-muted-foreground"> · fonte atualizada em {feesDate}</span>}
        </p>
        {data.additional_fees == null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Outras taxas eventuais não confirmadas na fonte oficial.
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="font-semibold text-foreground">Espera estimada para a entrevista</p>
        {cities.length ? (
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {cities.map((c) => (
              <li key={c} className="flex justify-between gap-3 border-b border-border/40 py-1">
                <span className="text-foreground/80">{CITY_LABELS[c]}</span>
                <span className="font-medium text-foreground">{waits[c].display_pt}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-foreground/80">Indisponível no momento</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          É o tempo até a próxima entrevista disponível, não o prazo de emissão do visto.
          {waitsDate && ` Fonte atualizada em ${waitsDate}.`}
        </p>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Fonte: Departamento de Estado dos EUA
        {data.fees_source_url && (
          <> · <a className="underline" href={data.fees_source_url} target="_blank" rel="noopener noreferrer">taxas</a></>
        )}
        {data.wait_times_source_url && (
          <> · <a className="underline" href={data.wait_times_source_url} target="_blank" rel="noopener noreferrer">tempos de espera</a></>
        )}
        {checked && ` · verificado em ${checked}`}
      </p>
    </div>
  );
}
