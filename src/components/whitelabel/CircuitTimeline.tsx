import { Utensils } from "lucide-react";
import type { CircuitDay } from "@/lib/circuits/types";

export function CircuitTimeline({ days }: { days: CircuitDay[] }) {
  return <ol className="mt-8">
    {days.map((day, index) => <li key={day.day} className="relative grid grid-cols-[72px_minmax(0,1fr)] gap-3 pb-4 last:pb-0 sm:grid-cols-[90px_minmax(0,1fr)] sm:gap-5">
      {index < days.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[51px] top-6 w-px bg-primary/25 sm:left-[61px]" />}
      <div className="relative z-10 flex items-start justify-end gap-2 pt-4"><span className="pt-2 text-xs font-medium text-muted-foreground sm:text-sm">Dia</span><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{day.day}</span></div>
      <article className="rounded-lg border border-border bg-card p-4 sm:p-6" aria-label={`Dia ${day.day}`}><p className="text-xs font-medium uppercase text-muted-foreground">{day.weekday}</p><h3 className="mt-1 text-lg font-semibold">{day.title}</h3><p className="mt-3 leading-7 text-muted-foreground">{day.description}</p>{day.meals?.length ? <p className="mt-3 inline-flex items-center gap-2 text-sm text-primary"><Utensils className="h-4 w-4" />{day.meals.join(" · ")}</p> : null}</article>
    </li>)}
  </ol>;
}