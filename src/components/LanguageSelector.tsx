import { type Lang } from "@/i18n/cadastroFornecedor";
import { cn } from "@/lib/utils";
import flagBR from "@/assets/flags/br.svg";
import flagUS from "@/assets/flags/us.svg";
import flagES from "@/assets/flags/es.svg";

const flags: Record<Lang, { src: string; label: string; alt: string }> = {
  pt: { src: flagBR, label: "PT", alt: "Português" },
  en: { src: flagUS, label: "EN", alt: "English" },
  es: { src: flagES, label: "ES", alt: "Español" },
};

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
}

export function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
      {(Object.keys(flags) as Lang[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
            value === lang
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={flags[lang].alt}
        >
          <img
            src={flags[lang].src}
            alt={flags[lang].alt}
            className="h-4 w-5 rounded-[2px] object-cover"
            loading="lazy"
          />
          <span>{flags[lang].label}</span>
        </button>
      ))}
    </div>
  );
}
