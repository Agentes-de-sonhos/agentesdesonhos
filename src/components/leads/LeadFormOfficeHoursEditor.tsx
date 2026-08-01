import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import {
  DAY_KEYS,
  DAY_LABELS,
  parseHm,
  type DayKey,
  type HourWindow,
  type OfficeHours,
} from "@/lib/officeHours";

const ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * Weekly service-window editor. Windows are stored as ["HH:MM","HH:MM"] pairs
 * and evaluated on the server in the agency's timezone.
 */
export function LeadFormOfficeHoursEditor({
  value,
  onChange,
}: {
  value: OfficeHours;
  onChange: (next: OfficeHours) => void;
}) {
  const patchDay = (day: DayKey, windows: HourWindow[]) => {
    const next: OfficeHours = { ...value };
    for (const key of DAY_KEYS) next[key] = next[key] ?? [];
    next[day] = windows;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {ORDER.map((day) => {
        const windows = value[day] ?? [];
        const enabled = windows.length > 0;
        return (
          <div key={day} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {enabled ? "Atendendo" : "Fechado"}
                </span>
                <Switch
                  checked={enabled}
                  onCheckedChange={(on) => patchDay(day, on ? [["08:00", "18:00"]] : [])}
                />
              </div>
            </div>

            {enabled && (
              <div className="space-y-2">
                {windows.map((w, index) => {
                  const invalid = parseHm(w[0]) === null || parseHm(w[1]) === null;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={w[0]}
                        onChange={(e) => {
                          const next = [...windows];
                          next[index] = [e.target.value, w[1]];
                          patchDay(day, next);
                        }}
                        className={invalid ? "border-destructive" : ""}
                      />
                      <span className="text-xs text-muted-foreground">às</span>
                      <Input
                        type="time"
                        value={w[1]}
                        onChange={(e) => {
                          const next = [...windows];
                          next[index] = [w[0], e.target.value];
                          patchDay(day, next);
                        }}
                        className={invalid ? "border-destructive" : ""}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => patchDay(day, windows.filter((_, i) => i !== index))}
                        aria-label="Remover intervalo"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => patchDay(day, [...windows, ["14:00", "18:00"]])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar intervalo
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
