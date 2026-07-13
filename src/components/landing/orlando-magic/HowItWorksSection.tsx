import { HOW_IT_WORKS } from "./content";

export function HowItWorksSection() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
          Descubra seu jogo em três passos
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-display text-lg font-bold">
                {s.step}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
