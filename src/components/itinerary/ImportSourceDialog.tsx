import { Briefcase, ChevronRight, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickFile: () => void;
  onPickQuote: () => void;
}

/** Escolha da origem da importação: arquivo de roteiro pronto ou orçamento. */
export function ImportSourceDialog({ open, onOpenChange, onPickFile, onPickQuote }: Props) {
  const options = [
    {
      key: "file",
      icon: FileText,
      title: "De um roteiro pronto",
      description: "Envie PDF, Word ou cole o texto da programação e a IA organiza os dias.",
      action: onPickFile,
    },
    {
      key: "quote",
      icon: Briefcase,
      title: "De um orçamento",
      description: "Aproveite cliente, datas, voos, hotéis, passeios e transfers já cadastrados.",
      action: onPickQuote,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar roteiro</DialogTitle>
          <DialogDescription>De onde você quer trazer as informações?</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  option.action();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-4 text-left transition hover:border-primary/50 hover:bg-muted/40"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImportSourceDialog;
