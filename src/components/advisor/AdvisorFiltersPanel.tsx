import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface FilterSectionDef {
  title: string;
  type: "checkbox" | "tag" | "price";
  options?: { key: string; label: string; icon?: string }[] | string[];
  filterKey: string;
  priceMax?: number;
  priceLabel?: string;
}

interface AdvisorFiltersPanelProps {
  filters: Record<string, any>;
  onChange: (filters: any) => void;
  sections: FilterSectionDef[];
  onClose?: () => void;
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function CheckboxItem({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
    </label>
  );
}

function toggleInArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

export function AdvisorFiltersPanel({ filters, onChange, sections, onClose }: AdvisorFiltersPanelProps) {
  const activeCount = sections.reduce((count, section) => {
    if (section.type === "price") {
      return count + (filters[section.filterKey] ? 1 : 0);
    }
    const arr = filters[section.filterKey];
    return count + (Array.isArray(arr) ? arr.length : 0);
  }, 0);

  const clearAll = () => {
    const cleared: Record<string, any> = { ...filters };
    sections.forEach(s => {
      if (s.type === "price") cleared[s.filterKey] = null;
      else cleared[s.filterKey] = [];
    });
    onChange(cleared);
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Filtros</span>
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7">
              Limpar
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="p-4 space-y-5">
          {sections.map((section, idx) => {
            if (section.type === "price") {
              const max = section.priceMax || 1000;
              return (
                <div key={section.filterKey}>
                  <FilterSection title={section.title}>
                    <div className="space-y-3">
                      <Slider
                        min={0}
                        max={max}
                        step={10}
                        value={filters[section.filterKey] ? [filters[section.filterKey][1]] : [max]}
                        onValueChange={([v]) => onChange({ ...filters, [section.filterKey]: [0, v] })}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>$0</span>
                        <span className="font-medium text-foreground">
                          até ${filters[section.filterKey] ? filters[section.filterKey][1] : `${max}+`}
                        </span>
                      </div>
                    </div>
                  </FilterSection>
                  {idx < sections.length - 1 && <Separator className="mt-5" />}
                </div>
              );
            }

            const options = section.options || [];
            return (
              <div key={section.filterKey}>
                <FilterSection title={section.title}>
                  <div className="space-y-1.5">
                    {options.map((opt) => {
                      const isObj = typeof opt === "object";
                      const key = isObj ? (opt as any).key : opt;
                      const label = isObj ? `${(opt as any).icon ? (opt as any).icon + " " : ""}${(opt as any).label}` : opt;
                      return (
                        <CheckboxItem
                          key={key}
                          label={label as string}
                          checked={(filters[section.filterKey] || []).includes(key)}
                          onCheckedChange={() => onChange({ ...filters, [section.filterKey]: toggleInArray(filters[section.filterKey] || [], key) })}
                        />
                      );
                    })}
                  </div>
                </FilterSection>
                {idx < sections.length - 1 && <Separator className="mt-5" />}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
