import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, Users, Calendar, TrendingUp, DollarSign, Clock, Sun, Cloud, CloudRain, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type PeriodFilter = "7d" | "30d" | "60d" | "90d";

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"];

// Greetings based on time
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Weather icon based on condition
function getWeatherIcon(condition: string) {
  if (condition.includes("chuva") || condition.includes("rain")) {
    return <CloudRain className="w-6 h-6 text-blue-400" />;
  }
  if (condition.includes("nublado") || condition.includes("cloud")) {
    return <Cloud className="w-6 h-6 text-gray-400" />;
  }
  return <Sun className="w-6 h-6 text-yellow-500" />;
}

export default function ClinicaDashboard() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: 28, condition: "Ensolarado" });

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Simulate weather (in production, integrate with a weather API)
  useEffect(() => {
    const conditions = [
      { temp: 28, condition: "Ensolarado" },
      { temp: 25, condition: "Parcialmente nublado" },
      { temp: 22, condition: "Nublado" },
    ];
    setWeather(conditions[Math.floor(Math.random() * conditions.length)]);
  }, []);

  const dateRange = useMemo(() => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 90);
    
    switch (periodFilter) {
      case "7d":
        return { start: subDays(now, 7), end: future };
      case "30d":
        return { start: subDays(now, 30), end: future };
      case "60d":
        return { start: subDays(now, 60), end: future };
      case "90d":
        return { start: subDays(now, 90), end: future };
      default:
        return { start: subDays(now, 30), end: future };
    }
  }, [periodFilter]);

  const { data: medicos } = useQuery({
    queryKey: ["clinica-medicos-list", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const { data } = await supabase
        .from("clinicas_medicos")
        .select("medico_id, medicos(id, nome)")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      return data?.map((v: any) => v.medicos).filter(Boolean) || [];
    },
    enabled: !!clinicaData?.id,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["clinica-dashboard-stats", clinicaData?.id, dateRange, medicoFilter],
    queryFn: async () => {
      if (!clinicaData?.id) return null;

      const { data: vinculos } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      const medicoIds = vinculos?.map((v) => v.medico_id) || [];
      if (medicoIds.length === 0) {
        return { medicos: 0, consultas: 0, pacientes: 0, faturamento: 0, pendente: 0, consultasPorDia: [], consultasPorStatus: [] };
      }

      const filterMedicoIds = medicoFilter === "todos" ? medicoIds : [medicoFilter];
      const medicosCount = medicoFilter === "todos" ? medicoIds.length : 1;

      let query = supabase
        .from("consultas")
        .select("id, data_hora, valor_consulta, status_pagamento, status_consulta, origem, paciente_id, medico_id")
        .in("medico_id", filterMedicoIds)
        .gte("data_hora", dateRange.start.toISOString())
        .lte("data_hora", dateRange.end.toISOString());

      const { data: consultasData } = await query;
      const consultas = consultasData || [];

      const faturamento = consultas
        .filter((c) => c.status_pagamento === "pago" && c.origem === "online")
        .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

      const pendente = consultas
        .filter((c) => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada")
        .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

      const uniquePacientes = new Set(consultas.filter((c) => c.paciente_id).map((c) => c.paciente_id));

      const consultasPorDia: { [key: string]: number } = {};
      consultas.forEach((c) => {
        const date = format(parseISO(c.data_hora), "dd/MM");
        consultasPorDia[date] = (consultasPorDia[date] || 0) + 1;
      });

      const confirmadas = consultas.filter((c) => c.status_consulta === "confirmada").length;
      const aguardando = consultas.filter((c) => c.status_consulta === "aguardando_pagamento").length;
      const concluidas = consultas.filter((c) => c.status_consulta === "concluida").length;
      const canceladas = consultas.filter((c) => c.status_consulta === "cancelada").length;

      return {
        medicos: medicosCount,
        consultas: consultas.length,
        pacientes: uniquePacientes.size,
        faturamento,
        pendente,
        consultasPorDia: Object.entries(consultasPorDia)
          .map(([date, count]) => ({ date, count }))
          .slice(-15),
        consultasPorStatus: [
          { name: "Confirmadas", value: confirmadas },
          { name: "Concluídas", value: concluidas },
          { name: "Aguardando", value: aguardando },
          { name: "Canceladas", value: canceladas },
        ].filter((s) => s.value > 0),
      };
    },
    enabled: !!clinicaData?.id,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {getGreeting()}, {clinicaData?.nome_fantasia || "Clínica"}! 👋
              </h1>
              <p className="text-muted-foreground">
                Bem-vindo ao painel da sua clínica. Acompanhe as métricas e gerencie sua equipe.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Date & Time */}
              <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border shadow-sm">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-semibold">{format(currentTime, "HH:mm")}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Weather */}
              <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border shadow-sm">
                {getWeatherIcon(weather.condition)}
                <div>
                  <p className="font-semibold">{weather.temp}°C</p>
                  <p className="text-xs text-muted-foreground">{weather.condition}</p>
                </div>
              </div>

              {/* Location */}
              {clinicaData?.cidade && (
                <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border shadow-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-semibold">{clinicaData.cidade}</p>
                    <p className="text-xs text-muted-foreground">{clinicaData.estado}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={medicoFilter} onValueChange={setMedicoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Médico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos médicos</SelectItem>
            {medicos?.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>
                Dr(a). {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="60d">60 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Médicos
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats?.medicos || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Consultas
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats?.consultas || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pacientes
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats?.pacientes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Faturamento
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-xl font-bold text-green-500 truncate">
              {formatCurrency(stats?.faturamento || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pendente
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-xl font-bold text-yellow-500 truncate">
              {formatCurrency(stats?.pendente || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-500">Ativo</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Consultas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.consultasPorDia?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.consultasPorDia}>
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Consultas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status das Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.consultasPorStatus?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={200} className="sm:w-1/2">
                  <PieChart>
                    <Pie
                      data={stats?.consultasPorStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                    >
                      {stats?.consultasPorStatus?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 w-full sm:w-auto">
                  {stats?.consultasPorStatus?.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm truncate flex-1">{item.name}</span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clinic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome Fantasia</p>
              <p className="font-medium truncate">{clinicaData?.nome_fantasia || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Razão Social</p>
              <p className="font-medium truncate">{clinicaData?.razao_social || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CNPJ</p>
              <p className="font-medium truncate">{clinicaData?.cnpj || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium truncate">{clinicaData?.email_contato || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium truncate">{clinicaData?.telefone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Localização</p>
              <p className="font-medium truncate">
                {clinicaData?.cidade && clinicaData?.estado 
                  ? `${clinicaData.cidade} - ${clinicaData.estado}` 
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
