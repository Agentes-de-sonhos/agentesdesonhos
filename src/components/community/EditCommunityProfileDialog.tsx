import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save } from "lucide-react";
import { SPECIALTY_OPTIONS } from "@/types/community-members";
import type { CommunityMember } from "@/types/community-members";

interface EditCommunityProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: CommunityMember | null;
  onSave: (updates: Partial<CommunityMember>) => void;
  isSaving: boolean;
}

const SEGMENT_OPTIONS = ["Lazer", "Corporativo", "Eventos", "Receptivo", "Consolidadora"];

export function EditCommunityProfileDialog({
  open,
  onOpenChange,
  membership,
  onSave,
  isSaving,
}: EditCommunityProfileDialogProps) {
  const [bio, setBio] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    if (membership && open) {
      setBio(membership.bio || "");
      setSegments(membership.segments || []);
      setSpecialties(membership.specialties || []);
    }
  }, [membership, open]);

  const toggleSegment = (seg: string) => {
    setSegments((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
    );
  };

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= 10) {
        toast.error("Máximo de 10 especialidades atingido");
        return prev;
      }
      return [...prev, s];
    });
  };

  const handleSave = () => {
    onSave({
      bio: bio.trim() || null,
      segments,
      specialties,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Perfil da Comunidade</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-5 pb-2">
            {/* Bio */}
            <div className="space-y-2">
              <Label>Mini currículo / Trajetória</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descreva sua experiência no mercado de turismo..."
                rows={3}
              />
            </div>

            {/* Segments */}
            <div className="space-y-2">
              <Label>Segmentos de atuação</Label>
              <div className="flex flex-wrap gap-2">
                {SEGMENT_OPTIONS.map((seg) => (
                  <Badge
                    key={seg}
                    variant={segments.includes(seg) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSegment(seg)}
                  >
                    {seg}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Specialties */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Especialidades (até 10)</Label>
                <span className="text-xs text-muted-foreground">{specialties.length}/10</span>
              </div>
              {(Object.entries(SPECIALTY_OPTIONS) as [string, string[]][]).map(([cat, items]) => (
                <div key={cat} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground capitalize">
                    {cat === "destinations" ? "🌍 Destinos" : cat === "segments" ? "🏷️ Segmentos" : "🎯 Nichos"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <Badge
                        key={item}
                        variant={specialties.includes(item) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleSpecialty(item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="pt-3 border-t">
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
