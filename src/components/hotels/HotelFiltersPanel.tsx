import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  HotelFilters,
  AMENITY_KEYS,
  CATEGORY_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  TAG_OPTIONS,
  CONDITION_OPTIONS,
} from "@/hooks/useHotels";

interface HotelFiltersPanelProps {
  filters: HotelFilters;
  onChange: (filters: HotelFilters) => void;
  regions: string[];
  brands: string[];
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

export function HotelFiltersPanel({ filters, onChange, regions, brands, onClose }: HotelFiltersPanelProps) {
  const activeCount =
    filters.regions.length +
    filters.categories.length +
    filters.starRatings.length +
    filters.brands.length +
    filters.propertyTypes.length +
    filters.amenities.length +
    filters.tags.length +
    filters.conditions.length +
    (filters.priceRange ? 1 : 0);

  const clearAll = () => {
    onChange({
      ...filters,
      regions: [],
      categories: [],
      starRatings: [],
      brands: [],
      propertyTypes: [],
      amenities: [],
      tags: [],
      conditions: [],
      priceRange: null,
    });
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
          {/* Regions */}
          {regions.length > 0 && (
            <>
              <FilterSection title="Região">
                <div className="space-y-1.5">
                  {regions.map((r) => (
                    <CheckboxItem
                      key={r}
                      label={r}
                      checked={filters.regions.includes(r)}
                      onCheckedChange={() => onChange({ ...filters, regions: toggleInArray(filters.regions, r) })}
                    />
                  ))}
                </div>
              </FilterSection>
              <Separator />
            </>
          )}

          {/* Category */}
          <FilterSection title="Categoria">
            <div className="space-y-1.5">
              {CATEGORY_OPTIONS.map((c) => (
                <CheckboxItem
                  key={c}
                  label={c}
                  checked={filters.categories.includes(c)}
                  onCheckedChange={() => onChange({ ...filters, categories: toggleInArray(filters.categories, c) })}
                />
              ))}
            </div>
          </FilterSection>
          <Separator />

          {/* Star Rating */}
          <FilterSection title="Classificação">
            <div className="flex gap-2">
              {[3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({ ...filters, starRatings: toggleInArray(filters.starRatings, s) })}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    filters.starRatings.includes(s)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/40"
                  }`}
                >
                  {s} ⭐
                </button>
              ))}
            </div>
          </FilterSection>
          <Separator />

          {/* Tags */}
          <FilterSection title="Preferências">
            <div className="space-y-1.5">
              {TAG_OPTIONS.map((t) => (
                <CheckboxItem
                  key={t.key}
                  label={`${t.icon} ${t.label}`}
                  checked={filters.tags.includes(t.key)}
                  onCheckedChange={() => onChange({ ...filters, tags: toggleInArray(filters.tags, t.key) })}
                />
              ))}
            </div>
          </FilterSection>
          <Separator />

          {/* Amenities */}
          <FilterSection title="Comodidades">
            <div className="space-y-1.5">
              {AMENITY_KEYS.map((a) => (
                <CheckboxItem
                  key={a.key}
                  label={`${a.icon} ${a.label}`}
                  checked={filters.amenities.includes(a.key)}
                  onCheckedChange={() => onChange({ ...filters, amenities: toggleInArray(filters.amenities, a.key) })}
                />
              ))}
            </div>
          </FilterSection>
          <Separator />

          {/* Property Type */}
          <FilterSection title="Tipo de Propriedade">
            <div className="space-y-1.5">
              {PROPERTY_TYPE_OPTIONS.map((p) => (
                <CheckboxItem
                  key={p}
                  label={p}
                  checked={filters.propertyTypes.includes(p)}
                  onCheckedChange={() => onChange({ ...filters, propertyTypes: toggleInArray(filters.propertyTypes, p) })}
                />
              ))}
            </div>
          </FilterSection>
          <Separator />

          {/* Brands */}
          {brands.length > 0 && (
            <>
              <FilterSection title="Marca">
                <div className="space-y-1.5">
                  {brands.map((b) => (
                    <CheckboxItem
                      key={b}
                      label={b}
                      checked={filters.brands.includes(b)}
                      onCheckedChange={() => onChange({ ...filters, brands: toggleInArray(filters.brands, b) })}
                    />
                  ))}
                </div>
              </FilterSection>
              <Separator />
            </>
          )}

          {/* Conditions */}
          <FilterSection title="Condições">
            <div className="space-y-1.5">
              {CONDITION_OPTIONS.map((c) => (
                <CheckboxItem
                  key={c.key}
                  label={c.label}
                  checked={filters.conditions.includes(c.key)}
                  onCheckedChange={() => onChange({ ...filters, conditions: toggleInArray(filters.conditions, c.key) })}
                />
              ))}
            </div>
          </FilterSection>
          <Separator />

          {/* Price Range */}
          <FilterSection title="Preço a partir de (USD)">
            <div className="space-y-3">
              <Slider
                min={0}
                max={2000}
                step={50}
                value={filters.priceRange ? [filters.priceRange[1]] : [2000]}
                onValueChange={([v]) => onChange({ ...filters, priceRange: [0, v] })}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$0</span>
                <span className="font-medium text-foreground">
                  até ${filters.priceRange ? filters.priceRange[1] : "2.000+"}
                </span>
              </div>
            </div>
          </FilterSection>
        </div>
      </ScrollArea>
    </div>
  );
}
