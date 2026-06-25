import { useEffect, useState } from "react";
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
import { Building2, Pencil, ExternalLink } from "lucide-react";
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

function slugifySupplierName(value?: string | null): string {
  return (value || "parceiro")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "parceiro";
}

function getStablePublicSlug(operator: any): string {
  return operator?.public_slug?.trim() || slugifySupplierName(operator?.name);
}

export function SupplierProfileHeroCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [publicVisible, setPublicVisible] = useState(false);
  const ownOperatorQueryKey = ["supplier-own-operator", user?.id];

  const { data: operator, isLoading } = useQuery({
    queryKey: ownOperatorQueryKey,
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

  useEffect(() => {
    if (operator) setPublicVisible(!!operator.is_public_visible);
  }, [operator?.id, operator?.is_public_visible]);

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

  const publicSlug = getStablePublicSlug(operator);
  const publicUrl = `https://vitrine.tur.br/${publicSlug}`;

  const togglePublic = async (next: boolean) => {
    if (isTogglingPublic) return;

    const previousVisible = publicVisible;
    const previousOperator = operator;
    setIsTogglingPublic(true);
    setPublicVisible(next);

    // Optimistic update so the switch reflects the new state immediately
    qc.setQueryData(ownOperatorQueryKey, (prev: any) =>
      prev ? { ...prev, is_public_visible: next, public_slug: prev.public_slug?.trim() || publicSlug } : prev
    );

    try {
      const updatePayload: any = { is_public_visible: next };
      if (!operator.public_slug?.trim()) updatePayload.public_slug = publicSlug;

      const { data, error } = await supabase
        .from("tour_operators")
        .update(updatePayload)
        .eq("id", operator.id)
        .select("*")
        .maybeSingle();

      if (error || !data) throw error || new Error("Perfil não encontrado");

      const syncedOperator = {
        ...data,
        is_public_visible: !!data.is_public_visible,
        public_slug: data.public_slug?.trim() || publicSlug,
      };

      setPublicVisible(!!syncedOperator.is_public_visible);
      qc.setQueryData(ownOperatorQueryKey, syncedOperator);
      await qc.invalidateQueries({ queryKey: ownOperatorQueryKey, refetchType: "none" });
      toast.success(syncedOperator.is_public_visible ? "Perfil público ativado" : "Perfil público desativado");
    } catch {
      // Revert optimistic update on failure
      setPublicVisible(previousVisible);
      qc.setQueryData(ownOperatorQueryKey, previousOperator);
      toast.error("Não foi possível atualizar a visibilidade");
    } finally {
      setIsTogglingPublic(false);
    }
  };

  return (
    <>
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
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>

    {/* Standalone Public URL card */}
    <Card className="border-0 shadow-card mt-4 sm:mt-6 rounded-2xl overflow-hidden">
      <CardContent className="p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">URL Pública do Parceiro</p>
            <code className="text-sm font-mono break-all text-foreground">{publicUrl}</code>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir
              </a>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              Perfil público {publicVisible ? "ativado" : "desativado"}
            </p>
            <p className="text-xs text-muted-foreground">
              Seu perfil comercial pode ser divulgado livremente para agentes de viagens e parceiros do mercado.
            </p>
          </div>
          <Switch
            checked={publicVisible}
            onCheckedChange={togglePublic}
            disabled={isTogglingPublic}
          />
        </div>
      </CardContent>
    </Card>
    </>
  );
}