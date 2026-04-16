import { type Lang } from "@/i18n/cadastroFornecedor";
import { cn } from "@/lib/utils";

const flags: Record<Lang, { emoji: string; label: string }> = {
  pt: { emoji: "🇧🇷", label: "PT" },
  en: { emoji: "🇺🇸", label: "EN" },
  es: { emoji: "🇪🇸", label: "ES" },
};

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
}

export function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1">
      {(Object.keys(flags) as Lang[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
            value === lang
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="text-sm leading-none">{flags[lang].emoji}</span>
          <span>{flags[lang].label}</span>
        </button>
      ))}
    </div>
  );
}
