import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plane,
  Calendar,
  Video,
  MapPin,
  Briefcase,
  GraduationCap,
  Trophy,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Users,
} from "lucide-react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Workshop categories
const workshopCategories = [
  { value: "contabilidade", label: "Contabilidade" },
  { value: "tributaria", label: "Tributária" },
  { value: "impostos", label: "Impostos" },
  { value: "juridico", label: "Jurídico" },
  { value: "gestao", label: "Gestão" },
];

export function AdminCommunityManager() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gerenciar Comunidade
        </CardTitle>
        <CardDescription>
          Gerencie Fam Trips, reuniões online, eventos presenciais, workshops e prêmios mensais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fam-trips" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="fam-trips" className="text-xs sm:text-sm">
              <Plane className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Fam Trips</span>
            </TabsTrigger>
            <TabsTrigger value="online-meetings" className="text-xs sm:text-sm">
              <Video className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Reuniões</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs sm:text-sm">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="workshops" className="text-xs sm:text-sm">
              <Briefcase className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Workshops</span>
            </TabsTrigger>
            <TabsTrigger value="prizes" className="text-xs sm:text-sm">
              <Trophy className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Prêmios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fam-trips">
            <FamTripsManager />
          </TabsContent>
          <TabsContent value="online-meetings">
            <OnlineMeetingsManager />
          </TabsContent>
          <TabsContent value="events">
            <InPersonEventsManager />
          </TabsContent>
          <TabsContent value="workshops">
            <WorkshopsManager />
          </TabsContent>
          <TabsContent value="prizes">
            <PrizesManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Fam Trips Manager
function FamTripsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    destination: "",
    partner_company: "",
    trip_date: "",
    available_spots: 0,
    description: "",
    image_url: "",
    registration_url: "",
    is_active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-fam-trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fun_trips")
        .select("*")
        .order("trip_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingItem) {
        const { error } = await supabase.from("fun_trips").update(data).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fun_trips").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fam-trips"] });
      queryClient.invalidateQueries({ queryKey: ["fam-trips"] });
      toast({ title: editingItem ? "Fam Trip atualizada!" : "Fam Trip criada!" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fun_trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fam-trips"] });
      queryClient.invalidateQueries({ queryKey: ["fam-trips"] });
      toast({ title: "Fam Trip excluída!" });
    },
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setForm({
        destination: item.destination,
        partner_company: item.partner_company,
        trip_date: item.trip_date,
        available_spots: item.available_spots,
        description: item.description || "",
        image_url: item.image_url || "",
        registration_url: item.registration_url || "",
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setForm({
        destination: "",
        partner_company: "",
        trip_date: "",
        available_spots: 0,
        description: "",
        image_url: "",
        registration_url: "",
        is_active: true,
      });
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Fam Trip
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destino</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Vagas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.destination}</TableCell>
                <TableCell>{item.partner_company}</TableCell>
                <TableCell>{format(new Date(item.trip_date), "dd/MM/yyyy")}</TableCell>
                <TableCell>{item.available_spots}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(item.id)}>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </ConfirmDeleteDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Fam Trip" : "Nova Fam Trip"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Destino *</Label>
                <Input
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Empresa Parceira *</Label>
                <Input
                  value={form.partner_company}
                  onChange={(e) => setForm({ ...form, partner_company: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data da Viagem *</Label>
                <Input
                  type="date"
                  value={form.trip_date}
                  onChange={(e) => setForm({ ...form, trip_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Vagas Disponíveis</Label>
                <Input
                  type="number"
                  value={form.available_spots}
                  onChange={(e) => setForm({ ...form, available_spots: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>URL da Imagem</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Link de Inscrição</Label>
              <Input
                value={form.registration_url}
                onChange={(e) => setForm({ ...form, registration_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Online Meetings Manager
function OnlineMeetingsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    topic: "",
    meeting_datetime: "",
    meeting_url: "",
    recording_url: "",
    is_past: false,
    is_active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-online-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("online_meetings")
        .select("*")
        .order("meeting_datetime", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingItem) {
        const { error } = await supabase.from("online_meetings").update(data).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("online_meetings").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-online-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["online-meetings"] });
      toast({ title: "Reunião salva!" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("online_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-online-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["online-meetings"] });
      toast({ title: "Reunião excluída!" });
    },
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setForm({
        topic: item.topic,
        meeting_datetime: item.meeting_datetime.slice(0, 16),
        meeting_url: item.meeting_url || "",
        recording_url: item.recording_url || "",
        is_past: item.is_past,
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setForm({
        topic: "",
        meeting_datetime: "",
        meeting_url: "",
        recording_url: "",
        is_past: false,
        is_active: true,
      });
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Reunião
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tema</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.topic}</TableCell>
                <TableCell>{format(new Date(item.meeting_datetime), "dd/MM/yyyy HH:mm")}</TableCell>
                <TableCell>
                  <Badge variant={item.is_past ? "secondary" : "default"}>
                    {item.is_past ? "Realizada" : "Próxima"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(item.id)}>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </ConfirmDeleteDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tema *</Label>
              <Input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Data/Hora *</Label>
              <Input
                type="datetime-local"
                value={form.meeting_datetime}
                onChange={(e) => setForm({ ...form, meeting_datetime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Link da Reunião</Label>
              <Input
                value={form.meeting_url}
                onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                placeholder="https://zoom.us/..."
              />
            </div>
            <div>
              <Label>Link da Gravação</Label>
              <Input
                value={form.recording_url}
                onChange={(e) => setForm({ ...form, recording_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_past}
                  onCheckedChange={(v) => setForm({ ...form, is_past: v })}
                />
                <Label>Já realizada</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// In-Person Events Manager
function InPersonEventsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    theme: "",
    city: "",
    location: "",
    event_date: "",
    image_url: "",
    registration_url: "",
    is_active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-in-person-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("in_person_events")
        .select("*")
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingItem) {
        const { error } = await supabase.from("in_person_events").update(data).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("in_person_events").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-in-person-events"] });
      queryClient.invalidateQueries({ queryKey: ["in-person-events"] });
      toast({ title: "Evento salvo!" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("in_person_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-in-person-events"] });
      queryClient.invalidateQueries({ queryKey: ["in-person-events"] });
      toast({ title: "Evento excluído!" });
    },
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setForm({
        theme: item.theme,
        city: item.city,
        location: item.location,
        event_date: item.event_date,
        image_url: item.image_url || "",
        registration_url: item.registration_url || "",
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setForm({
        theme: "",
        city: "",
        location: "",
        event_date: "",
        image_url: "",
        registration_url: "",
        is_active: true,
      });
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tema</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.theme}</TableCell>
                <TableCell>{item.city}</TableCell>
                <TableCell>{format(new Date(item.event_date), "dd/MM/yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(item.id)}>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </ConfirmDeleteDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tema *</Label>
              <Input
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <Label>URL da Imagem</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Link de Inscrição</Label>
              <Input
                value={form.registration_url}
                onChange={(e) => setForm({ ...form, registration_url: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Workshops Manager
function WorkshopsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    category: "gestao" as any,
    description: "",
    instructor: "",
    duration_minutes: 0,
    video_url: "",
    materials_url: "",
    is_active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-workshops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_workshops")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingItem) {
        const { error } = await supabase.from("professional_workshops").update(data).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professional_workshops").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workshops"] });
      queryClient.invalidateQueries({ queryKey: ["professional-workshops"] });
      toast({ title: "Workshop salvo!" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professional_workshops").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workshops"] });
      queryClient.invalidateQueries({ queryKey: ["professional-workshops"] });
      toast({ title: "Workshop excluído!" });
    },
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setForm({
        title: item.title,
        category: item.category,
        description: item.description || "",
        instructor: item.instructor || "",
        duration_minutes: item.duration_minutes || 0,
        video_url: item.video_url || "",
        materials_url: item.materials_url || "",
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setForm({
        title: "",
        category: "gestao",
        description: "",
        instructor: "",
        duration_minutes: 0,
        video_url: "",
        materials_url: "",
        is_active: true,
      });
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Workshop
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Instrutor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {workshopCategories.find((c) => c.value === item.category)?.label || item.category}
                  </Badge>
                </TableCell>
                <TableCell>{item.instructor || "-"}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(item.id)}>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </ConfirmDeleteDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Workshop" : "Novo Workshop"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workshopCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Instrutor</Label>
              <Input
                value={form.instructor}
                onChange={(e) => setForm({ ...form, instructor: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>URL do Vídeo</Label>
              <Input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              />
            </div>
            <div>
              <Label>URL dos Materiais</Label>
              <Input
                value={form.materials_url}
                onChange={(e) => setForm({ ...form, materials_url: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Monthly Prizes Manager
function PrizesManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const currentDate = new Date();
  const [form, setForm] = useState({
    prize_name: "",
    prize_description: "",
    prize_image_url: "",
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    is_active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-monthly-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_prizes")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingItem) {
        const { error } = await supabase.from("monthly_prizes").update(data).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("monthly_prizes").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-monthly-prizes"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-prize"] });
      toast({ title: "Prêmio salvo!" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("monthly_prizes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-monthly-prizes"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-prize"] });
      toast({ title: "Prêmio excluído!" });
    },
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setForm({
        prize_name: item.prize_name,
        prize_description: item.prize_description || "",
        prize_image_url: item.prize_image_url || "",
        month: item.month,
        year: item.year,
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setForm({
        prize_name: "",
        prize_description: "",
        prize_image_url: "",
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        is_active: true,
      });
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingItem(null);
  };

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Prêmio
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prêmio</TableHead>
              <TableHead>Mês/Ano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.prize_name}</TableCell>
                <TableCell>{months[item.month - 1]}/{item.year}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Prêmio" : "Novo Prêmio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Prêmio *</Label>
              <Input
                value={form.prize_name}
                onChange={(e) => setForm({ ...form, prize_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mês *</Label>
                <Select
                  value={form.month.toString()}
                  onValueChange={(v) => setForm({ ...form, month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano *</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.prize_description}
                onChange={(e) => setForm({ ...form, prize_description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>URL da Imagem</Label>
              <Input
                value={form.prize_image_url}
                onChange={(e) => setForm({ ...form, prize_image_url: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
