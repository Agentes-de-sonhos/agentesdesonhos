import { useId, useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type { FaqDestination } from "@/lib/agencyFaqContact";

export function AgencyFaqContact({ destination, agencyName, buttonClassName = "", preview = false, compact = false }: {
  destination?: FaqDestination;
  agencyName: string;
  buttonClassName?: string;
  preview?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const message = question.trim();
  const whatsapp = destination?.kind !== "email";
  const channel = whatsapp ? "WhatsApp" : "e-mail";
  const Icon = whatsapp ? MessageCircle : Mail;
  const actionClass = `min-h-10 shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm ${buttonClassName}`;
  const href = !destination || preview ? undefined : whatsapp
    ? `https://wa.me/${destination.address}?text=${encodeURIComponent(message)}`
    : `mailto:${destination.address}?subject=${encodeURIComponent("Dúvida pelo site")}&body=${encodeURIComponent(message)}`;
  const buttonLabel = compact ? "Enviar" : `Enviar pelo ${channel}`;
  const icon = <Icon className="h-4 w-4" aria-hidden="true" />;
  const action = message && href
    ? <Button asChild className={actionClass}><a href={href} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noopener noreferrer" : undefined}>{icon}{buttonLabel}</a></Button>
    : <Button type="button" className={actionClass} disabled>{icon}{buttonLabel}</Button>;
  const field = <Textarea id={`${id}-question`} placeholder="Escreva sua dúvida aqui" maxLength={1000} rows={1}
    aria-describedby={preview || !compact ? `${id}-hint` : undefined}
    className={`${compact ? "min-w-0 flex-1" : "mt-3"} min-h-10 resize-y leading-5`}
    value={question} onChange={event => setQuestion(event.target.value)} />;

  const subject = /^(?:a|o|as|os)\s/i.test(agencyName) ? agencyName : `A ${agencyName}`;
  return <section aria-labelledby={`${id}-title`} className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <h3 id={`${id}-title`} className="text-sm font-semibold">Ainda tem alguma dúvida?</h3>
      <p className="text-sm leading-5 text-muted-foreground">{subject} responde pelo {channel}.</p>
    </div>
    <label htmlFor={`${id}-question`} className="sr-only">Sua dúvida</label>
    {compact ? (
      <>
        <div className="wl-faq-contact-inline mt-3 flex items-start gap-2 sm:gap-3">{field}{action}</div>
        {preview && <p id={`${id}-hint`} className="mt-2 text-xs text-muted-foreground">Prévia: o envio fica desativado nesta versão.</p>}
      </>
    ) : (
      <>
        {field}
        <div className="mt-2 flex items-center gap-2 sm:gap-3">
          {action}
          <p id={`${id}-hint`} className="min-w-0 text-xs leading-4 text-muted-foreground">{preview ? "Prévia: o envio fica desativado nesta versão." : <>Sua mensagem abre {whatsapp ? "no WhatsApp" : "no seu app de e-mail"}. Confirme o envio por lá.</>}</p>
        </div>
      </>
    )}
  </section>;
}
