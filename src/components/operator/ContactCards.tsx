import { RichTextWithLinks } from "./RichTextWithLinks";

interface ContactCardsProps {
  contacts: string;
}

export function ContactCards({ contacts }: ContactCardsProps) {
  return <RichTextWithLinks text={contacts} />;
}
