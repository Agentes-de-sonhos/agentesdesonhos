import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { LANGUAGE_OPTIONS, LANGUAGE_LEVELS } from "@/i18n/cadastroGuia";

export interface GuideLanguage {
  code: string;
  level: string;
}

interface GuideLanguagesEditorProps {
  value: GuideLanguage[];
  onChange: (langs: GuideLanguage[]) => void;
}

export function GuideLanguagesEditor({ value, onChange }: GuideLanguagesEditorProps) {
  const add = () => onChange([...value, { code: "", level: "intermediario" }]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<GuideLanguage>) =>
    onChange(value.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  return (
    <div className="space-y-2">
      {value.map((lang, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <Select value={lang.code} onValueChange={(v) => update(idx, { code: v })}>
            <SelectTrigger className="flex-1 rounded-xl">
              <SelectValue placeholder="Idioma" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={lang.level} onValueChange={(v) => update(idx, { level: v })}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_LEVELS.map((lv) => (
                <SelectItem key={lv.value} value={lv.value}>{lv.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="rounded-xl">
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar idioma
      </Button>
    </div>
  );
}

interface CertificationsEditorProps {
  value: string[];
  onChange: (certs: string[]) => void;
}

export function CertificationsEditor({ value, onChange }: CertificationsEditorProps) {
  const add = () => onChange([...value, ""]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const update = (idx: number, v: string) =>
    onChange(value.map((c, i) => (i === idx ? v : c)));

  return (
    <div className="space-y-2">
      {value.map((cert, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            value={cert}
            onChange={(e) => update(idx, e.target.value)}
            placeholder="Ex: CADASTUR Nº 12345 / Curso de Guia Regional"
            className="rounded-xl"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="rounded-xl">
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar certificação
      </Button>
    </div>
  );
}

interface ChipsMultiSelectProps {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}

export function ChipsMultiSelect({ options, value, onChange }: ChipsMultiSelectProps) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
