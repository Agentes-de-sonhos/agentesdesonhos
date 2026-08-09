import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, FileText, Map, Receipt, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { type AgencyDomainInfo, agencyDisplayName } from "@/lib/agencyDomains";

const KINDS = [
  { value: "carteira", label: "Carteira da viagem", icon: Wallet },
  { value: "orcamento", label: "Orçamento", icon: FileText },
  { value: "roteiro", label: "Roteiro", icon: Map },
  { value: "fatura", label: "Fatura", icon: Receipt },
] as const;

/**
 * Entry point for the client's existing public content. No parallel auth:
 * the code itself (and its own password, when set) remains the credential.
 */
export default function AgencyClientArea({ info }: { info: AgencyDomainInfo }) {
  const navigate = useNavigate();
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("carteira");
  const [code, setCode] = useState("");
  const name = agencyDisplayName(info);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().replace(/\s+/g, "");
    if (!clean) return;
    navigate(`/${kind}/${encodeURIComponent(clean)}`);
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 md:py-20">
      <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Área do Cliente</h1>
      <div className="mt-2 h-1 w-fit min-w-16 rounded-full bg-primary/70" />
      <p className="mt-4 text-muted-foreground">
        Acesse seus conteúdos enviados pela {name} com o código do link recebido. Se o conteúdo
        tiver senha, ela continua sendo solicitada normalmente.
      </p>

      <Card className="mt-8 p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>O que você quer acessar?</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
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

          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Acessar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </Card>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {KINDS.map((k) => (
          <div key={k.value} className="flex items-center gap-3 rounded-xl border border-border/60 p-4">
            <k.icon className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">{k.label}</span>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Não encontrou o código? Fale com a {name} e peça o link novamente.
      </p>
    </section>
  );
}