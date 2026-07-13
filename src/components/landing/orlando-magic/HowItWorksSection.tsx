import { HOW_IT_WORKS, HOW_IT_WORKS_TITLE } from "./content";

export function HowItWorksSection() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <h2 className="text-center font-display text-[28px] font-bold leading-tight sm:text-[36px]">
          {HOW_IT_WORKS_TITLE}
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-display text-xl font-bold">
                {s.step}
              </div>
              <h3 className="mt-5 font-display text-[20px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-slate-300">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
