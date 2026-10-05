import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import disney from "@/assets/orlando/editorial/disney-castle.webp.asset.json";
import universal from "@/assets/orlando/editorial/universal-epic-universe-alternative.webp.asset.json";
import united from "@/assets/orlando/editorial/seaworld-mako-sunset.webp.asset.json";
import legoland from "@/assets/orlando/editorial/legoland-miniland.webp.asset.json";
import kennedy from "@/assets/orlando/editorial/ksc-rocket-garden.webp.asset.json";
import icon from "@/assets/orlando/editorial/icon-park-wheel-alternative.webp.asset.json";
import cirque from "@/assets/orlando/editorial/drawn-to-life-scenic.webp.asset.json";
import blueMan from "@/assets/orlando/editorial/blue-man-group-performers-alternative.webp.asset.json";
import magic from "@/assets/orlando/editorial/magic-kia-center-guide.webp.asset.json";

const PHOTOS = [
  { name: "Walt Disney World Resort", src: disney.url, alt: "Castelo da Cinderela no Magic Kingdom, com jardins e a estátua de Walt Disney e Mickey", width: 600, height: 400 },
  { name: "Universal Orlando Resort", src: universal.url, alt: "Arquitetura e jardins do Celestial Park no Universal Epic Universe", width: 940, height: 705 },
  { name: "United Parks & Resorts", src: united.url, alt: "Montanha-russa Mako do SeaWorld Orlando refletida no lago ao pôr do sol", width: 750, height: 422 },
  { name: "LEGOLAND Florida Resort", src: legoland.url, alt: "Construções coloridas em peças LEGO no MINILAND do LEGOLAND Florida Resort", width: 1516, height: 1080 },
  { name: "Kennedy Space Center", src: kennedy.url, alt: "Foguetes históricos no Rocket Garden do Kennedy Space Center Visitor Complex", width: 1600, height: 1078 },
  { name: "ICON Park", src: icon.url, alt: "Roda-gigante The Wheel do ICON Park iluminada em tons de rosa e azul à noite", width: 1024, height: 576 },
  { name: "Cirque du Soleil — Drawn to Life", src: cirque.url, alt: "Cena teatral iluminada do espetáculo Drawn to Life do Cirque du Soleil", width: 1600, height: 1024 },
  { name: "Blue Man Group Orlando", src: blueMan.url, alt: "Três integrantes do Blue Man Group com tinta colorida sob iluminação cênica roxa", width: 1366, height: 693 },
  { name: "Orlando Magic", src: magic.url, alt: "Fachada iluminada do Kia Center, arena do Orlando Magic, ao entardecer e sem torcida", width: 691, height: 421 },
];

/** Composed only by the public tickets route; never by the shared home/wizard.
 *  Visual model mirrors the Destinos com a Ju home banner (slide, left scrim, kicker, dots),
 *  but inset to the same content column and side margin used by the rest of the page. */
export function OrlandoEditorialGallery({ hostname }: { hostname: string }) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const allowed = ["destinoscomaju.com.br", "www.destinoscomaju.com.br"].includes(hostname.toLowerCase().replace(/\.$/, ""));

  useEffect(() => {
    if (!allowed || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setSlide((s) => (s + 1) % PHOTOS.length), 7000);
    return () => window.clearInterval(t);
  }, [allowed, paused]);

  if (!allowed) return null;
  const go = (d: number) => setSlide((s) => (s + d + PHOTOS.length) % PHOTOS.length);
  const navBtn = "grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&_svg]:text-white";

  return (
    <section
      aria-label="Parques e experiências em Orlando"
      aria-roledescription="carrossel"
      className="mx-auto w-full max-w-6xl px-4 pb-4 pt-6 md:pt-10"
    >
      <div
        className="relative isolate overflow-hidden rounded-2xl border border-border/60 shadow-[0_18px_40px_-18px_hsl(220_12%_10%/0.28)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0">
          {PHOTOS.map((p, i) => (
            <img
              key={p.name}
              src={p.src}
              alt={p.alt}
              width={p.width}
              height={p.height}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              aria-hidden={i !== slide}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === slide ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[hsl(220_12%_7%/0.96)] via-[hsl(220_12%_7%/0.7)] to-[hsl(220_12%_7%/0.12)] md:from-[hsl(220_12%_7%/0.94)] md:via-[hsl(220_12%_7%/0.58)] md:to-[hsl(220_12%_7%/0.06)]" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[hsl(220_12%_7%/0.6)] via-[hsl(220_12%_7%/0.28)] to-[hsl(220_12%_7%/0.18)] md:from-[hsl(220_12%_7%/0.45)] md:via-transparent md:to-transparent" />
        </div>

        <div className="relative flex min-h-[420px] flex-col justify-end px-5 pb-8 pt-14 md:min-h-[500px] md:px-10 md:pb-12 md:pt-16">
          <p className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" /> Parques e experiências em Orlando
          </p>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-2xl">
              <h2 id="orlando-editorial-title" className="text-3xl font-normal leading-[1.1] tracking-tight text-white md:text-[clamp(2.25rem,3.3vw,3rem)]" aria-live="polite">
                {PHOTOS[slide].name}
              </h2>
              <p className="mt-4 text-base text-white/85 md:text-lg">Descubra algumas das experiências que podem fazer parte da sua viagem.</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Experiência anterior" onClick={() => go(-1)} className={navBtn}><ChevronLeft className="h-4 w-4" /></button>
              <div className="flex gap-2">
                {PHOTOS.map((p, i) => (
                  <button key={p.name} type="button" aria-label={`Ver ${p.name}`} aria-current={i === slide} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${i === slide ? "w-8 bg-white" : "w-4 bg-white/40"}`} />
                ))}
              </div>
              <button type="button" aria-label="Próxima experiência" onClick={() => go(1)} className={navBtn}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
