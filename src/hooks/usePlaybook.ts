import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PlaybookDestination, PlaybookSection, PlaybookContent } from "@/types/playbook";

export function usePlaybook(slug?: string) {
  const { data: destinations = [], isLoading: destinationsLoading } = useQuery({
    queryKey: ["playbook-destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playbook_destinations")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as PlaybookDestination[];
    },
  });

  const { data: destination, isLoading: destinationLoading } = useQuery({
    queryKey: ["playbook-destination", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("playbook_destinations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as PlaybookDestination | null;
    },
    enabled: !!slug,
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["playbook-sections", destination?.id],
    queryFn: async () => {
      if (!destination) return [];
      const { data, error } = await supabase
        .from("playbook_sections")
        .select("*")
        .eq("destination_id", destination.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((s) => ({
        ...s,
        content: (typeof s.content === 'string' ? JSON.parse(s.content) : s.content) as PlaybookContent,
      })) as PlaybookSection[];
    },
    enabled: !!destination,
  });

  return {
    destinations,
    destination,
    sections,
    isLoading: destinationsLoading || destinationLoading || sectionsLoading,
  };
}

export function usePlaybookAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDestination = useMutation({
    mutationFn: async (dest: Partial<PlaybookDestination>) => {
      const { error } = await supabase.from("playbook_destinations").insert(dest as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook-destinations"] });
      toast({ title: "Destino criado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateDestination = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlaybookDestination> & { id: string }) => {
      const { error } = await supabase.from("playbook_destinations").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook-destinations"] });
      toast({ title: "Destino atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteDestination = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playbook_destinations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook-destinations"] });
      toast({ title: "Destino excluído!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const upsertSection = useMutation({
    mutationFn: async (section: { destination_id: string; tab_key: string; title: string; content: PlaybookContent; order_index: number }) => {
      const { error } = await supabase
        .from("playbook_sections")
        .upsert(
          { ...section, content: section.content as any },
          { onConflict: "destination_id,tab_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook-sections"] });
      toast({ title: "Seção salva!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { createDestination, updateDestination, deleteDestination, upsertSection };
}
