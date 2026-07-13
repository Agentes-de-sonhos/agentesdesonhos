import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ } from "./content";

export function FAQSection() {
  const cols: typeof FAQ[] = [[], []];
  FAQ.forEach((item, i) => cols[i % 2].push(item));

  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <h2 className="font-display text-[28px] font-bold leading-tight text-slate-900 sm:text-[36px]">
          Perguntas frequentes
        </h2>
        <div className="mt-10 grid gap-x-10 gap-y-2 lg:grid-cols-2">
          {cols.map((col, i) => (
            <Accordion key={i} type="single" collapsible className="w-full">
              {col.map((item, j) => (
                <AccordionItem key={j} value={`i-${i}-${j}`} className="border-slate-200">
                  <AccordionTrigger className="py-5 text-left text-[16px] font-semibold text-slate-800 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[15px] leading-[1.65] text-slate-600">
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
