import { useEffect, useRef, useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgencyGoogleReviews } from "@/hooks/useAgencyGoogleReviews";
import { googleReviewsFallbackUrl, type GoogleReview } from "@/lib/agencyGoogleReviews";
import { getPersonInitials } from "@/components/shared/ClientAvatar";

function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span role="img" aria-label={`${value.toLocaleString("pt-BR")} de 5 estrelas`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`${className} ${i <= rounded ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const author = review.authorUrl ? (
    <a href={review.authorUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline">
      {review.authorName}
    </a>
  ) : (
    <span className="font-semibold text-foreground">{review.authorName}</span>
  );
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
      <div className="flex items-center gap-3">
        {review.photoUrl ? (
          <img src={review.photoUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-sm font-semibold text-[var(--brand-primary)]">
            {getPersonInitials(review.authorName)}
          </span>
        )}
        <div className="min-w-0 text-sm">
          {author}
          {review.relativeTime && <p className="text-xs text-muted-foreground">{review.relativeTime}</p>}
        </div>
      </div>
      {review.rating != null && <div className="mt-4"><Stars value={review.rating} /></div>}
      {review.text && (
        <p className="mt-3 line-clamp-[8] flex-1 whitespace-pre-line text-[15px] leading-relaxed text-foreground">{review.text}</p>
      )}
      {review.googleMapsUri && (
        <a
          href={review.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 self-start text-xs font-medium text-muted-foreground hover:text-[var(--brand-primary)] hover:underline"
        >
          Ver avaliação no Google Maps <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

export function AgencyGoogleReviewsSection({
  hostname,
  container,
  copy,
}: {
  hostname: string;
  container: string;
  copy?: { kicker?: string; title?: string; subtitle?: string };
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) setNear(true); }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const { data, isError } = useAgencyGoogleReviews(hostname, near);
  const fallback = googleReviewsFallbackUrl(hostname);
  const googleUrl = data?.url ?? fallback;

  // Sem dados ou com erro: bloco compacto, sem buraco na página.
  if (isError || (data && data.reviews.length === 0)) {
    if (!googleUrl) return null;
    return (
      <section ref={ref} id="avaliacoes" aria-label="Avaliações no Google" className="bg-background">
        <div className={`${container} flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground`}>
          <p>{isError ? "As avaliações do Google estão indisponíveis no momento." : "Veja o que nossos clientes dizem no Google."}</p>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--brand-primary)] hover:underline">
            Ver todas as avaliações no Google <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} id="avaliacoes" aria-labelledby="avaliacoes-title" className="bg-background">
      <div className={`${container} py-14 md:py-24`}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)] wl-kicker">{copy?.kicker ?? "Avaliações no Google"}</p>
            <h2 id="avaliacoes-title" className="mt-4 text-3xl font-extrabold leading-tight text-foreground md:text-[2.6rem]">
              {copy?.title ?? "O que dizem nossos viajantes"}
            </h2>
            {copy?.subtitle && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-base">{copy.subtitle}</p>}
            {data && data.rating != null && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="text-2xl font-bold text-foreground">{data.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</span>
                <Stars value={data.rating} className="h-5 w-5" />
                {data.total != null && <span>{data.total.toLocaleString("pt-BR")} avaliações no Google</span>}
              </div>
            )}
          </div>
          {googleUrl && (
            <Button asChild variant="outline" size="lg" className="self-start md:self-auto">
              <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                Ver todas as avaliações no Google <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>

        {data ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.reviews.map((r, i) => <ReviewCard key={`${r.publishTime ?? i}-${i}`} review={r} />)}
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando avaliações">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-1 text-muted-foreground">
          <p translate="no" className="font-sans text-[13px] font-normal text-foreground" data-testid="google-maps-attribution">
            Google Maps
          </p>
          {data && data.attributions.length > 0 && (
            <p className="font-sans text-[12px]">
              Dados também fornecidos por:{" "}
              {data.attributions.map((a, i) => (
                <span key={`${a.provider}-${i}`}>
                  {i > 0 && ", "}
                  {a.providerUri ? (
                    <a href={a.providerUri} target="_blank" rel="noopener noreferrer" className="hover:underline">{a.provider}</a>
                  ) : a.provider}
                </span>
              ))}
            </p>
          )}
          <p className="font-sans text-[12px]">Avaliações exibidas na ordem de relevância definida pelo Google Maps.</p>
        </div>
      </div>
    </section>
  );
}
