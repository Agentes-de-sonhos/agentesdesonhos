interface ContactCardsProps {
  contacts: string;
}

export function ContactCards({ contacts }: ContactCardsProps) {
  return (
    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
      {contacts}
    </p>
  );
}
