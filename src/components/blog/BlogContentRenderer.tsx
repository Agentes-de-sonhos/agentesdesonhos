import { Fragment, type ReactNode } from "react";
import { parseYouTubeId, safeHref, type TiptapNode } from "@/lib/blog/blogUtils";

/**
 * Renderizador seguro do conteúdo do artigo (JSON do editor → React).
 * Lista fechada de blocos/marcas; nenhum HTML arbitrário é interpretado.
 */
export function BlogContentRenderer({ doc }: { doc?: TiptapNode | null }) {
  if (!doc?.content?.length) return null;
  return <div className="blog-prose">{doc.content.map((n, i) => renderNode(n, i))}</div>;
}

function renderMarks(text: string, marks: TiptapNode["marks"], key: number): ReactNode {
  let out: ReactNode = text;
  (marks ?? []).forEach((m) => {
    if (m.type === "bold") out = <strong>{out}</strong>;
    else if (m.type === "italic") out = <em>{out}</em>;
    else if (m.type === "link") {
      const href = safeHref(m.attrs?.href);
      if (href) {
        const external = /^https?:/.test(href);
        out = (
          <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
            {out}
          </a>
        );
      }
    }
  });
  return <Fragment key={key}>{out}</Fragment>;
}

function children(n: TiptapNode) {
  return (n.content ?? []).map((c, i) => renderNode(c, i));
}

function renderNode(n: TiptapNode, key: number): ReactNode {
  switch (n.type) {
    case "text":
      return renderMarks(n.text ?? "", n.marks, key);
    case "hardBreak":
      return <br key={key} />;
    case "paragraph":
      return <p key={key}>{children(n)}</p>;
    case "heading":
      return Number(n.attrs?.level) === 3 ? <h3 key={key}>{children(n)}</h3> : <h2 key={key}>{children(n)}</h2>;
    case "bulletList":
      return <ul key={key}>{children(n)}</ul>;
    case "orderedList":
      return <ol key={key}>{children(n)}</ol>;
    case "listItem":
      return <li key={key}>{children(n)}</li>;
    case "blockquote":
      return <blockquote key={key}>{children(n)}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "blogImage": {
      const src = typeof n.attrs?.src === "string" ? n.attrs.src : null;
      if (!src) return null;
      return (
        <figure key={key}>
          <img src={src} alt={String(n.attrs?.alt ?? "")} loading="lazy" decoding="async" />
          {n.attrs?.caption ? <figcaption>{String(n.attrs.caption)}</figcaption> : null}
        </figure>
      );
    }
    case "blogGallery": {
      const imgs = (Array.isArray(n.attrs?.images) ? n.attrs!.images : []).filter((i: any) => typeof i?.src === "string");
      if (!imgs.length) return null;
      return (
        <div key={key} className="blog-gallery">
          {imgs.map((i: any, idx: number) => (
            <figure key={idx}>
              <img src={i.src} alt={String(i.alt ?? "")} loading="lazy" decoding="async" />
              {i.caption ? <figcaption>{String(i.caption)}</figcaption> : null}
            </figure>
          ))}
        </div>
      );
    }
    case "blogYoutube": {
      const id = parseYouTubeId(`https://youtu.be/${String(n.attrs?.videoId ?? "")}`);
      if (!id) return null;
      return (
        <div key={key} className="blog-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="Vídeo do YouTube"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    }
    default:
      return null;
  }
}
