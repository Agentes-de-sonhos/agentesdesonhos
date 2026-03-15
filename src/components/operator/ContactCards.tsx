import { Card, CardContent } from "@/components/ui/card";
import { Phone, MessageCircle } from "lucide-react";

interface ContactCardsProps {
  contacts: string;
}

function parseContacts(text: string) {
  const lines = text.split(/\n+/).filter(Boolean);
  if (lines.length <= 1) {
    return [{ label: "Contato Comercial", value: text.trim() }];
  }

  const contacts: { label: string; value: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // If line contains a phone pattern, it's a value; previous non-phone line is label
    const hasPhone = /\(?\d{2}\)?\s*\d{4,5}[- ]?\d{4}/.test(line);
    if (hasPhone) {
      const label = i > 0 && !contacts.find((c) => c.label === lines[i - 1].trim())
        ? lines[i - 1].trim()
        : `Contato ${contacts.length + 1}`;
      contacts.push({ label, value: line });
    } else if (i === lines.length - 1 || !/\(?\d{2}\)?\s*\d{4,5}[- ]?\d{4}/.test(lines[i + 1] || "")) {
      // Standalone line without a following phone - treat as single entry
      contacts.push({ label: `Contato ${contacts.length + 1}`, value: line });
    }
  }

  return contacts.length > 0 ? contacts : [{ label: "Contato Comercial", value: text.trim() }];
}

function extractPhone(text: string): string | null {
  const match = text.match(/\(?\d{2}\)?\s*\d{4,5}[- ]?\d{4}/);
  return match ? match[0].replace(/[^\d]/g, "") : null;
}

export function ContactCards({ contacts }: ContactCardsProps) {
  const parsed = parseContacts(contacts);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {parsed.map((contact, i) => {
        const phone = extractPhone(contact.value);
        return (
          <Card
            key={i}
            className="group rounded-xl border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-300"
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{contact.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{contact.value}</p>
              </div>
              {phone && (
                <a
                  href={`https://wa.me/55${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                </a>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
