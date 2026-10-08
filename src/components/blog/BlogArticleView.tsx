import type { ReactNode } from "react";
import { BlogContentRenderer } from "@/components/blog/BlogContentRenderer";
import { formatDateLong, readingMinutes, type TiptapNode } from "@/lib/blog/blogUtils";

/** Leitura do artigo, com tipografia padronizada pelo site (público e prévia). */
export function BlogArticleView({
  title,
  coverUrl,
  coverAlt,
  author,
  categoryName,
  publishedAt,
  updatedAt,
  content,
  children,
}: {
  title: string;
  coverUrl?: string | null;
  coverAlt?: string;
  author?: string;
  categoryName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  content?: TiptapNode | null;
  children?: ReactNode;
}) {
  const showUpdated = publishedAt && updatedAt && new Date(updatedAt).getTime() - new Date(publishedAt).getTime() > 60 * 60 * 1000;
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <header className="space-y-4">
        {categoryName ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{categoryName}</p> : null}
        <h1 className="font-display text-3xl font-semibold leading-tight text-foreground md:text-5xl">{title || "Sem título"}</h1>
        <p className="text-sm text-muted-foreground">
          {author ? <>Por <span className="font-medium text-foreground">{author}</span> · </> : null}
          {publishedAt ? <time dateTime={publishedAt}>{formatDateLong(publishedAt)}</time> : "Não publicado"}
          {showUpdated ? <> · Atualizado em <time dateTime={updatedAt!}>{formatDateLong(updatedAt!)}</time></> : null}
          {" · "}{readingMinutes(content)} min de leitura
        </p>
      </header>
      {coverUrl ? (
        <img src={coverUrl} alt={coverAlt ?? ""} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
      ) : null}
      <div className="mt-8">
        <BlogContentRenderer doc={content} />
      </div>
      {children}
    </article>
  );
}
