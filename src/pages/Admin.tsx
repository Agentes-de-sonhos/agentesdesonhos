import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield,
  UserCheck,
  UserX,
  Loader2,
  Newspaper,
  TrendingUp,
  Building2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminNewsManager } from "@/components/admin/AdminNewsManager";
import { AdminTradeUpdatesManager } from "@/components/admin/AdminTradeUpdatesManager";
import { AdminSuppliersManager } from "@/components/admin/AdminSuppliersManager";

interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: "admin" | "agente";
  created_at: string;
}

export default function Admin() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, created_at");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const combinedUsers: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: "",
          name: profile.name,
          role: (userRole?.role as "admin" | "agente") || "agente",
          created_at: profile.created_at,
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserRole(userId: string, currentRole: "admin" | "agente") {
    const newRole = currentRole === "admin" ? "agente" : "admin";

    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast({
        title: "Sucesso",
        description: `Usuário atualizado para ${newRole}`,
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o role do usuário",
        variant: "destructive",
      });
    }
  }

  const stats = [
    {
      title: "Total de Usuários",
      value: users.length,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Administradores",
      value: users.filter((u) => u.role === "admin").length,
      icon: Shield,
      color: "text-accent",
    },
    {
      title: "Agentes",
      value: users.filter((u) => u.role === "agente").length,
      icon: UserCheck,
      color: "text-green-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários, notícias e conteúdo da plataforma
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs for Content Management */}
        <Tabs defaultValue="news" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Notícias
            </TabsTrigger>
            <TabsTrigger value="trade" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trade
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Fornecedores
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="news">
            <AdminNewsManager />
          </TabsContent>

          <TabsContent value="trade">
            <AdminTradeUpdatesManager />
          </TabsContent>

          <TabsContent value="suppliers">
            <AdminSuppliersManager />
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciar Usuários
                </CardTitle>
                <CardDescription>
                  Visualize e gerencie os usuários da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum usuário encontrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Nome
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Role
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Data de Cadastro
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b last:border-0">
                            <td className="py-3 px-4 font-medium">{user.name}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={user.role === "admin" ? "default" : "secondary"}
                              >
                                {user.role === "admin" ? "Administrador" : "Agente"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleUserRole(user.id, user.role)}
                              >
                                {user.role === "admin" ? "Tornar Agente" : "Tornar Admin"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
