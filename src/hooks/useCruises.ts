import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanhiaMaritima, Regiao, PerfilCliente } from "@/types/cruises";

export function useCruises() {
  return useQuery({
    queryKey: ["companhias-maritimas"],
    queryFn: async (): Promise<CompanhiaMaritima[]> => {
      // Fetch companies
      const { data: companies, error } = await supabase
        .from("companhias_maritimas")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;

      // Fetch all region links
      const { data: regLinks } = await supabase
        .from("companhias_maritimas_regioes")
        .select("companhia_id, regiao_id, regioes(id, nome, slug, ordem_exibicao, ativo)");

      // Fetch all profile links
      const { data: profLinks } = await supabase
        .from("companhias_maritimas_perfis")
        .select("companhia_id, perfil_id, perfis_cliente(id, nome, slug, ordem_exibicao, ativo)");

      // Map regions and profiles to companies
      const regMap = new Map<string, Regiao[]>();
      (regLinks || []).forEach((link: any) => {
        if (!link.regioes) return;
        const arr = regMap.get(link.companhia_id) || [];
        arr.push(link.regioes);
        regMap.set(link.companhia_id, arr);
      });

      const profMap = new Map<string, PerfilCliente[]>();
      (profLinks || []).forEach((link: any) => {
        if (!link.perfis_cliente) return;
        const arr = profMap.get(link.companhia_id) || [];
        arr.push(link.perfis_cliente);
        profMap.set(link.companhia_id, arr);
      });

      return (companies || []).map((c: any) => ({
        ...c,
        regioes: (regMap.get(c.id) || []).sort((a, b) => a.ordem_exibicao - b.ordem_exibicao),
        perfis: (profMap.get(c.id) || []).sort((a, b) => a.ordem_exibicao - b.ordem_exibicao),
      }));
    },
  });
}

export function useRegioes() {
  return useQuery({
    queryKey: ["regioes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regioes")
        .select("*")
        .eq("ativo", true)
        .order("ordem_exibicao");
      if (error) throw error;
      return data as Regiao[];
    },
  });
}

export function usePerfisCliente() {
  return useQuery({
    queryKey: ["perfis-cliente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_cliente")
        .select("*")
        .eq("ativo", true)
        .order("ordem_exibicao");
      if (error) throw error;
      return data as PerfilCliente[];
    },
  });
}

// Admin mutations
export function useAdminCruises() {
  const queryClient = useQueryClient();

  const upsertCompany = useMutation({
    mutationFn: async (data: {
      id?: string;
      nome: string;
      tipo: string;
      categoria: string;
      subtipo?: string;
      descricao_curta?: string;
      logo_url?: string;
      website?: string;
      ativo?: boolean;
      regioes: string[];
      perfis: string[];
    }) => {
      const { id, regioes, perfis, ...companyData } = data;

      let companyId = id;
      if (id) {
        const { error } = await supabase
          .from("companhias_maritimas")
          .update(companyData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("companhias_maritimas")
          .insert(companyData)
          .select("id")
          .single();
        if (error) throw error;
        companyId = inserted.id;
      }

      // Sync regions
      await supabase
        .from("companhias_maritimas_regioes")
        .delete()
        .eq("companhia_id", companyId!);
      if (regioes.length > 0) {
        await supabase
          .from("companhias_maritimas_regioes")
          .insert(regioes.map((r) => ({ companhia_id: companyId!, regiao_id: r })));
      }

      // Sync profiles
      await supabase
        .from("companhias_maritimas_perfis")
        .delete()
        .eq("companhia_id", companyId!);
      if (perfis.length > 0) {
        await supabase
          .from("companhias_maritimas_perfis")
          .insert(perfis.map((p) => ({ companhia_id: companyId!, perfil_id: p })));
      }

      return companyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companhias-maritimas"] });
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("companhias_maritimas")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companhias-maritimas"] });
    },
  });

  const addRegiao = useMutation({
    mutationFn: async (data: { nome: string; slug: string }) => {
      const { error } = await supabase.from("regioes").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regioes"] });
    },
  });

  const addPerfil = useMutation({
    mutationFn: async (data: { nome: string; slug: string }) => {
      const { error } = await supabase.from("perfis_cliente").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis-cliente"] });
    },
  });

  return { upsertCompany, deleteCompany, addRegiao, addPerfil };
}
