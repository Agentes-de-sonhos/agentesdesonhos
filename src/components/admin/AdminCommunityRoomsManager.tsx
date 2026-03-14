import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";

interface Room {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  is_general: boolean;
  is_active: boolean;
  order_index: number;
}

export function AdminCommunityRoomsManager() {
  const queryClient = useQueryClient();
  const [newRoom, setNewRoom] = useState({ name: "", emoji: "💬", description: "" });

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["admin-community-rooms"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_rooms")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Room[];
    },
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(...rooms.map((r) => r.order_index), -1);
      const { error } = await (supabase as any)
        .from("community_rooms")
        .insert({
          name: newRoom.name,
          emoji: newRoom.emoji || "💬",
          description: newRoom.description || null,
          order_index: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sala criada com sucesso!");
      setNewRoom({ name: "", emoji: "💬", description: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-community-rooms"] });
    },
    onError: () => toast.error("Erro ao criar sala"),
  });

  const toggleRoom = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("community_rooms")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-rooms"] });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("community_rooms")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sala removida!");
      queryClient.invalidateQueries({ queryKey: ["admin-community-rooms"] });
    },
    onError: () => toast.error("Erro ao remover sala"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Salas da Comunidade
          <Badge variant="secondary">{rooms.length} salas</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create new room */}
        <div className="space-y-3 p-4 bg-muted rounded-xl">
          <h4 className="font-semibold text-sm">Nova Sala</h4>
          <div className="grid grid-cols-[60px_1fr] gap-2">
            <Input
              value={newRoom.emoji}
              onChange={(e) => setNewRoom({ ...newRoom, emoji: e.target.value })}
              placeholder="💬"
              className="text-center text-lg"
              maxLength={4}
            />
            <Input
              value={newRoom.name}
              onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
              placeholder="Nome da sala"
            />
          </div>
          <Textarea
            value={newRoom.description}
            onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
            placeholder="Descrição da sala (opcional)"
            rows={2}
          />
          <Button
            onClick={() => createRoom.mutate()}
            disabled={!newRoom.name.trim() || createRoom.isPending}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Criar Sala
          </Button>
        </div>

        {/* Rooms list */}
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-lg">{room.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{room.name}</p>
                  {room.is_general && (
                    <Badge variant="outline" className="text-xs">
                      Geral
                    </Badge>
                  )}
                </div>
                {room.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {room.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Ativa</Label>
                  <Switch
                    checked={room.is_active}
                    onCheckedChange={(checked) =>
                      toggleRoom.mutate({ id: room.id, is_active: checked })
                    }
                  />
                </div>
                {!room.is_general && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteRoom.mutate(room.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
