import { useState, useMemo, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stethoscope, Users, Calendar, TrendingUp, DollarSign, Clock, Sun, Cloud, CloudRain, MapPin, ArrowRight, CheckCircle, XCircle, AlertCircle, CalendarDays, Phone, Lock, Globe, Building2, Wallet } from "lucide-react";
import { maskPhone, maskCPF } from "@/lib/maskUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, isToday, isTomorrow, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
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

type PeriodFilter = "hoje" | "7d" | "30d" | "60d" | "90d" | "personalizado";
type StatusFilter = "todos" | "confirmada" | "aguardando_pagamento" | "concluida";

const COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#eab308", "#ef4444"];

const statusColors: Record<string, string> = {
  agendada: "bg-purple-100 text-purple-800",
  confirmada: "bg-green-100 text-green-800",
  concluida: "bg-blue-100 text-blue-800",
  atendida_medico: "bg-blue-100 text-blue-800",
  cancelada: "bg-red-100 text-red-800",
  aguardando_pagamento: "bg-yellow-100 text-yellow-800",
  aguardando_confirmacao: "bg-yellow-100 text-yellow-800",
};

const statusLabels: Record<string, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  concluida: "Concluída",
  atendida_medico: "Atendida",
  cancelada: "Cancelada",
  aguardando_pagamento: "Aguardando",
  aguardando_confirmacao: "Aguardando",
};

const pagamentoColors: Record<string, string> = {
  pago: "bg-green-100 text-green-800",
  pendente: "bg-yellow-100 text-yellow-800",
  cancelado: "bg-red-100 text-red-800",
};

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
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: 28, condition: "Ensolarado" });
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
      case "hoje":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "7d":
        return { start: subDays(now, 7), end: future };
      case "30d":
        return { start: subDays(now, 30), end: future };
      case "60d":
        return { start: subDays(now, 60), end: future };
      case "90d":
        return { start: subDays(now, 90), end: future };
      case "personalizado":
        return {
          start: customDateStart ? startOfDay(parseISO(customDateStart)) : subDays(now, 30),
          end: customDateEnd ? endOfDay(parseISO(customDateEnd)) : future,
        };
      default:
        return { start: subDays(now, 30), end: future };
    }
  }, [periodFilter, customDateStart, customDateEnd]);

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
        return { 
          medicos: 0, 
          consultas: 0, 
          pacientes: 0, 
          faturamento: 0, 
          pendente: 0, 
          consultasHoje: 0,
          consultasAmanha: 0,
          consultasPorDia: [], 
          consultasPorStatus: [] 
        };
      }

      const filterMedicoIds = medicoFilter === "todos" ? medicoIds : [medicoFilter];
      const medicosCount = medicoFilter === "todos" ? medicoIds.length : 1;

      // Buscar consultas pelos médicos vinculados (inclui consultas com clinica_id NULL)
      const { data: consultasData } = await supabase
        .from("consultas")
        .select("id, data_hora, valor_consulta, status_pagamento, status_consulta, origem, paciente_id, medico_id, clinica_id, local:locais_atendimento(clinica_id)")
        .in("medico_id", filterMedicoIds)
        .gte("data_hora", dateRange.start.toISOString())
        .lte("data_hora", dateRange.end.toISOString());

      // Filtrar para consultas que pertencem à clínica (por clinica_id direto, pelo local, ou sem clinica_id mas do médico vinculado)
      const consultas = (consultasData || []).filter((c: any) => 
        c.clinica_id === clinicaData.id || 
        c.local?.clinica_id === clinicaData.id ||
        (!c.clinica_id && filterMedicoIds.includes(c.medico_id))
      );

      // Todas as consultas pagas
      const consultasPagas = consultas.filter((c) => c.status_pagamento === "pago");

      // Faturamento TOTAL (todas as pagas, independente da origem)
      const faturamentoTotal = consultasPagas
        .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

      // Faturamento ONLINE (pago)
      const faturamentoOnline = consultasPagas
        .filter((c) => c.origem === "online")
        .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

      // Faturamento INTERNO (pago)
      const faturamentoInterno = consultasPagas
        .filter((c) => c.origem === "interna" || (!c.origem || (c.origem !== "online")))
        .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

      // Concluídas com pagamento pendente (atendidas mas não pagas)
      const concluidasPendentes = consultas
        .filter((c) => c.status_consulta === "concluida" && c.status_pagamento === "pendente")
        .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

      const concluidasPendentesQtd = consultas
        .filter((c) => c.status_consulta === "concluida" && c.status_pagamento === "pendente")
        .length;

      // Pendente (excluindo canceladas e concluídas que já têm card próprio)
      const pendente = consultas
        .filter((c) => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada")
        .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

      const uniquePacientes = new Set(consultas.filter((c) => c.paciente_id).map((c) => c.paciente_id));

      // Consultas hoje e amanhã
      const today = new Date();
      const consultasHoje = consultas.filter((c) => {
        const date = parseISO(c.data_hora);
        return isToday(date) && c.status_consulta !== "cancelada";
      }).length;

      const consultasAmanha = consultas.filter((c) => {
        const date = parseISO(c.data_hora);
        return isTomorrow(date) && c.status_consulta !== "cancelada";
      }).length;

      const consultasPorDia: { [key: string]: number } = {};
      consultas.forEach((c) => {
        const date = format(parseISO(c.data_hora), "dd/MM");
        consultasPorDia[date] = (consultasPorDia[date] || 0) + 1;
      });

      const agendadas = consultas.filter((c) => c.status_consulta === "agendada").length;
      const confirmadas = consultas.filter((c) => c.status_consulta === "confirmada").length;
      const aguardando = consultas.filter((c) => c.status_consulta === "aguardando_pagamento" || c.status_consulta === "aguardando_confirmacao").length;
      const concluidas = consultas.filter((c) => c.status_consulta === "concluida" || c.status_consulta === "atendida_medico").length;
      const canceladas = consultas.filter((c) => c.status_consulta === "cancelada").length;

      return {
        medicos: medicosCount,
        consultas: consultas.length,
        pacientes: uniquePacientes.size,
        faturamento: faturamentoTotal,
        faturamentoOnline,
        faturamentoInterno,
        pendente,
        concluidasPendentes,
        concluidasPendentesQtd,
        consultasHoje,
        consultasAmanha,
        consultasPorDia: Object.entries(consultasPorDia)
          .map(([date, count]) => ({ date, count }))
          .slice(-15),
        consultasPorStatus: [
          { name: "Agendadas", value: agendadas },
          { name: "Confirmadas", value: confirmadas },
          { name: "Concluídas", value: concluidas },
          { name: "Aguardando", value: aguardando },
          { name: "Canceladas", value: canceladas },
        ].filter((s) => s.value > 0),
      };
    },
    enabled: !!clinicaData?.id,
  });

  // Fetch upcoming consultations for the list (only future, not cancelled)
  const { data: upcomingConsultas } = useQuery({
    queryKey: ["clinica-upcoming-consultas", clinicaData?.id, medicoFilter, statusFilter],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const { data: vinculos } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      const medicoIds = vinculos?.map((v) => v.medico_id) || [];
      if (medicoIds.length === 0) return [];

      const filterMedicoIds = medicoFilter === "todos" ? medicoIds : [medicoFilter];

      // Buscar consultas pelos médicos vinculados (sem filtro por clinica_id para incluir consultas com clinica_id NULL)
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          status_pagamento,
          valor_consulta,
          valor_medico,
          origem,
          motivo_consulta,
          sintomas,
          nome_paciente_consulta,
          clinica_id,
          paciente:pacientes(id, nome, telefone, cpf),
          medico:medicos!consultas_medico_id_fkey(id, nome, especialidade),
          local:locais_atendimento(nome_local, cidade, clinica_id)
        `)
        .in("medico_id", filterMedicoIds)
        .gte("data_hora", new Date().toISOString())
        .neq("status_consulta", "cancelada")
        .order("data_hora", { ascending: true });

      if (error) throw error;
      
      // Filtrar consultas que pertencem à clínica (por clinica_id direto, pelo local, ou sem clinica_id mas do médico vinculado)
      let filteredData = (data || []).filter((c: any) => 
        c.clinica_id === clinicaData.id || 
        c.local?.clinica_id === clinicaData.id ||
        (!c.clinica_id && filterMedicoIds.includes(c.medico_id))
      );

      // Apply status filter
      if (statusFilter !== "todos") {
        filteredData = filteredData.filter((c: any) => c.status_consulta === statusFilter);
      }

      return filteredData.slice(0, 10);
    },
    enabled: !!clinicaData?.id,
  });

  // Fetch today's consultations
  const { data: todayConsultas } = useQuery({
    queryKey: ["clinica-today-consultas", clinicaData?.id, medicoFilter],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const { data: vinculos } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      const medicoIds = vinculos?.map((v) => v.medico_id) || [];
      if (medicoIds.length === 0) return [];

      const filterMedicoIds = medicoFilter === "todos" ? medicoIds : [medicoFilter];

      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      // Buscar consultas pelos médicos vinculados (sem filtro por clinica_id para incluir consultas com clinica_id NULL)
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          status_pagamento,
          valor_consulta,
          origem,
          motivo_consulta,
          nome_paciente_consulta,
          clinica_id,
          paciente:pacientes(id, nome, telefone),
          medico:medicos!consultas_medico_id_fkey(id, nome, especialidade),
          local:locais_atendimento(nome_local, clinica_id)
        `)
        .in("medico_id", filterMedicoIds)
        .gte("data_hora", todayStart)
        .lte("data_hora", todayEnd)
        .neq("status_consulta", "cancelada")
        .order("data_hora", { ascending: true });

      if (error) throw error;
      
      // Filtrar consultas que pertencem à clínica (por clinica_id direto, pelo local, ou sem clinica_id mas do médico vinculado)
      return (data || []).filter((c: any) => 
        c.clinica_id === clinicaData.id || 
        c.local?.clinica_id === clinicaData.id ||
        (!c.clinica_id && filterMedicoIds.includes(c.medico_id))
      );
    },
    enabled: !!clinicaData?.id,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getConsultaDateLabel = (dataHora: string) => {
    const date = parseISO(dataHora);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM");
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
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="60d">60 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {periodFilter === "personalizado" && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="w-[150px] h-9"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="w-[150px] h-9"
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats - Today & Tomorrow */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Consultas Hoje</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats?.consultasHoje || 0}</p>
              </div>
              <CalendarDays className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Consultas Amanhã</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats?.consultasAmanha || 0}</p>
              </div>
              <Calendar className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Pago Online</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(stats?.faturamentoOnline || 0)}</p>
              </div>
              <Globe className="h-10 w-10 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20 border-cyan-200 dark:border-cyan-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Pago Interno</p>
                <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">{formatCurrency(stats?.faturamentoInterno || 0)}</p>
              </div>
              <Building2 className="h-10 w-10 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Faturado, Concluídas Pendentes, Pendente e Previsão */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Faturado (Pago)</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(stats?.faturamento || 0)}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Online + Interno</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Concluídas s/ Pgto</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatCurrency(stats?.concluidasPendentes || 0)}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{stats?.concluidasPendentesQtd || 0} consulta(s) atendida(s)</p>
              </div>
              <Clock className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Pendente</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(stats?.pendente || 0)}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Aguardando pagamento</p>
              </div>
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 border-indigo-200 dark:border-indigo-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Previsão Total</p>
                <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{formatCurrency((stats?.faturamento || 0) + (stats?.pendente || 0))}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Faturado + Pendente</p>
              </div>
              <Wallet className="h-10 w-10 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Médicos Ativos
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
              Total Consultas
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
              Pacientes Únicos
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

      {/* Today's Consultations */}
      {todayConsultas && todayConsultas.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900 dark:text-blue-100">Consultas de Hoje ({todayConsultas.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horário</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayConsultas.map((consulta: any) => (
                    <TableRow key={consulta.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-blue-600">
                            {format(parseISO(consulta.data_hora), "HH:mm")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {consulta.nome_paciente_consulta || consulta.paciente?.nome || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          {maskPhone(consulta.paciente?.telefone)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">Dr(a). {consulta.medico?.nome}</p>
                          <p className="text-xs text-muted-foreground">{consulta.medico?.especialidade}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{consulta.local?.nome_local || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                          {consulta.motivo_consulta || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(consulta.valor_consulta || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[consulta.status_consulta] || "bg-gray-100 text-gray-800"}>
                          {statusLabels[consulta.status_consulta] || consulta.status_consulta}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Consultations List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Próximas Consultas ({upcomingConsultas?.length || 0})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="confirmada">Confirmadas</SelectItem>
                <SelectItem value="aguardando_pagamento">Pendentes</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => navigate("/clinica/consultas")}>
              Ver todas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingConsultas?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma consulta {statusFilter !== "todos" ? `${statusLabels[statusFilter]?.toLowerCase() || statusFilter}` : "agendada"}.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Motivo/Sintomas</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingConsultas?.map((consulta: any) => (
                    <TableRow key={consulta.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getConsultaDateLabel(consulta.data_hora)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(consulta.data_hora), "HH:mm")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(consulta.data_hora), "EEEE", { locale: ptBR })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                          {consulta.nome_paciente_consulta || consulta.paciente?.nome || "—"}
                          </p>
                          {consulta.paciente?.cpf && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              CPF: {maskCPF(consulta.paciente.cpf)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          {maskPhone(consulta.paciente?.telefone)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">Dr(a). {consulta.medico?.nome}</p>
                          <p className="text-xs text-muted-foreground">{consulta.medico?.especialidade}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{consulta.local?.nome_local || "—"}</p>
                          {consulta.local?.cidade && (
                            <p className="text-xs text-muted-foreground">{consulta.local.cidade}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px]">
                          {consulta.motivo_consulta && (
                            <p className="text-sm truncate" title={consulta.motivo_consulta}>
                              {consulta.motivo_consulta}
                            </p>
                          )}
                          {consulta.sintomas && (
                            <p className="text-xs text-muted-foreground truncate" title={consulta.sintomas}>
                              {consulta.sintomas}
                            </p>
                          )}
                          {!consulta.motivo_consulta && !consulta.sintomas && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={consulta.origem === "online" ? "default" : "secondary"}>
                          {consulta.origem === "online" ? "Online" : "Interna"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(consulta.valor_consulta || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge className={pagamentoColors[consulta.status_pagamento] || "bg-gray-100 text-gray-800"}>
                          {consulta.status_pagamento === "pago" ? "Pago" : 
                           consulta.status_pagamento === "pendente" ? "Pendente" : "Cancelado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[consulta.status_consulta] || "bg-gray-100 text-gray-800"}>
                          {statusLabels[consulta.status_consulta] || consulta.status_consulta}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
