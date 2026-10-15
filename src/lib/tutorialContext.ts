const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i;

/** Turns a pathname into the tutorial context key: id segments become ":id". */
export function tutorialContextKey(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean).map((p) => (ID_SEGMENT.test(p) ? ":id" : p));
  return "/" + parts.join("/");
}

export function tutorialEmbedUrl(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const h = u.hostname;
    if (h.includes("youtu")) {
      const id = h.includes("youtu.be") ? u.pathname.slice(1)
        : u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2]
        : u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2]
        : u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
    }
    if (h.includes("vimeo.com") && !h.includes("player.")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (h.includes("loom.com") && u.pathname.startsWith("/share/")) {
      return `https://www.loom.com/embed/${u.pathname.split("/")[2]}`;
    }
    return u.toString();
  } catch {
    return url;
  }
}
