import { RichContentDisplay } from "./RichContentDisplay";

interface ContactCardsProps {
  contacts: string;
}

export function ContactCards({ contacts }: ContactCardsProps) {
  return <RichContentDisplay content={contacts} />;
}
