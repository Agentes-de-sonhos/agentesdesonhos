import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  DEFAULT_OFFICE_HOURS,
  DEFAULT_TIMEZONE,
  normalizeOfficeHours,
  type OfficeHours,
} from "@/lib/officeHours";

export type ProductLandingStatus = "draft" | "active" | "disabled";

export interface ProductLanding {
  id: string;
  user_id: string;
  product_key: string;
  status: ProductLandingStatus;
  slug: string;
  override_agency_name: string | null;
  override_whatsapp: string | null;
  override_phone: string | null;
  override_email: string | null;
  override_logo_url: string | null;
  override_consultant_name: string | null;
  override_consultant_role: string | null;
  override_consultant_photo_url: string | null;
  override_city: string | null;
  whatsapp_message_template: string | null;
  timezone: string;
  office_hours: OfficeHours;
  views_count: number;
  leads_count: number;
  created_at: string;
  updated_at: string;
}

function mapLanding(row: any): ProductLanding {
  return {
    ...row,
    timezone: row.timezone || DEFAULT_TIMEZONE,
    office_hours: normalizeOfficeHours(row.office_hours),
  } as ProductLanding;
}

export function useAgencyPublicSlug() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["agency-public-slug", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("public_slug, agency_name, name, agency_logo_url, phone, city, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as {
        public_slug: string | null;
        agency_name: string | null;
        name: string | null;
        agency_logo_url: string | null;
        phone: string | null;
        city: string | null;
        avatar_url: string | null;
      } | null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useProductLandings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["product-landings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("agency_product_landings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapLanding);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["product-landings"] });
    queryClient.invalidateQueries({ queryKey: ["agency-public-slug"] });
  };

  /** Persists the agency public slug (used as first URL segment). */
  const saveSlug = useMutation({
    mutationFn: async (slug: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data: check, error: rpcErr } = await supabase.rpc(
        "check_public_slug_available" as any,
        { p_slug: slug }
      );
      if (rpcErr) throw rpcErr;
      const res = check as any;
      if (!res?.available) {
        const reason = res?.reason;
        throw new Error(
          reason === "taken"
            ? "Esse endereço já está em uso por outra agência."
            : reason === "reserved"
              ? "Esse endereço é reservado pelo sistema. Escolha outro."
              : "Endereço inválido. Use pelo menos 3 caracteres."
        );
      }
      const normalized = res.normalized as string;
      const { error } = await supabase
        .from("profiles")
        .update({ public_slug: normalized } as never)
        .eq("user_id", user.id);
      if (error) throw error;
      return normalized;
    },
  });

  const enable = useMutation({
    mutationFn: async ({
      productKey,
      slug,
      ...rest
    }: { productKey: string; slug: string } & Partial<ProductLanding>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const normalized = await saveSlug.mutateAsync(slug);
      const { data, error } = await supabase
        .from("agency_product_landings")
        .upsert(
          {
            user_id: user.id,
            product_key: productKey,
            slug: normalized,
            status: "active",
            timezone: rest.timezone || DEFAULT_TIMEZONE,
            office_hours: (rest.office_hours || DEFAULT_OFFICE_HOURS) as never,
            override_agency_name: rest.override_agency_name ?? null,
            override_whatsapp: rest.override_whatsapp ?? null,
            override_phone: rest.override_phone ?? null,
            override_email: rest.override_email ?? null,
            override_logo_url: rest.override_logo_url ?? null,
            override_consultant_name: rest.override_consultant_name ?? null,
            override_consultant_role: rest.override_consultant_role ?? null,
            override_consultant_photo_url: rest.override_consultant_photo_url ?? null,
            override_city: rest.override_city ?? null,
            whatsapp_message_template: rest.whatsapp_message_template ?? null,
          } as never,
          { onConflict: "user_id,product_key" }
        )
        .select()
        .single();
      if (error) throw error;
      return mapLanding(data);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Landing page publicada!");
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível publicar a página"),
  });

  const update = useMutation({
    mutationFn: async ({ id, slug, ...patch }: Partial<ProductLanding> & { id: string }) => {
      const payload: Record<string, unknown> = { ...patch };
      if (slug) payload.slug = await saveSlug.mutateAsync(slug);
      const { data, error } = await supabase
        .from("agency_product_landings")
        .update(payload as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapLanding(data);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Alterações salvas!");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao salvar alterações"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProductLandingStatus }) => {
      const { error } = await supabase
        .from("agency_product_landings")
        .update({ status } as never)
        .eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      invalidate();
      toast.success(status === "active" ? "Página reativada!" : "Página desativada.");
    },
    onError: () => toast.error("Não foi possível alterar o status"),
  });

  return { list, enable, update, setStatus, saveSlug };
}

export function useProductLandingLeads(productKey?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["product-landing-leads", user?.id, productKey ?? "all"],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from("product_landing_leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (productKey) query = query.eq("product_key", productKey);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}