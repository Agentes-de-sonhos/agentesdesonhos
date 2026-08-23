import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const CODE_KINDS = [
  { value: "carteira", label: "Carteira da viagem" },
  { value: "orcamento", label: "Orçamento" },
  { value: "roteiro", label: "Roteiro" },
  { value: "fatura", label: "Fatura" },
] as const;

/**
 * Acesso legado por código de link, preservado integralmente — apresentado como
 * opção SECUNDÁRIA e recolhível, para não competir com o login da Área do Cliente.
 */
export function ClientAreaCodeAccess({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof CODE_KINDS)[number]["value"]>("carteira");
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().replace(/\s+/g, "");
    if (!clean) return;
    navigate(`/${kind}/${encodeURIComponent(clean)}`);
  };

  return (
    <div className={cn("rounded-3xl border border-border/60 bg-card/60 p-4 md:p-5", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="ca-code-panel"
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Recebeu um link com código?
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </button>

      {open && (
        <div id="ca-code-panel" className="mt-4 border-t border-border/60 pt-4">
          <p className="text-sm text-muted-foreground">
            Utilize esta opção somente para acessar um conteúdo específico enviado pela sua
            agência.
          </p>

          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ca-code-kind">O que você quer acessar?</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger id="ca-code-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CODE_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acesso-codigo">Código de acesso</Label>
              <Input
                id="acesso-codigo"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Cole aqui o código do seu link"
                autoComplete="off"
              />
            </div>

            <Button type="submit" variant="outline" className="min-h-11 w-full sm:w-auto">
              Acessar <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
