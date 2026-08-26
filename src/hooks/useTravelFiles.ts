import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  TravelFile,
  TravelFileListItem,
  TravelFileNote,
  TravelFileService,
} from "@/types/travelFile";

const sb = supabase as any;

export interface AgencyTeamOption {
  id: string;
  name: string;
  roleTitle: string | null;
}

/** Colaboradores da própria agência — usado para definir responsáveis do file. */
export function useAgencyTeamDirectory(enabled = true) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["agency-team-directory", user?.id],
    enabled: !!user?.id && enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AgencyTeamOption[]> => {
      const { data, error } = await sb.rpc("agency_team_directory");
      if (error) throw error;
      return ((data || []) as any[])
        .filter((m) => m.status === "active")
        .map((m) => ({
          id: m.member_id as string,
          name: (m.full_name as string) || "Colaborador",
          roleTitle: (m.role_title as string) || null,
        }));
    },
  });

  const byId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of query.data ?? []) map[member.id] = member.name;
    return map;
  }, [query.data]);

  return { members: query.data ?? [], memberNames: byId, isLoading: query.isLoading };
}

/**
 * Lista os processos de reserva (files) visíveis para o usuário.
 * A RLS já isola por agência: nenhuma agência lê files de outra.
 */
export function useTravelFiles(enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { memberNames } = useAgencyTeamDirectory(enabled);

  const query = useQuery({
    queryKey: ["travel-files", user?.id],
    enabled: !!user?.id && enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<TravelFileListItem[]> => {
      const { data: files, error } = await sb
        .from("travel_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (files || []) as TravelFile[];
      if (rows.length === 0) return [];

      const fileIds = rows.map((f) => f.id);
      const clientIds = Array.from(
        new Set(rows.map((f) => f.client_id).filter((v): v is string => !!v)),
      );

      const [servicesRes, clientsRes, viewsRes] = await Promise.all([
        sb
          .from("travel_file_services")
          .select("id, file_id, product_name, service_type")
          .in("file_id", fileIds),
        clientIds.length
          ? supabase.from("clients").select("id, name").in("id", clientIds)
          : Promise.resolve({ data: [], error: null } as any),
        sb.from("travel_file_views").select("file_id").in("file_id", fileIds),
      ]);

      const byFile = new Map<string, { count: number; names: string[] }>();
      for (const svc of (servicesRes.data || []) as any[]) {
        const entry = byFile.get(svc.file_id) || { count: 0, names: [] };
        entry.count += 1;
        if (entry.names.length < 6) entry.names.push(String(svc.product_name || ""));
        byFile.set(svc.file_id, entry);
      }
      const clientName = new Map<string, string>();
      for (const c of (clientsRes.data || []) as any[]) clientName.set(c.id, c.name);
      const viewed = new Set<string>(((viewsRes.data || []) as any[]).map((v) => v.file_id));

      return rows.map((f) => ({
        ...f,
        clientName: f.client_id ? clientName.get(f.client_id) ?? null : null,
        servicesCount: byFile.get(f.id)?.count ?? 0,
        serviceNames: byFile.get(f.id)?.names ?? [],
        unread: !viewed.has(f.id),
      }));
    },
  });

  const markViewed = useMutation({
    mutationFn: async (file: { id: string; agency_id: string }) => {
      if (!user?.id) return;
      await sb
        .from("travel_file_views")
        .upsert(
          { file_id: file.id, agency_id: file.agency_id, user_id: user.id, viewed_at: new Date().toISOString() },
          { onConflict: "file_id,user_id" },
        );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["travel-files"] }),
  });

  const files = useMemo(
    () =>
      (query.data ?? []).map((f) => ({
        ...f,
        responsibleName: f.responsible_team_member_id
          ? memberNames[f.responsible_team_member_id] ?? null
          : null,
      })),
    [query.data, memberNames],
  );
  const unreadCount = useMemo(() => files.filter((f) => f.unread).length, [files]);

  return {
    files,
    unreadCount,
    isLoading: query.isLoading,
    refetch: query.refetch,
    markViewed: markViewed.mutateAsync,
  };
}

/** Detalhes de um processo de reserva: file, serviços congelados e histórico. */
export function useTravelFile(fileId?: string) {
  return useQuery({
    queryKey: ["travel-file", fileId],
    enabled: !!fileId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: file, error } = await sb
        .from("travel_files")
        .select("*")
        .eq("id", fileId)
        .maybeSingle();
      if (error) throw error;
      if (!file) return null;

      const typed = file as TravelFile;
      const [servicesRes, eventsRes, clientRes, quoteRes] = await Promise.all([
        sb
          .from("travel_file_services")
          .select("*")
          .eq("file_id", typed.id)
          .order("created_at", { ascending: true }),
        sb
          .from("quote_booking_request_events")
          .select("id, event_type, actor_type, payload, created_at")
          .eq("request_id", typed.current_request_id ?? typed.root_request_id)
          .order("created_at", { ascending: true }),
        typed.client_id
          ? supabase
              .from("clients")
              .select("id, name, email, phone")
              .eq("id", typed.client_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        typed.quote_id
          ? sb
              .from("quotes")
              .select("id, status, public_access_code, client_name, destination, currency")
              .eq("id", typed.quote_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);

      return {
        file: typed,
        services: (servicesRes.data || []) as TravelFileService[],
        events: (eventsRes.data || []) as any[],
        client: (clientRes.data || null) as any,
        quote: (quoteRes.data || null) as any,
      };
    },
  });
}

/** Atualizações operacionais do file e dos serviços (RLS isola por agência). */
export function useTravelFileMutations(fileId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["travel-file", fileId] });
    queryClient.invalidateQueries({ queryKey: ["travel-files"] });
  };

  const updateFile = useMutation({
    mutationFn: async (patch: Partial<TravelFile>) => {
      const { error } = await sb
        .from("travel_files")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateService = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TravelFileService> }) => {
      const { error } = await sb
        .from("travel_file_services")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { updateFile, updateService };
}

/** Notas internas do processo — visíveis apenas para a agência. */
export function useTravelFileNotes(fileId?: string, agencyId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["travel-file-notes", fileId],
    enabled: !!fileId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<TravelFileNote[]> => {
      const { data, error } = await sb
        .from("travel_file_notes")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TravelFileNote[];
    },
  });

  const addNote = useMutation({
    mutationFn: async ({ body, authorName }: { body: string; authorName?: string | null }) => {
      if (!fileId || !agencyId || !user?.id) throw new Error("Processo não identificado.");
      const { error } = await sb.from("travel_file_notes").insert({
        file_id: fileId,
        agency_id: agencyId,
        author_user_id: user.id,
        author_name: authorName || null,
        body: body.trim().slice(0, 4000),
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["travel-file-notes", fileId] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await sb.from("travel_file_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["travel-file-notes", fileId] }),
  });

  return { notes: query.data ?? [], isLoading: query.isLoading, addNote, deleteNote };
}

/** Números de file por orçamento — usado para a etiqueta em Meus Projetos. */
export function useQuoteFileNumbers(enabled = true) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["quote-file-numbers", user?.id],
    enabled: !!user?.id && enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await sb
        .from("travel_files")
        .select("id, quote_id, file_number_display")
        .not("quote_id", "is", null);
      if (error) throw error;
      const map: Record<string, { id: string; number: string }> = {};
      for (const row of (data || []) as any[]) {
        if (row.quote_id && !map[row.quote_id]) {
          map[row.quote_id] = { id: row.id, number: row.file_number_display };
        }
      }
      return map;
    },
  });
  return { quoteFiles: query.data ?? {}, isLoading: query.isLoading };
}
