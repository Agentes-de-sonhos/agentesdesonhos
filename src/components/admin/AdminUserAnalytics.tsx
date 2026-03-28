import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Users,
  Clock,
  Activity,
  TrendingUp,
  Search,
  Wifi,
  CalendarIcon,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { format, subWeeks, subMonths, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type PeriodFilter = "today" | "7d" | "30d" | "custom" | "all";

export function AdminUserAnalytics() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [search, setSearch] = useState("");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "today":
        return { start: startOfDay(now).toISOString(), end: now.toISOString() };
      case "7d":
        return { start: subWeeks(now, 1).toISOString(), end: now.toISOString() };
      case "30d":
        return { start: subMonths(now, 1).toISOString(), end: now.toISOString() };
      case "custom":
        return {
          start: customFrom ? startOfDay(customFrom).toISOString() : null,
          end: customTo ? new Date(customTo.getTime() + 86400000 - 1).toISOString() : null,
        };
      case "all":
        return { start: null, end: null };
    }
  }, [period, customFrom, customTo]);

  // Fetch analytics via RPC
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-user-analytics", dateRange],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_user_analytics", {
        _start_date: dateRange.start,
        _end_date: dateRange.end,
      });
      if (error) throw error;
      return data as Array<{
        user_id: string;
        user_name: string;
        avatar_url: string | null;
        agency_name: string | null;
        total_sessions: number;
        total_duration_minutes: number;
        first_access: string;
        last_access: string;
        avg_session_minutes: number;
      }>;
    },
  });

  // Fetch online users count
  const { data: onlineUsers } = useQuery({
    queryKey: ["admin-online-users"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("user_presence")
        .select("user_id")
        .eq("is_online", true)
        .gte("last_active_at", fiveMinAgo);
      if (error) throw error;
      return data?.length || 0;
    },
    refetchInterval: 30_000,
  });

  // Filtered data
  const filteredData = useMemo(() => {
    if (!analytics) return [];
    if (!search.trim()) return analytics;
    const q = search.toLowerCase();
    return analytics.filter(
      (u) =>
        u.user_name?.toLowerCase().includes(q) ||
        u.agency_name?.toLowerCase().includes(q)
    );
  }, [analytics, search]);

  // Summary stats
  const stats = useMemo(() => {
    if (!analytics)
      return { totalUsers: 0, totalMinutes: 0, avgMinutes: 0, totalSessions: 0, avgPerSession: 0 };
    const totalUsers = analytics.length;
    const totalMinutes = analytics.reduce((sum, u) => sum + u.total_duration_minutes, 0);
    const totalSessions = analytics.reduce((sum, u) => sum + u.total_sessions, 0);
    const avgMinutes = totalUsers > 0 ? Math.round(totalMinutes / totalUsers) : 0;
    const avgPerSession = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    return { totalUsers, totalMinutes, avgMinutes, totalSessions, avgPerSession };
  }, [analytics]);

  // Inactive users (no session in last 30 days)
  const inactiveUsers = useMemo(() => {
    if (!analytics || period !== "all") return [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return analytics.filter(
      (u) => u.last_access && new Date(u.last_access) < thirtyDaysAgo
    );
  }, [analytics, period]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}min`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Online agora</p>
                <p className="text-2xl font-bold">{onlineUsers ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuários ativos</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de sessões</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo total</p>
                <p className="text-2xl font-bold">{formatDuration(stats.totalMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média/usuário</p>
                <p className="text-2xl font-bold">{formatDuration(stats.avgMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média/sessão</p>
                <p className="text-2xl font-bold">{formatDuration(stats.avgPerSession)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inactive users alert */}
      {period === "all" && inactiveUsers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  {inactiveUsers.length} usuário(s) inativo(s) há mais de 30 dias
                </p>
                <p className="text-sm text-amber-600 mt-1">
                  {inactiveUsers
                    .slice(0, 5)
                    .map((u) => u.user_name)
                    .join(", ")}
                  {inactiveUsers.length > 5 && ` e mais ${inactiveUsers.length - 5}...`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Ranking de Engajamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou agência..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom date range */}
          {period === "custom" && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customFrom ? format(customFrom, "dd/MM/yyyy") : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={setCustomFrom}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customTo ? format(customTo, "dd/MM/yyyy") : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={setCustomTo}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado encontrado para o período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-center">Sessões</TableHead>
                    <TableHead className="text-center">Tempo Total</TableHead>
                    <TableHead className="text-center">Média/Sessão</TableHead>
                    <TableHead className="text-center">Primeiro Acesso</TableHead>
                    <TableHead className="text-center">Último Acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((user, index) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        {index < 3 ? (
                          <Badge
                            variant={index === 0 ? "default" : "secondary"}
                            className={
                              index === 0
                                ? "bg-yellow-500 text-white"
                                : index === 1
                                ? "bg-gray-400 text-white"
                                : "bg-amber-700 text-white"
                            }
                          >
                            {index + 1}º
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {user.user_name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.user_name}</p>
                            {user.agency_name && (
                              <p className="text-xs text-muted-foreground">{user.agency_name}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{user.total_sessions}</TableCell>
                      <TableCell className="text-center font-medium">
                        {formatDuration(user.total_duration_minutes)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDuration(Math.round(user.avg_session_minutes))}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {user.first_access
                          ? format(new Date(user.first_access), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {user.last_access
                          ? format(new Date(user.last_access), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
