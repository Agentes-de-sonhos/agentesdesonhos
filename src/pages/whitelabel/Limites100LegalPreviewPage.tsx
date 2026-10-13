import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { useNoindex } from "@/hooks/useNoindex";
import { siteContainer } from "@/lib/agencySiteTheme";
import { agencySiteHref } from "@/lib/agencyContextLink";
import {
  LIMITES100_LEGAL_PENDING,
  LIMITES100_PRIVACY,
  LIMITES100_TERMS,
} from "@/lib/agencyLegal/limites100LegalPreview";

/** Prévia de revisão: renderizada dentro do chrome do site (sem cabeçalho/rodapé próprios). */
export default function Limites100LegalPreviewPage({ kind }: { kind: "privacy" | "terms" }) {
  useNoindex(true);
  const doc = kind === "privacy" ? LIMITES100_PRIVACY : LIMITES100_TERMS;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [kind]);

  return (
    <div className={`${siteContainer(true)} py-12 md:py-16`}>
      <aside
        role="note"
        aria-label="Prévia para revisão"
        className="mb-10 rounded-2xl border border-[hsl(var(--wl-ink)_/_0.15)] bg-[hsl(var(--wl-sand))] p-5 text-[hsl(var(--wl-ink))] md:p-6"
      >
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em]">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> Prévia para revisão
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          Rascunho visível somente no ambiente técnico de prévia. Não está ativo em 100limites.tur.br
          e depende de revisão jurídica e aprovação da agência. Pontos omitidos do texto até confirmação:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {LIMITES100_LEGAL_PENDING.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </aside>

      <article className="mx-auto max-w-3xl text-[hsl(var(--wl-ink))]">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-[hsl(var(--wl-ink)_/_0.65)]">Última atualização: {doc.lastUpdated}</p>
        <nav className="mt-4 flex flex-wrap gap-4 text-sm">
          <a className="underline underline-offset-2" href={agencySiteHref(kind === "privacy" ? "/termosdeuso" : "/politicasdeprivacidade")}>
            {kind === "privacy" ? "Ver Termos de Uso" : "Ver Política de Privacidade"}
          </a>
        </nav>
        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            {s.paragraphs?.map((p, i) => (
              <p key={i} className="mt-3 text-[15px] leading-relaxed text-[hsl(var(--wl-ink)_/_0.85)]">{p}</p>
            ))}
            {s.items && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[hsl(var(--wl-ink)_/_0.85)]">
                {s.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
