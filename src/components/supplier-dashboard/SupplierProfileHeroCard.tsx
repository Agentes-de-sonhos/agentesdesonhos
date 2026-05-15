import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Pencil, ExternalLink, Megaphone, Copy, Check,
  Eye, Users, FileText, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

function calcCompletude(op: any): number {
  if (!op) return 0;
  const fields = [
    op.name, op.logo_url, op.short_description, op.specialties,
    op.how_to_sell, op.commercial_contacts, op.website, op.instagram,
    op.competitive_advantages, op.business_hours,
  ];
  const filled = fields.filter((f) => f && (typeof f !== "object" || Object.keys(f).length > 0)).length;
  return Math.round((filled / fields.length) * 100);
}

export function SupplierProfileHeroCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: operator, isLoading } = useQuery({
    queryKey: ["supplier-own-operator", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (!operator) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Seu perfil comercial ainda não foi configurado. Procure o suporte.
        </CardContent>
      </Card>
    );
  }

  const completude = calcCompletude(operator);
  const statusBadge = {
    approved: { label: "Aprovado", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    pending: { label: "Em análise", className: "bg-amber-100 text-amber-700 border-amber-200" },
    rejected: { label: "Rejeitado", className: "bg-rose-100 text-rose-700 border-rose-200" },
  }[operator.approval_status as string] || { label: operator.approval_status, className: "" };

  const publicUrl = operator.public_slug
    ? `https://vitrine.tur.br/${operator.public_slug}`
    : `${window.location.origin}/mapa-turismo/operadora/${operator.id}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("URL copiada");
    setTimeout(() => setCopied(false), 1800);
  };

  const togglePublic = async (next: boolean) => {
    const { error } = await supabase
      .from("tour_operators")
      .update({ is_public_visible: next })
      .eq("id", operator.id);
    if (error) {
      toast.error("Não foi possível atualizar a visibilidade");
      return;
    }
    qc.invalidateQueries({ queryKey: ["supplier-own-operator", user?.id] });
    toast.success(next ? "Perfil público ativado" : "Perfil público desativado");
  };

  const indicators = [
    { icon: Eye, label: "Visualizações", value: "—" },
    { icon: FileText, label: "Materiais publicados", value: Array.isArray(operator.materials) ? operator.materials.length : 0 },
    { icon: Users, label: "Agentes alcançados", value: "—" },
    { icon: TrendingUp, label: "Contatos recebidos", value: "—" },
  ];

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border/40">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Logo */}
            <div className="flex-shrink-0">
              {operator.logo_url ? (
                <img
                  src={operator.logo_url}
                  alt={operator.name}
                  className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-contain bg-white border border-border p-2 shadow-sm"
                />
              ) : (
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-2xl bg-muted flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                  Perfil do Parceiro
                </p>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
                  {operator.name}
                </h2>
                <p className="text-sm text-muted-foreground">{operator.category}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={statusBadge.className}>
                  {statusBadge.label}
                </Badge>
                <Badge variant="outline" className="bg-background">
                  Perfil {completude}% completo
                </Badge>
              </div>

              <Progress value={completude} className="h-2 max-w-md" />

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => navigate("/meu-perfil-empresa")} className="gap-2">
                  <Pencil className="h-4 w-4" /> Editar Perfil Comercial
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(publicUrl, "_blank")}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" /> Visualizar Perfil Público
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/materiais")}
                  className="gap-2"
                >
                  <Megaphone className="h-4 w-4" /> Inserir Materiais
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Public URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1">URL Pública do Parceiro</p>
              <code className="text-sm font-mono break-all text-foreground">{publicUrl}</code>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(publicUrl, "_blank")} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Perfil público {operator.is_public_visible ? "ativado" : "desativado"}
              </p>
              <p className="text-xs text-muted-foreground">
                Seu perfil comercial pode ser divulgado livremente para agentes de viagens e parceiros do mercado.
              </p>
            </div>
            <Switch
              checked={!!operator.is_public_visible}
              onCheckedChange={togglePublic}
            />
          </div>
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {indicators.map((ind) => (
            <div
              key={ind.label}
              className="rounded-xl border border-border/60 bg-background p-4 hover:border-primary/40 transition-colors"
            >
              <ind.icon className="h-4 w-4 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">{ind.label}</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">{ind.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}