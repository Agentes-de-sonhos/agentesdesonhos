import { Globe2, Users2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMMUNITY_VISIBILITY_OPTIONS,
  type CommunityVisibility,
} from "@/lib/communityVisibility";

interface PostVisibilitySelectorProps {
  value: CommunityVisibility;
  onChange: (value: CommunityVisibility) => void;
  disabled?: boolean;
}

/** Seletor de público da publicação: Qualquer pessoa (padrão) ou Minha rede. */
export function PostVisibilitySelector({ value, onChange, disabled }: PostVisibilitySelectorProps) {
  const Icon = value === "network" ? Users2 : Globe2;
  return (
    <Select
      value={value === "internal" ? "public" : value}
      onValueChange={(next) => onChange(next as CommunityVisibility)}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-8 w-auto gap-1.5 rounded-full border-border/70 px-3 text-xs font-medium"
        aria-label="Público da publicação"
        data-post-visibility-selector
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {COMMUNITY_VISIBILITY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-sm">
            <span className="font-medium">{option.label}</span>
            <span className="block text-[11px] text-muted-foreground">{option.description}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
