import { Input } from "@/components/ui/input";

interface SocialLinksEditFormProps {
  links: Record<string, string>;
  onChange: (links: Record<string, string>) => void;
}

const fields = [
  { key: "website", label: "Website", placeholder: "https://..." },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/..." },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/..." },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/..." },
];

export function SocialLinksEditForm({ links, onChange }: SocialLinksEditFormProps) {
  const update = (key: string, value: string) => {
    const next = { ...links };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    onChange(next);
  };

  return (
    <div className="p-4 space-y-3">
      <label className="text-xs font-medium text-muted-foreground">Redes Sociais</label>
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="text-xs text-muted-foreground">{label}</label>
          <Input
            value={links[key] || ""}
            onChange={(e) => update(key, e.target.value)}
            placeholder={placeholder}
            className="mt-1 rounded-xl"
          />
        </div>
      ))}
    </div>
  );
}
