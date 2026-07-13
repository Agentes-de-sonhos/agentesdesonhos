import { Quote } from "lucide-react";

export function TestimonialsSection() {
  const slots = [0, 1, 2, 3];
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <h2 className="text-center font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Quem vive essa experiência entende
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((i) => (
            <article key={i} className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
              <Quote className="h-5 w-5 text-slate-300" />
              <p className="mt-3 text-sm italic text-slate-500">
                Depoimento real será inserido aqui.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Nome do viajante</p>
                  <p className="text-xs text-slate-400">Mês e ano da viagem</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
