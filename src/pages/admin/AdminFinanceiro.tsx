import { useState, useMemo } from "react";
import { 
  DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight, 
  Filter, Download, Calendar, Users, Activity, Percent, PieChart as PieChartIcon,
  BarChart3, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, subMonths, startOfMonth, endOfMonth, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
  ComposedChart, Line, CartesianGrid
} from "recharts";

const CHART_COLORS = {
  primary: "#0066CC",
  secondary: "#10B981", 
  warning: "#F59E0B",
  purple: "#8B5CF6",
  pink: "#EC4899",
  cyan: "#06B6D4",
  orange: "#F97316",
  indigo: "#6366F1"
};

export default function AdminFinanceiro() {
  const [periodo, setPeriodo] = useState("30");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [especialidadeFilter, setEspecialidadeFilter] = useState("todas");
  const [dateRange, setDateRange] = useState({
    inicio: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    fim: format(subDays(new Date(), -90), "yyyy-MM-dd"), // Include future consultations
  });

  // Fetch financial data
  const { data: consultas, isLoading, refetch } = useQuery({
    queryKey: ["admin-financeiro", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          *,
          medico:medicos!consultas_medico_id_fkey(nome, especialidade, percentual_repasse),
          paciente:pacientes!consultas_paciente_id_fkey(nome)
        `)
        .gte("data_hora", `${dateRange.inicio}T00:00:00`)
        .lte("data_hora", `${dateRange.fim}T23:59:59`)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch all medicos for filter
  const { data: medicos } = useQuery({
    queryKey: ["admin-medicos-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicos")
        .select("id, nome, especialidade")
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Get unique specialties
  const especialidades = useMemo(() => {
    if (!medicos) return [];
    const specs = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    return specs.sort();
  }, [medicos]);

  // Filter consultas - only online generate revenue
  const consultasOnline = useMemo(() => {
    let filtered = consultas?.filter((c) => c.origem !== 'interna') || [];
    
    if (statusFilter !== "todos") {
      filtered = filtered.filter(c => c.status_pagamento === statusFilter);
    }
    
    if (especialidadeFilter !== "todas") {
      filtered = filtered.filter(c => (c.medico as any)?.especialidade === especialidadeFilter);
    }
    
    return filtered;
  }, [consultas, statusFilter, especialidadeFilter]);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const allOnline = consultas?.filter((c) => c.origem !== 'interna') || [];
    return {
      receitaTotal: allOnline.reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
      receitaPaga: allOnline.filter((c) => c.status_pagamento === "pago").reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
      receitaPendente: allOnline.filter((c) => c.status_pagamento === "pendente").reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
      receitaCancelada: allOnline.filter((c) => c.status_pagamento === "cancelado").reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
      totalRepasses: allOnline.reduce((acc, c) => acc + Number(c.valor_medico), 0) || 0,
      repassesPagos: allOnline.filter((c) => c.status_repasse === "pago").reduce((acc, c) => acc + Number(c.valor_medico), 0) || 0,
      repassesPendentes: allOnline.filter((c) => c.status_pagamento === "pago" && c.status_repasse === "pendente").reduce((acc, c) => acc + Number(c.valor_medico), 0) || 0,
      lucroPlataforma: allOnline.reduce((acc, c) => acc + Number(c.valor_plataforma), 0) || 0,
      lucroPago: allOnline.filter((c) => c.status_pagamento === "pago").reduce((acc, c) => acc + Number(c.valor_plataforma), 0) || 0,
      consultasTotal: allOnline.length || 0,
      consultasPagas: allOnline.filter((c) => c.status_pagamento === "pago").length || 0,
      consultasPendentes: allOnline.filter((c) => c.status_pagamento === "pendente").length || 0,
      consultasCanceladas: allOnline.filter((c) => c.status_pagamento === "cancelado").length || 0,
      ticketMedio: allOnline.length > 0 ? allOnline.reduce((acc, c) => acc + Number(c.valor_consulta), 0) / allOnline.length : 0,
    };
  }, [consultas]);

  // Chart data - Receita por dia with comparison bars
  const receitaPorDia = useMemo(() => {
    if (!consultasOnline.length) return [];
    const days: Record<string, { receita: number; repasse: number; lucro: number; count: number }> = {};
    
    consultasOnline.forEach((c) => {
      const day = format(new Date(c.data_hora), "dd/MM");
      if (!days[day]) {
        days[day] = { receita: 0, repasse: 0, lucro: 0, count: 0 };
      }
      days[day].receita += Number(c.valor_consulta);
      days[day].repasse += Number(c.valor_medico);
      days[day].lucro += Number(c.valor_plataforma);
      days[day].count += 1;
    });

    return Object.entries(days)
      .slice(-14)
      .map(([name, values]) => ({ name, ...values }));
  }, [consultasOnline]);

  // Chart data - Receita por especialidade
  const receitaPorEspecialidade = useMemo(() => {
    if (!consultasOnline.length) return [];
    const specs: Record<string, { receita: number; count: number }> = {};
    
    consultasOnline.forEach((c: any) => {
      const esp = c.medico?.especialidade || "Não informado";
      if (!specs[esp]) {
        specs[esp] = { receita: 0, count: 0 };
      }
      specs[esp].receita += Number(c.valor_consulta);
      specs[esp].count += 1;
    });

    return Object.entries(specs)
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 6);
  }, [consultasOnline]);

  // Radial chart data for status
  const statusRadialData = useMemo(() => {
    const total = metrics.consultasTotal || 1;
    return [
      { 
        name: "Pagas", 
        value: Math.round((metrics.consultasPagas / total) * 100), 
        fill: CHART_COLORS.secondary,
        count: metrics.consultasPagas
      },
      { 
        name: "Pendentes", 
        value: Math.round((metrics.consultasPendentes / total) * 100), 
        fill: CHART_COLORS.warning,
        count: metrics.consultasPendentes
      },
      { 
        name: "Canceladas", 
        value: Math.round((metrics.consultasCanceladas / total) * 100), 
        fill: "#EF4444",
        count: metrics.consultasCanceladas
      },
    ];
  }, [metrics]);

  // Top médicos por receita
  const topMedicos = useMemo(() => {
    if (!consultasOnline.length) return [];
    const medicos: Record<string, { nome: string; receita: number; consultas: number; especialidade: string }> = {};
    
    consultasOnline.forEach((c: any) => {
      const nome = c.medico?.nome || "Desconhecido";
      if (!medicos[nome]) {
        medicos[nome] = { nome, receita: 0, consultas: 0, especialidade: c.medico?.especialidade || "" };
      }
      medicos[nome].receita += Number(c.valor_consulta);
      medicos[nome].consultas += 1;
    });

    return Object.values(medicos)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [consultasOnline]);

  // Analytics metrics for progress bars
  const analyticsMetrics = useMemo(() => {
    const total = metrics.receitaTotal || 1;
    const maxReceita = topMedicos[0]?.receita || 1;
    
    return [
      { 
        label: "Taxa de Conversão", 
        value: metrics.consultasTotal > 0 ? Math.round((metrics.consultasPagas / metrics.consultasTotal) * 100) : 0,
        color: "bg-primary"
      },
      { 
        label: "Repasses Realizados", 
        value: metrics.totalRepasses > 0 ? Math.round((metrics.repassesPagos / metrics.totalRepasses) * 100) : 0,
        color: "bg-green-500"
      },
      { 
        label: "Lucro vs Repasse", 
        value: metrics.receitaTotal > 0 ? Math.round((metrics.lucroPlataforma / metrics.receitaTotal) * 100) : 0,
        color: "bg-purple-500"
      },
      { 
        label: "Consultas Confirmadas", 
        value: metrics.consultasTotal > 0 ? Math.round((metrics.consultasPagas / metrics.consultasTotal) * 100) : 0,
        color: "bg-cyan-500"
      },
    ];
  }, [metrics, topMedicos]);

  const handlePeriodoChange = (value: string) => {
    setPeriodo(value);
    const dias = parseInt(value);
    setDateRange({
      inicio: format(subDays(new Date(), dias), "yyyy-MM-dd"),
      fim: format(subDays(new Date(), -90), "yyyy-MM-dd"), // Include future consultations
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
          <Select value={periodo} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-full xs:w-[140px] sm:w-40 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[calc(50%-4px)] xs:w-[120px] sm:w-36 text-xs sm:text-sm">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={especialidadeFilter} onValueChange={setEspecialidadeFilter}>
            <SelectTrigger className="w-[calc(50%-4px)] xs:w-[140px] sm:w-44 text-xs sm:text-sm">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <SelectValue placeholder="Especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Especialidades</SelectItem>
              {especialidades.map((esp) => (
                <SelectItem key={esp} value={esp}>{esp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 w-full xs:w-auto">
            <Button variant="outline" size="icon" onClick={() => refetch()} className="h-9 w-9 sm:h-10 sm:w-10">
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="outline" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 xs:flex-none">
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Exportar</span>
            </Button>
          </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4">
        <Card className="col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Receita Total</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-1 truncate">{formatCurrency(metrics.receitaTotal)}</p>
                <div className="flex items-center gap-2 mt-1 sm:mt-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px] sm:text-xs">
                    {metrics.consultasTotal} consultas
                  </Badge>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pago</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 truncate">{formatCurrency(metrics.receitaPaga)}</p>
                <p className="text-[10px] sm:text-xs text-green-600 flex items-center mt-1">
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 shrink-0" />
                  {metrics.consultasPagas} pagas
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pendente</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 truncate">{formatCurrency(metrics.receitaPendente)}</p>
                <p className="text-[10px] sm:text-xs text-yellow-600 flex items-center mt-1">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 shrink-0" />
                  {metrics.consultasPendentes} aguardando
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Lucro</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 truncate">{formatCurrency(metrics.lucroPlataforma)}</p>
                <p className="text-[10px] sm:text-xs text-purple-600 flex items-center mt-1">
                  <Percent className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 shrink-0" />
                  Taxa plataforma
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-500/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Ticket Médio</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-600 truncate">{formatCurrency(metrics.ticketMedio)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  por consulta
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 - Main charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Receita e Lucro por dia */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Receita vs Lucro por Dia
                </CardTitle>
                <CardDescription>Comparativo diário de receita e lucro da plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {receitaPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={receitaPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" name="Lucro" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="count" name="Consultas" stroke={CHART_COLORS.purple} strokeWidth={2} dot={{ r: 4 }} yAxisId={0} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>Sem dados para o período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Radial Charts - Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Status das Consultas
            </CardTitle>
            <CardDescription>Distribuição por status de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {statusRadialData.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" 
                        cy="50%" 
                        innerRadius="60%" 
                        outerRadius="100%" 
                        data={[item]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          background={{ fill: 'hsl(var(--muted))' }}
                          dataKey="value"
                          cornerRadius={10}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold" style={{ color: item.fill }}>{item.value}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.count} consultas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receita por Especialidade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Receita por Especialidade
            </CardTitle>
            <CardDescription>Top 6 especialidades por faturamento</CardDescription>
          </CardHeader>
          <CardContent>
            {receitaPorEspecialidade.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={receitaPorEspecialidade}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="receita"
                  >
                    {receitaPorEspecialidade.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    formatter={(value, entry: any) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                <p>Sem dados disponíveis</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Progress Bars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Indicadores
            </CardTitle>
            <CardDescription>Métricas de performance da plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {analyticsMetrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">{metric.label}</span>
                    <span className="text-muted-foreground font-bold">{metric.value}%</span>
                  </div>
                  <Progress value={metric.value} className="h-2" />
                </div>
              ))}
            </div>
            
            {/* Mini Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.repassesPendentes)}</p>
                <p className="text-xs text-muted-foreground">Repasses Pendentes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.lucroPago)}</p>
                <p className="text-xs text-muted-foreground">Lucro Realizado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Médicos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Top 5 Médicos
            </CardTitle>
            <CardDescription>Ranking por receita gerada</CardDescription>
          </CardHeader>
          <CardContent>
            {topMedicos.length > 0 ? (
              <div className="space-y-4">
                {topMedicos.map((medico, index) => {
                  const maxReceita = topMedicos[0]?.receita || 1;
                  const percentage = Math.round((medico.receita / maxReceita) * 100);
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-yellow-950' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-amber-600 text-amber-950' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{medico.nome}</p>
                            <p className="text-xs text-muted-foreground">{medico.consultas} consultas</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-primary">{formatCurrency(medico.receita)}</p>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <p>Sem dados disponíveis</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repasses Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <span className="truncate">Repasses Pendentes</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Consultas pagas aguardando transferência</CardDescription>
            </div>
            <Badge variant="outline" className="text-yellow-600 border-yellow-300 w-fit text-xs sm:text-sm whitespace-nowrap shrink-0">
              {consultas?.filter((c) => c.status_pagamento === "pago" && c.status_repasse === "pendente" && c.origem !== 'interna').length || 0} pendentes
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="space-y-4 p-3 sm:p-0">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : consultas && consultas.filter((c) => c.status_pagamento === "pago" && c.status_repasse === "pendente" && c.origem !== 'interna').length > 0 ? (
            <>
              {/* Mobile Cards View */}
              <div className="sm:hidden divide-y divide-border">
                {consultas
                  .filter((c) => c.status_pagamento === "pago" && c.status_repasse === "pendente" && c.origem !== 'interna')
                  .slice(0, 10)
                  .map((consulta: any) => (
                    <div key={consulta.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{consulta.medico?.nome || "—"}</p>
                          <p className="text-xs text-muted-foreground">{consulta.medico?.especialidade || "—"}</p>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-[10px] shrink-0">
                          Pendente
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Paciente:</span>
                        <span className="truncate ml-2">{consulta.nome_paciente_consulta || consulta.paciente?.nome || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Data:</span>
                        <span>{format(new Date(consulta.data_hora), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                        <div>
                          <span className="text-muted-foreground">Consulta: </span>
                          <span>{formatCurrency(consulta.valor_consulta)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Repasse: </span>
                          <span className="font-semibold text-primary">{formatCurrency(consulta.valor_medico)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Médico</TableHead>
                      <TableHead className="min-w-[100px]">Especialidade</TableHead>
                      <TableHead className="min-w-[120px]">Paciente</TableHead>
                      <TableHead className="min-w-[130px]">Data Consulta</TableHead>
                      <TableHead className="text-right min-w-[100px]">Valor Consulta</TableHead>
                      <TableHead className="text-right min-w-[100px]">Valor Repasse</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultas
                      .filter((c) => c.status_pagamento === "pago" && c.status_repasse === "pendente" && c.origem !== 'interna')
                      .slice(0, 10)
                      .map((consulta: any) => (
                        <TableRow key={consulta.id}>
                          <TableCell className="font-medium">{consulta.medico?.nome || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{consulta.medico?.especialidade || "—"}</TableCell>
                          <TableCell>{consulta.nome_paciente_consulta || consulta.paciente?.nome || "—"}</TableCell>
                          <TableCell>
                            {format(new Date(consulta.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(consulta.valor_consulta)}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(consulta.valor_medico)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Pendente
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 text-green-500" />
              <p className="font-medium text-sm sm:text-base">Nenhum repasse pendente</p>
              <p className="text-xs sm:text-sm">Todos os repasses estão em dia!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
