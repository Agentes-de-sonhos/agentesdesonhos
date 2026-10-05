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

/** Composed only by the public tickets route; never by the shared home/wizard. */
export function OrlandoEditorialGallery({ hostname }: { hostname: string }) {
  if (!["destinoscomaju.com.br", "www.destinoscomaju.com.br"].includes(hostname.toLowerCase().replace(/\.$/, ""))) return null;

  return (
    <section aria-labelledby="orlando-editorial-title" className="bg-background pt-12 md:pt-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
          <h2 id="orlando-editorial-title" className="text-3xl font-semibold text-foreground md:text-4xl">Parques e experiências em Orlando</h2>
          <p className="mt-3 text-muted-foreground">Descubra algumas das experiências que podem fazer parte da sua viagem.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {PHOTOS.map((photo) => (
            <article key={photo.name} className="group relative isolate aspect-video overflow-hidden rounded-2xl border border-border shadow-sm">
              <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025]" />
              <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--orlando-gallery-scrim)]" />
              <h3 className="absolute inset-x-0 bottom-0 p-5 text-lg font-semibold leading-snug text-[hsl(var(--orlando-gallery-caption))] md:text-xl">{photo.name}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}