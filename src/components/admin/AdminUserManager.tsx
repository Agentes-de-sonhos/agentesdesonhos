import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Users,
  Search,
  Shield,
  UserCheck,
  Loader2,
  CreditCard,
  UserPlus,
  KeyRound,
  Trash2,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { setImpersonationData, type ImpersonationData } from "./ImpersonationBanner";

interface UserWithDetails {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  agency_name: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  role: "admin" | "agente";
  plan: "essencial" | "profissional";
  is_active: boolean;
  monthly_paid: boolean;
}

export function AdminUserManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithDetails | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", agency_name: "", role: "agente", plan: "essencial" });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      // Fetch profiles, roles, subscriptions, emails, and monthly payments in parallel
      const [profilesRes, rolesRes, subsRes, emailsRes, paymentsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("subscriptions").select("user_id, plan, is_active"),
        supabase.functions.invoke("admin-list-emails"),
        supabase.from("monthly_payments").select("user_id, is_paid").eq("month", currentMonth).eq("year", currentYear),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (subsRes.error) throw subsRes.error;

      const emailMap: Record<string, string> = emailsRes.data?.emails || {};
      const paymentMap: Record<string, boolean> = {};
      (paymentsRes.data || []).forEach((p: any) => { paymentMap[p.user_id] = p.is_paid; });

      // Combine data
      return (profilesRes.data || []).map((profile) => {
        const userRoles = rolesRes.data?.filter((r) => r.user_id === profile.user_id) || [];
        const hasAdmin = userRoles.some((r) => r.role === "admin");
        const userRole = hasAdmin ? "admin" : (userRoles[0]?.role || "agente");
        const userSub = subsRes.data?.find((s) => s.user_id === profile.user_id);

        return {
          id: profile.id,
          user_id: profile.user_id,
          name: profile.name,
          email: emailMap[profile.user_id] || "",
          phone: profile.phone,
          agency_name: profile.agency_name,
          city: profile.city,
          state: profile.state,
          created_at: profile.created_at,
          role: (userRole as "admin" | "agente") || "agente",
          plan: (userSub?.plan as "essencial" | "profissional") || "essencial",
          is_active: userSub?.is_active ?? true,
          monthly_paid: paymentMap[profile.user_id] ?? false,
        } as UserWithDetails;
      });
    },
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: "admin" | "agente" }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Permissão atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar permissão", variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: "essencial" | "profissional" }) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({ plan })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Plano atualizado!" });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar plano", variant: "destructive" });
    },
  });

  const togglePaymentMutation = useMutation({
    mutationFn: async ({ userId, isPaid }: { userId: string; isPaid: boolean }) => {
      const { data: existing } = await supabase
        .from("monthly_payments")
        .select("id")
        .eq("user_id", userId)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("monthly_payments")
          .update({ is_paid: isPaid, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("monthly_payments")
          .insert({ user_id: userId, month: currentMonth, year: currentYear, is_paid: isPaid });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Pagamento atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar pagamento", variant: "destructive" });
    },
  });
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({ is_active: isActive })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Status da conta atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const resp = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: userId },
      });
      if (resp.error) throw new Error(resp.error.message || "Erro ao resetar senha");
      if (resp.data?.error) throw new Error(resp.data.error);
      return resp.data;
    },
    onSuccess: (data) => {
      toast({ title: "E-mail de redefinição enviado!", description: `Enviado para ${data.email}` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar e-mail", description: err.message, variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke("admin-create-user", {
        body: userData,
      });
      if (resp.error) throw new Error(resp.error.message || "Erro ao criar usuário");
      if (resp.data?.error) throw new Error(resp.data.error);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Usuário criado com sucesso!" });
      setShowCreateDialog(false);
      setNewUser({ name: "", email: "", phone: "", agency_name: "", role: "agente", plan: "essencial" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const resp = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (resp.error) throw new Error(resp.error.message || "Erro ao excluir usuário");
      if (resp.data?.error) throw new Error(resp.data.error);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Usuário excluído com sucesso!" });
      setDeletingUser(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir usuário", description: err.message, variant: "destructive" });
      setDeletingUser(null);
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (user: UserWithDetails) => {
      // Save current admin session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Sessão admin não encontrada");

      const resp = await supabase.functions.invoke("impersonate-user", {
        body: { targetUserId: user.user_id },
      });
      if (resp.error) throw new Error(resp.error.message || "Erro ao impersonar");
      if (resp.data?.error) throw new Error(resp.data.error);

      const { token_hash, email, target_user_name, target_user_id } = resp.data;

      // Store admin session before switching
      const impData: ImpersonationData = {
        adminSessionAccess: sessionData.session.access_token,
        adminSessionRefresh: sessionData.session.refresh_token,
        targetUserName: target_user_name,
        targetUserId: target_user_id,
        adminId: sessionData.session.user.id,
        startedAt: new Date().toISOString(),
      };
      setImpersonationData(impData);

      // Sign in as the target user using the magic link token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        email,
        token_hash,
      });

      if (verifyError) {
        // Rollback
        const { clearImpersonationData } = await import("./ImpersonationBanner");
        clearImpersonationData();
        throw new Error("Erro ao autenticar como usuário: " + verifyError.message);
      }

      return target_user_name;
    },
    onSuccess: (name) => {
      toast({ title: "Modo suporte ativado", description: `Acessando como ${name}` });
      navigate("/dashboard");
    },
    onError: (err: Error) => {
      toast({ title: "Erro na impersonação", description: err.message, variant: "destructive" });
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesPlan = planFilter === "all" || user.plan === planFilter;

      return matchesSearch && matchesRole && matchesPlan;
    });
  }, [users, searchTerm, roleFilter, planFilter]);

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    essencial: users.filter((u) => u.plan === "essencial").length,
    profissional: users.filter((u) => u.plan === "profissional").length,
  };

  const planColors: Record<string, string> = {
    educa_pass: "bg-blue-500",
    cartao_digital: "bg-teal-500",
    essencial: "bg-muted-foreground",
    profissional: "bg-primary",
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciar Usuários
            </CardTitle>
            <CardDescription>
              Visualize, filtre e gerencie os usuários da plataforma
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Adicionar Usuário
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{stats.admins}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </div>
          <div className="text-center p-3 bg-muted/70 rounded-lg">
            <p className="text-2xl font-bold">{stats.essencial}</p>
            <p className="text-xs text-muted-foreground">Essencial</p>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold">{stats.profissional}</p>
            <p className="text-xs text-muted-foreground">Plano Fundador</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, agência ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Permissão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="agente">Agente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="essencial">Essencial</SelectItem>
              <SelectItem value="profissional">Plano Fundador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Agência</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={user.role === "admin" ? "bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-l-amber-500" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.role === "admin" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{user.name}</p>
                          {user.agency_name && (
                            <p className="text-sm text-muted-foreground">{user.agency_name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.phone || "-"}
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${planColors[user.plan]} text-white border-0`}>
                        {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1 px-3 py-1 text-xs font-semibold">
                          <Shield className="h-3 w-3" /> Administrador
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 px-3 py-1 text-xs">
                          <UserCheck className="h-3 w-3" /> Agente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(user.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.monthly_paid}
                        onCheckedChange={(checked) =>
                          togglePaymentMutation.mutate({
                            userId: user.user_id,
                            isPaid: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            userId: user.user_id,
                            isActive: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant={user.role === "admin" ? "destructive" : "default"}
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() =>
                            toggleRoleMutation.mutate({
                              userId: user.user_id,
                              newRole: user.role === "admin" ? "agente" : "admin",
                            })
                          }
                        >
                          {user.role === "admin" ? (
                            <><Shield className="h-3 w-3" /> Remover Admin</>
                          ) : (
                            <><Shield className="h-3 w-3" /> Tornar Admin</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Acessar como usuário"
                          className="text-amber-600 hover:text-amber-700"
                          onClick={() => impersonateMutation.mutate(user)}
                          disabled={impersonateMutation.isPending}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Resetar senha"
                          onClick={() => resetPasswordMutation.mutate(user.user_id)}
                          disabled={resetPasswordMutation.isPending}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingUser(user);
                            setSelectedPlan(user.plan);
                          }}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir usuário"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Plan Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Plano</DialogTitle>
              <DialogDescription>
                Altere o plano de assinatura de {editingUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Plano atual</Label>
                <Badge className={`${planColors[editingUser?.plan || "essencial"]} text-white mt-1`}>
                  {editingUser?.plan}
                </Badge>
              </div>
              <div>
                <Label>Novo plano</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educa_pass">Educa Travel Pass</SelectItem>
                    <SelectItem value="cartao_digital">Cartão Digital Pass</SelectItem>
                    <SelectItem value="essencial">Essencial</SelectItem>
                    <SelectItem value="profissional">Plano Fundador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (editingUser) {
                    updatePlanMutation.mutate({
                      userId: editingUser.user_id,
                      plan: selectedPlan as "essencial" | "profissional",
                    });
                  }
                }}
                disabled={updatePlanMutation.isPending}
              >
                {updatePlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie uma conta para um novo usuário. Ele poderá acessar via magic link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nome completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Agência</Label>
                <Input
                  value={newUser.agency_name}
                  onChange={(e) => setNewUser({ ...newUser, agency_name: e.target.value })}
                  placeholder="Nome da agência"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Permissão</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agente">Agente</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plano</Label>
                  <Select value={newUser.plan} onValueChange={(v) => setNewUser({ ...newUser, plan: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essencial">Essencial</SelectItem>
                      <SelectItem value="profissional">Plano Fundador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createUserMutation.mutate(newUser)}
                disabled={createUserMutation.isPending || !newUser.name || !newUser.email}
              >
                {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>{deletingUser?.name}</strong>
                {deletingUser?.email ? ` (${deletingUser.email})` : ""}? Esta ação é irreversível e removerá todos os dados do usuário.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.user_id)}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
