import { useState } from "react";
import { Check, ChevronDown, UserCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCommercialSignatures } from "@/hooks/useCommercialSignatures";
import { buildSnapshot } from "@/lib/commercialSignature";
import type { SignatureSnapshot, CommercialSignature } from "@/types/signature";
import { SignatureFormDialog } from "./SignatureFormDialog";
import { cn } from "@/lib/utils";

interface Props {
  value: SignatureSnapshot | null | undefined;
  onChange: (snap: SignatureSnapshot | null) => void;
  className?: string;
  label?: string;
}

export function SignatureSelector({ value, onChange, className, label }: Props) {
  const { activeSignatures, signatures, defaultSignature, isLoading, create } = useCommercialSignatures();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // If nothing selected yet but a default exists, suggest it
  const current = value;
  const currentSig: CommercialSignature | undefined = value?.id
    ? signatures.find((s) => s.id === value.id)
    : undefined;

  const renderCard = (s: CommercialSignature, selected: boolean) => (
    <button
      key={s.id}
      type="button"
      onClick={() => { onChange(buildSnapshot(s)); setOpen(false); }}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:bg-muted/50",
        selected ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {s.photo_url ? (
        <img src={s.photo_url} alt={s.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <UserCircle2 className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{s.name}</p>
        {s.title && <p className="text-xs text-muted-foreground truncate">{s.title}</p>}
      </div>
      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );

  return (
    <div className={className}>
      {label && <p className="text-sm font-medium mb-2">{label}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-auto py-2 px-3">
            <span className="flex items-center gap-2 min-w-0">
              {current?.photo_url ? (
                <img src={current.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <UserCircle2 className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-left min-w-0">
                <span className="block text-sm font-medium truncate">{current?.name || "Selecionar assinatura"}</span>
                {current?.title && <span className="block text-xs text-muted-foreground truncate">{current.title}</span>}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(420px,90vw)] p-2" align="start">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-3">Carregando...</p>
          ) : activeSignatures.length === 0 ? (
            <div className="p-3 space-y-3">
              <p className="text-sm text-muted-foreground">Nenhuma assinatura cadastrada ainda.</p>
              <Button size="sm" className="w-full" onClick={() => { setCreateOpen(true); setOpen(false); }}>
                <Plus className="h-4 w-4 mr-1" /> Criar primeira assinatura
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {activeSignatures.map((s) => renderCard(s, s.id === current?.id))}
              {current && (
                <button
                  type="button"
                  onClick={() => { onChange(null); setOpen(false); }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2"
                >
                  Limpar assinatura do documento
                </button>
              )}
              <button
                type="button"
                onClick={() => { setCreateOpen(true); setOpen(false); }}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Nova assinatura
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <SignatureFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={null}
        onSubmit={async (payload) => {
          const created = await create.mutateAsync(payload);
          if (created) onChange(buildSnapshot(created));
        }}
      />
    </div>
  );
}