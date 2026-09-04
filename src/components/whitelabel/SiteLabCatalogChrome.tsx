/**
 * Chrome EXCLUSIVA do laboratório (`/sitelab-base`).
 *
 * Dois elementos, ambos renderizados apenas quando o perfil está marcado como
 * demonstrativo (`profile.demo`): o "Mapa do catálogo" e a etiqueta discreta que
 * antecede cada seção com o nome interno do módulo e a sua classificação.
 *
 * Nunca aparece nos sites das agências: a engine só monta estes blocos para o
 * perfil do laboratório.
 */
import {
  CATALOG_CLASS_LABEL,
  SITE_CATALOG,
  catalogEntry,
  type AgencyCatalogClass,
} from "@/lib/agencySiteCatalog";

const CLASS_STYLE: Record<AgencyCatalogClass, string> = {
  recomendada: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
  opcional: "border-sky-500/40 bg-sky-500/10 text-sky-800",
  especializada: "border-amber-500/40 bg-amber-500/10 text-amber-800",
  alternativa: "border-violet-500/40 bg-violet-500/10 text-violet-800",
};

function ClassBadge({ value }: { value: AgencyCatalogClass }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CLASS_STYLE[value]}`}
    >
      {CATALOG_CLASS_LABEL[value]}
    </span>
  );
}

/** Índice compacto e elegante de todos os blocos disponíveis no catálogo. */
export function SiteLabCatalogMap({ container }: { container: string }) {
  return (
    <section id="mapa-do-catalogo" className="border-y border-border/60 bg-background">
      <div className={`${container} py-12 md:py-16`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Exclusivo do laboratório
        </p>
        <h2 className="mt-3 text-2xl font-extrabold leading-tight text-foreground md:text-3xl">
          Mapa do catálogo
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Todos os tipos de bloco disponíveis para montar um site white label, com
          a classificação de uso. Este índice não existe nos sites das agências.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SITE_CATALOG.map((entry, index) => (
            <li key={entry.key}>
              <a
                href={entry.anchor}
                className="flex h-full flex-col gap-2 rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    {String(index + 1).padStart(2, "0")}. {entry.name}
                  </span>
                  <ClassBadge value={entry.classification} />
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">{entry.key}</span>
                <span className="text-[13px] leading-relaxed text-muted-foreground">{entry.when}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Etiqueta discreta com a chave interna e a classificação da seção. */
export function SiteLabSectionTag({ sectionKey }: { sectionKey: string }) {
  const entry = catalogEntry(sectionKey);
  if (!entry) return null;
  return (
    <div
      data-testid={`sitelab-tag-${entry.key}`}
      className="bg-background/80 px-4 pt-6 text-center"
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-dashed border-border px-3 py-1">
        <span className="font-mono text-[11px] text-muted-foreground">{entry.key}</span>
        <ClassBadge value={entry.classification} />
      </span>
    </div>
  );
}
