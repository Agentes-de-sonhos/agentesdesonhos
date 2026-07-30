import pools from "@/assets/landing/comandatuba/exp-pools.jpg";
import beach from "@/assets/landing/comandatuba/exp-beach.jpg";
import sports from "@/assets/landing/comandatuba/exp-sports.jpg";
import water from "@/assets/landing/comandatuba/exp-watersports.jpg";
import kids from "@/assets/landing/comandatuba/exp-kids.jpg";
import nature from "@/assets/landing/comandatuba/exp-nature.jpg";
import wellness from "@/assets/landing/comandatuba/exp-wellness.jpg";
import entertainment from "@/assets/landing/comandatuba/exp-entertainment.jpg";
import { EXPERIENCES } from "./content";

const IMAGES = [pools, beach, sports, water, kids, nature, wellness, entertainment];
// Individual crop focus to keep people / main subject visible in the short card frame
const POSITIONS = [
  "center 55%", // piscinas
  "center 45%", // praia (aérea vertical)
  "center 40%", // esportes / tênis
  "center 40%", // atividades aquáticas
  "center 45%", // crianças
  "center 50%", // natureza
  "center 45%", // bem-estar / spa
  "center 40%", // entretenimento / trapézio
];

export function ExperiencesSection() {
  return (
    <section id="experiencias" className="bg-[#faf8f3] py-16 sm:py-20">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[26px] font-bold leading-tight text-slate-900 sm:text-[34px]">
            🌴 {EXPERIENCES.title} 🌴
          </h2>
          <p className="mt-3 text-[15px] text-slate-600">{EXPERIENCES.subtitle}</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          {EXPERIENCES.items.map((it, i) => (
            <article
              key={it.title}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={IMAGES[i]}
                  alt={it.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ objectPosition: POSITIONS[i] }}
                  width={800}
                  height={600}
                />
              </div>
              <div className="p-4 text-center">
                <p className="font-display text-[15px] font-semibold text-slate-900">{it.title}</p>
                <p className="mt-1 hidden text-[12px] leading-snug text-slate-500 sm:block">{it.text}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-[12px] text-slate-400">
          {EXPERIENCES.disclaimer}
        </p>
      </div>
    </section>
  );
}