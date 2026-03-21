import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Shield, ShieldCheck, ShieldX, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/community-members";
import type { CommunityMember, CommunityMemberStatus } from "@/types/community-members";

export function AdminCommunityMembersManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin-community-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data) return [];
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, agency_name, city, state")
        .in("user_id", userIds);
      return data.map((m: any) => ({
        ...m,
        profile: profiles?.find((p: any) => p.user_id === m.user_id),
      })) as CommunityMember[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: CommunityMemberStatus }) => {
      const { error } = await supabase
        .from("community_members")
        .update({ status })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-community-members"] });
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const filtered = members.filter((m) => {
    const matchSearch =
      !search ||
      m.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.cnpj?.includes(search);
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: members.length,
    unverified: members.filter((m) => m.status === "approved_unverified").length,
    verified: members.filter((m) => m.status === "verified").length,
    blocked: members.filter((m) => m.status === "blocked").length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Membros Travel Experts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: counts.total, icon: Users },
            { label: "Não verificados", value: counts.unverified, icon: Shield },
            { label: "Verificados", value: counts.verified, icon: ShieldCheck },
            { label: "Bloqueados", value: counts.blocked, icon: ShieldX },
          ].map((s) => (
            <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
              <s.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved_unverified">Não verificados</SelectItem>
              <SelectItem value="verified">Verificados</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Experiência</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const name = m.profile?.name || "—";
                  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.profile?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">{m.profile?.agency_name || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.entry_method === "cnpj_8_years" ? "CNPJ 8+ anos" : "Experiência"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{m.cnpj || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {m.years_experience ? `${m.years_experience}+ anos` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {m.specialties?.slice(0, 2).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                          {(m.specialties?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-[10px]">+{m.specialties!.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[m.status as CommunityMemberStatus]}>
                          {STATUS_LABELS[m.status as CommunityMemberStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {m.status !== "verified" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => updateStatus.mutate({ userId: m.user_id, status: "verified" })}
                            >
                              <ShieldCheck className="h-3 w-3" /> Verificar
                            </Button>
                          )}
                          {m.status !== "blocked" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={() => updateStatus.mutate({ userId: m.user_id, status: "blocked" })}
                            >
                              <ShieldX className="h-3 w-3" /> Bloquear
                            </Button>
                          )}
                          {m.status === "blocked" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => updateStatus.mutate({ userId: m.user_id, status: "approved_unverified" })}
                            >
                              <Shield className="h-3 w-3" /> Desbloquear
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
