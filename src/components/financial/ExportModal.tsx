import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ExportPeriod = "today" | "week" | "month" | "year" | "custom";
export type ExportFormat = "xlsx" | "pdf";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabName: string;
  onExport: (period: { start: Date; end: Date }, format: ExportFormat) => Promise<void>;
}

function getPeriodDates(period: ExportPeriod, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    case "week": {
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      return { start: monday, end: new Date(today.getTime() + 86400000 - 1) };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(today.getTime() + 86400000 - 1) };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(today.getTime() + 86400000 - 1) };
    case "custom":
      return {
        start: customStart ? new Date(customStart + "T00:00:00") : today,
        end: customEnd ? new Date(customEnd + "T23:59:59") : new Date(today.getTime() + 86400000 - 1),
      };
  }
}

const PERIOD_OPTIONS: { value: ExportPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
  { value: "year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
];

export function ExportModal({ open, onOpenChange, tabName, onExport }: ExportModalProps) {
  const [period, setPeriod] = useState<ExportPeriod>("month");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const dates = getPeriodDates(period, customStart, customEnd);
      await onExport(dates, format);
      onOpenChange(false);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar {tabName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Period */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Período</Label>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-colors",
                    period === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Formato</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat("xlsx")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors",
                  format === "xlsx"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <FileSpreadsheet className="h-5 w-5" />
                Planilha
              </button>
              <button
                onClick={() => setFormat("pdf")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors",
                  format === "pdf"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <FileText className="h-5 w-5" />
                PDF
              </button>
            </div>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Gerar arquivo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Button to trigger export modal
export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-1.5">
      <Download className="h-4 w-4" />
      Exportar
    </Button>
  );
}
