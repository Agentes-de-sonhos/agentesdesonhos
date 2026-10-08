import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Habilitação por agência do módulo Site → Blog (padrão: desligado). Somente admin da plataforma. */
export function AgencyBlogEntitlementToggle({ agencyId }: { agencyId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const key = ["admin-blog-entitlement", agencyId];
  const { data: active = false, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("agency_entitlements")
        .select("is_active")
        .eq("agency_id", agencyId)
        .eq("entitlement_key", "site_blog")
        .maybeSingle();
      return !!data?.is_active;
    },
  });

  const toggle = async (v: boolean) => {
    const { error } = await (supabase as any).from("agency_entitlements").upsert(
      { agency_id: agencyId, entitlement_key: "site_blog", is_active: v, granted_by: user?.id, notes: "Blog do site (admin)" },
      { onConflict: "agency_id,entitlement_key" },
    );
    if (error) return toast.error("Não foi possível alterar o Blog do site.");
    toast.success(v ? "Blog do site habilitado." : "Blog do site desligado.");
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label className="text-sm font-semibold">Blog do site</Label>
        <p className="text-xs text-muted-foreground">Libera o menu Site → Blog e as páginas /blog no site desta agência.</p>
      </div>
      <Switch checked={active} disabled={isLoading} onCheckedChange={toggle} />
    </div>
  );
}
