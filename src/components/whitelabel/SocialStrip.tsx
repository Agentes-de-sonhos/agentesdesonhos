type Network = "instagram" | "facebook" | "tiktok" | "youtube";

const LABELS: Record<Network, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };

const PATHS: Record<Network, string> = {
  instagram:
    "M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm0 8.4a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.3-9.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z",
  facebook:
    "M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z",
  tiktok:
    "M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.7a2.9 2.9 0 1 1-2-2.8V9.4a6.3 6.3 0 1 0 5.4 6.3V8.7a8.2 8.2 0 0 0 4.8 1.5V6.8l-1-.1z",
  youtube:
    "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z",
};

export function SocialStrip({ strip }: { strip: { title: string; links: { network: Network; url: string }[] } }) {
  return (
    <section aria-label={strip.title} className="bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 pb-14 md:pb-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{strip.title}</p>
        <ul className="flex items-center gap-4">
          {strip.links.map((l) => (
            <li key={l.network}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${LABELS[l.network]} da agência`}
                className="grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-secondary)] hover:text-[var(--brand-on-secondary)] motion-reduce:transform-none"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d={PATHS[l.network]} />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
