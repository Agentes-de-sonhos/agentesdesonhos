import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Eye, Loader2, BadgeCheck, Clock, Ban } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type GuideStatus = "pending" | "approved" | "rejected";

export function AdminTourGuidesManager() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<GuideStatus>("pending");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["admin-tour-guides", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_guides")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tour_guides")
        .update({
          status: "approved",
          is_verified: true,
          rejection_reason: null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guia aprovado e publicado no Mapa do Turismo");
      qc.invalidateQueries({ queryKey: ["admin-tour-guides"] });
      qc.invalidateQueries({ queryKey: ["tour-guides-public"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("tour_guides")
        .update({
          status: "rejected",
          is_verified: false,
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guia rejeitado");
      setRejectId(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-tour-guides"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const previewGuide = guides.find((g: any) => g.id === previewId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-primary" />
          Guias de Turismo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as GuideStatus)}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Pendentes</TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Aprovados</TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5"><Ban className="h-3.5 w-3.5" /> Rejeitados</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : guides.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum guia {tab === "pending" ? "pendente" : tab === "approved" ? "aprovado" : "rejeitado"}.
              </div>
            ) : (
              <div className="space-y-2">
                {guides.map((g: any) => {
                  const langs = (g.languages || []) as Array<{ code: string; level: string }>;
                  return (
                    <div key={g.id} className="flex items-center gap-4 p-3 rounded-xl border hover:bg-accent/30 transition">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-muted shrink-0">
                        {g.photo_url && <img src={g.photo_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{g.professional_name || g.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[g.city, g.country].filter(Boolean).join(", ")} · {format(new Date(g.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        {langs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {langs.slice(0, 4).map((l, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{l.code}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setPreviewId(g.id)} className="gap-1">
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </Button>
                        {tab !== "approved" && (
                          <Button size="sm" onClick={() => approve.mutate(g.id)} disabled={approve.isPending} className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                          </Button>
                        )}
                        {tab !== "rejected" && (
                          <Button size="sm" variant="destructive" onClick={() => setRejectId(g.id)} className="gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Rejeitar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Preview dialog */}
      <Dialog open={!!previewGuide} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewGuide && (
            <>
              <DialogHeader>
                <DialogTitle>{previewGuide.professional_name || previewGuide.full_name}</DialogTitle>
                <DialogDescription>{[previewGuide.city, previewGuide.country].filter(Boolean).join(", ")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {previewGuide.photo_url && (
                  <img src={previewGuide.photo_url} alt="" className="h-32 w-32 rounded-full object-cover ring-2 ring-border" />
                )}
                <div><strong>WhatsApp:</strong> {previewGuide.whatsapp}</div>
                {previewGuide.email && <div><strong>E-mail:</strong> {previewGuide.email}</div>}
                {previewGuide.instagram && <div><strong>Instagram:</strong> {previewGuide.instagram}</div>}
                {previewGuide.website && <div><strong>Site:</strong> {previewGuide.website}</div>}
                <div>
                  <strong>Idiomas:</strong>{" "}
                  {(previewGuide.languages || []).map((l: any) => `${l.code} (${l.level})`).join(", ")}
                </div>
                {previewGuide.specialties?.length > 0 && (
                  <div><strong>Especialidades:</strong> {previewGuide.specialties.join(", ")}</div>
                )}
                {previewGuide.services?.length > 0 && (
                  <div><strong>Serviços:</strong> {previewGuide.services.join(", ")}</div>
                )}
                {previewGuide.regions?.length > 0 && (
                  <div><strong>Regiões:</strong> {previewGuide.regions.join(", ")}</div>
                )}
                {previewGuide.bio && <div><strong>Bio:</strong><br /><span className="whitespace-pre-line text-muted-foreground">{previewGuide.bio}</span></div>}
                {previewGuide.differentials && <div><strong>Diferenciais:</strong><br /><span className="whitespace-pre-line text-muted-foreground">{previewGuide.differentials}</span></div>}
                {previewGuide.certifications?.length > 0 && (
                  <div><strong>Certificações:</strong>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {previewGuide.certifications.map((c: string, i: number) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {previewGuide.gallery_urls?.length > 0 && (
                  <div>
                    <strong>Galeria:</strong>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {previewGuide.gallery_urls.map((u: string) => (
                        <img key={u} src={u} alt="" className="aspect-square rounded-lg object-cover" />
                      ))}
                    </div>
                  </div>
                )}
                {previewGuide.rejection_reason && (
                  <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-xs">
                    <strong>Motivo da rejeição:</strong> {previewGuide.rejection_reason}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(o) => { if (!o) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar cadastro</DialogTitle>
            <DialogDescription>Informe o motivo. Ele ficará registrado para o guia.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: Foto de perfil não está nítida. Por favor, atualize."
            rows={4}
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || reject.isPending}
              onClick={() => rejectId && reject.mutate({ id: rejectId, reason: rejectReason.trim() })}
            >
              {reject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
