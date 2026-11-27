import { useId, useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type { FaqDestination } from "@/lib/agencyFaqContact";

export function AgencyFaqContact({ destination, agencyName, buttonClassName = "", preview = false }: {
  destination: FaqDestination;
  agencyName: string;
  buttonClassName?: string;
  preview?: boolean;
}) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const message = question.trim();
  const whatsapp = destination.kind === "whatsapp";
  const channel = whatsapp ? "WhatsApp" : "e-mail";
  const Icon = whatsapp ? MessageCircle : Mail;
  const actionClass = `min-h-10 shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm ${buttonClassName}`;
  const href = whatsapp
    ? `https://wa.me/${destination.address}?text=${encodeURIComponent(message)}`
    : `mailto:${destination.address}?subject=${encodeURIComponent("Dúvida pelo site")}&body=${encodeURIComponent(message)}`;
  return <section aria-labelledby={`${id}-title`} className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <h3 id={`${id}-title`} className="text-sm font-semibold">Ainda tem alguma dúvida?</h3>
      <p className="text-sm leading-5 text-muted-foreground">A {agencyName} responde pelo {channel}.</p>
    </div>
    <label htmlFor={`${id}-question`} className="sr-only">Sua dúvida</label>
    <Textarea id={`${id}-question`} placeholder="Escreva sua dúvida aqui" maxLength={1000} rows={1}
      aria-describedby={`${id}-hint`} className="mt-3 min-h-10 resize-y leading-5" value={question}
      onChange={event => setQuestion(event.target.value)} />
    <div className="mt-2 flex items-center gap-2 sm:gap-3">
      {message
        ? <Button asChild className={actionClass}><a href={href} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noopener noreferrer" : undefined}><Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />Enviar pelo {channel}</a></Button>
        : <Button type="button" className={actionClass} disabled><Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />Enviar pelo {channel}</Button>}
      <p id={`${id}-hint`} className="min-w-0 text-xs leading-4 text-muted-foreground">{preview ? "Prévia: o envio fica desativado nesta versão." : <>Sua mensagem abre {whatsapp ? "no WhatsApp" : "no seu app de e-mail"}. Confirme o envio por lá.</>}</p>
    </div>
  </section>;
}
