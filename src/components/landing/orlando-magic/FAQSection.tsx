import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ } from "./content";

export function FAQSection() {
  const cols: typeof FAQ[] = [[], [], []];
  FAQ.forEach((item, i) => cols[i % 3].push(item));

  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Perguntas frequentes
        </h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {cols.map((col, i) => (
            <Accordion key={i} type="single" collapsible className="w-full">
              {col.map((item, j) => (
                <AccordionItem key={j} value={`i-${i}-${j}`} className="border-slate-200">
                  <AccordionTrigger className="text-left text-sm font-semibold text-slate-800 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-slate-600">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ))}
        </div>
      </div>
    </section>
  );
}
