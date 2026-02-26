import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Link2, ClipboardCheck } from "lucide-react";
import { useAcademy, useAcademyAdmin } from "@/hooks/useAcademy";
import { QuizManager } from "./QuizManager";
import { POPULAR_DESTINATIONS, TRAINING_CATEGORIES, type LearningTrail, type Training } from "@/types/academy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AdminAcademyManager() {
  const { trails, trainings, trailTrainings } = useAcademy();
  const { createTrail, updateTrail, deleteTrail, createTraining, updateTraining, deleteTraining, linkTrainingToTrail, unlinkTrainingFromTrail } = useAcademyAdmin();
  
  const [trailDialogOpen, setTrailDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  const [editingTrail, setEditingTrail] = useState<LearningTrail | null>(null);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'trail' | 'training'; id: string } | null>(null);
  const [selectedTrailForLink, setSelectedTrailForLink] = useState<string>("");

  // Trail form state
  const [trailForm, setTrailForm] = useState({
    name: "",
    description: "",
    destination: "",
    image_url: "",
    order_index: 0,
    is_active: true,
  });

  // Training form state
  const [trainingForm, setTrainingForm] = useState({
    title: "",
    description: "",
    category: "geral",
    training_type: "recorded" as "live" | "recorded",
    video_url: "",
    duration_minutes: 0,
    thumbnail_url: "",
    materials_url: "",
    instructor: "",
    scheduled_at: "",
    order_index: 0,
    is_active: true,
  });

  const handleOpenTrailDialog = (trail?: LearningTrail) => {
    if (trail) {
      setEditingTrail(trail);
      setTrailForm({
        name: trail.name,
        description: trail.description || "",
        destination: trail.destination,
        image_url: trail.image_url || "",
        order_index: trail.order_index,
        is_active: trail.is_active,
      });
    } else {
      setEditingTrail(null);
      setTrailForm({
        name: "",
        description: "",
        destination: "",
        image_url: "",
        order_index: trails.length,
        is_active: true,
      });
    }
    setTrailDialogOpen(true);
  };

  const handleOpenTrainingDialog = (training?: Training) => {
    if (training) {
      setEditingTraining(training);
      setTrainingForm({
        title: training.title,
        description: training.description || "",
        category: training.category,
        training_type: training.training_type as "live" | "recorded",
        video_url: training.video_url || "",
        duration_minutes: training.duration_minutes,
        thumbnail_url: training.thumbnail_url || "",
        materials_url: training.materials_url || "",
        instructor: training.instructor || "",
        scheduled_at: training.scheduled_at || "",
        order_index: training.order_index,
        is_active: training.is_active,
      });
    } else {
      setEditingTraining(null);
      setTrainingForm({
        title: "",
        description: "",
        category: "geral",
        training_type: "recorded",
        video_url: "",
        duration_minutes: 0,
        thumbnail_url: "",
        materials_url: "",
        instructor: "",
        scheduled_at: "",
        order_index: trainings.length,
        is_active: true,
      });
    }
    setTrainingDialogOpen(true);
  };

  const handleSaveTrail = async () => {
    if (editingTrail) {
      await updateTrail.mutateAsync({ id: editingTrail.id, ...trailForm });
    } else {
      await createTrail.mutateAsync(trailForm);
    }
    setTrailDialogOpen(false);
  };

  const handleSaveTraining = async () => {
    const data = {
      ...trainingForm,
      scheduled_at: trainingForm.scheduled_at || null,
    };
    if (editingTraining) {
      await updateTraining.mutateAsync({ id: editingTraining.id, ...data });
    } else {
      await createTraining.mutateAsync(data);
    }
    setTrainingDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "trail") {
      await deleteTrail.mutateAsync(itemToDelete.id);
    } else {
      await deleteTraining.mutateAsync(itemToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleLinkTraining = async (trainingId: string) => {
    if (!selectedTrailForLink) return;
    await linkTrainingToTrail.mutateAsync({
      trailId: selectedTrailForLink,
      trainingId,
    });
  };

  const handleUnlinkTraining = async (trailId: string, trainingId: string) => {
    await unlinkTrainingFromTrail.mutateAsync({ trailId, trainingId });
  };

  const getTrailTrainings = (trailId: string) => {
    return trailTrainings.filter((tt) => tt.trail_id === trailId);
  };

  return (
    <div className="space-y-6">
      {/* Trails Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Trilhas de Aprendizado
          </CardTitle>
          <Button onClick={() => handleOpenTrailDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Trilha
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Treinamentos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trails.map((trail) => (
                <TableRow key={trail.id}>
                  <TableCell className="font-medium">{trail.name}</TableCell>
                  <TableCell>{trail.destination}</TableCell>
                  <TableCell>{getTrailTrainings(trail.id).length} treinamentos</TableCell>
                  <TableCell>
                    <Badge variant={trail.is_active ? "default" : "secondary"}>
                      {trail.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTrailForLink(trail.id);
                          setLinkDialogOpen(true);
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenTrailDialog(trail)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setItemToDelete({ type: "trail", id: trail.id });
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trainings Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Treinamentos</CardTitle>
          <Button onClick={() => handleOpenTrainingDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Treinamento
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainings.map((training) => (
                <TableRow key={training.id}>
                  <TableCell className="font-medium">{training.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{training.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={training.training_type === "live" ? "destructive" : "secondary"}>
                      {training.training_type === "live" ? "Ao vivo" : "Gravado"}
                    </Badge>
                  </TableCell>
                  <TableCell>{training.duration_minutes} min</TableCell>
                  <TableCell>
                    <Badge variant={training.is_active ? "default" : "secondary"}>
                      {training.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenTrainingDialog(training)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setItemToDelete({ type: "training", id: training.id });
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trail Dialog */}
      <Dialog open={trailDialogOpen} onOpenChange={setTrailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTrail ? "Editar Trilha" : "Nova Trilha"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Trilha</Label>
              <Input
                value={trailForm.name}
                onChange={(e) => setTrailForm({ ...trailForm, name: e.target.value })}
                placeholder="Ex: Especialista em Orlando"
              />
            </div>
            <div>
              <Label>Destino</Label>
              <Select
                value={trailForm.destination}
                onValueChange={(v) => setTrailForm({ ...trailForm, destination: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destino" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_DESTINATIONS.map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={trailForm.description}
                onChange={(e) => setTrailForm({ ...trailForm, description: e.target.value })}
                placeholder="Descrição da trilha..."
              />
            </div>
            <div>
              <Label>URL da Imagem</Label>
              <Input
                value={trailForm.image_url}
                onChange={(e) => setTrailForm({ ...trailForm, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={trailForm.is_active}
                onCheckedChange={(v) => setTrailForm({ ...trailForm, is_active: v })}
              />
              <Label>Trilha ativa</Label>
            </div>
            <Button onClick={handleSaveTrail} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Training Dialog */}
      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTraining ? "Editar Treinamento" : "Novo Treinamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Título</Label>
              <Input
                value={trainingForm.title}
                onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })}
                placeholder="Título do treinamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={trainingForm.category}
                  onValueChange={(v) => setTrainingForm({ ...trainingForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={trainingForm.training_type}
                  onValueChange={(v) => setTrainingForm({ ...trainingForm, training_type: v as "live" | "recorded" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recorded">Gravado</SelectItem>
                    <SelectItem value="live">Ao vivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={trainingForm.description}
                onChange={(e) => setTrainingForm({ ...trainingForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>URL do Vídeo</Label>
              <Input
                value={trainingForm.video_url}
                onChange={(e) => setTrainingForm({ ...trainingForm, video_url: e.target.value })}
                placeholder="https://youtube.com/embed/..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  value={trainingForm.duration_minutes}
                  onChange={(e) => setTrainingForm({ ...trainingForm, duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Instrutor</Label>
                <Input
                  value={trainingForm.instructor}
                  onChange={(e) => setTrainingForm({ ...trainingForm, instructor: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>URL de Material Complementar</Label>
              <Input
                value={trainingForm.materials_url}
                onChange={(e) => setTrainingForm({ ...trainingForm, materials_url: e.target.value })}
              />
            </div>
            {trainingForm.training_type === "live" && (
              <div>
                <Label>Data/Hora (ao vivo)</Label>
                <Input
                  type="datetime-local"
                  value={trainingForm.scheduled_at}
                  onChange={(e) => setTrainingForm({ ...trainingForm, scheduled_at: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={trainingForm.is_active}
                onCheckedChange={(v) => setTrainingForm({ ...trainingForm, is_active: v })}
              />
              <Label>Treinamento ativo</Label>
            </div>
            <Button onClick={handleSaveTraining} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Training to Trail Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Treinamentos à Trilha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os treinamentos para adicionar à trilha:
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {trainings.map((training) => {
                const isLinked = trailTrainings.some(
                  (tt) => tt.trail_id === selectedTrailForLink && tt.training_id === training.id
                );
                return (
                  <div key={training.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{training.title}</span>
                    {isLinked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlinkTraining(selectedTrailForLink, training.id)}
                      >
                        Remover
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleLinkTraining(training.id)}>
                        Adicionar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz & Exam Manager */}
      <QuizManager />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
