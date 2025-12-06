import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MedicoContext {
  medicoData: { id: string; nome: string } | null;
  isAtendente: boolean;
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  Clock,
  XCircle,
  CalendarIcon,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface Consulta {
  id: string;
  data_hora: string;
  valor_consulta: number;
  valor_medico: number;
  valor_plataforma: number;
  status_consulta: string;
  status_pagamento: string;
  origem: string;
  paciente: { nome: string } | null;
  dependente: { nome: string } | null;
  nome_paciente_consulta: string | null;
}

interface Repasse {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_total: number;
  status: string;
  data_prevista_pagamento: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
}

type PeriodFilter = "7d" | "month" | "3months" | "custom";
type OriginFilter = "all" | "online" | "interna";
type PaymentStatusFilter = "all" | "pago" | "pendente" | "cancelado";

const CHART_COLORS = {
  online: "hsl(217, 91%, 60%)",
  interna: "hsl(142, 76%, 36%)",
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
};

export default function MedicoFinanceiro() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>("all");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "3months":
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case "custom":
        return {
          start: customDateRange.from || startOfMonth(now),
          end: customDateRange.to || now,
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [periodFilter, customDateRange]);

  // Fetch data
  useEffect(() => {
    if (!medicoData?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch consultas
        const { data: consultasData, error: consultasError } = await supabase
          .from("consultas")
          .select(`
            id,
            data_hora,
            valor_consulta,
            valor_medico,
            valor_plataforma,
            status_consulta,
            status_pagamento,
            origem,
            nome_paciente_consulta,
            paciente:pacientes(nome),
            dependente:paciente_dependentes(nome)
          `)
          .eq("medico_id", medicoData.id)
          .gte("data_hora", dateRange.start.toISOString())
          .lte("data_hora", dateRange.end.toISOString())
          .order("data_hora", { ascending: false });

        if (consultasError) throw consultasError;
        setConsultas(consultasData || []);

        // Fetch repasses
        const { data: repassesData, error: repassesError } = await supabase
          .from("repasses_medico")
          .select("*")
          .eq("medico_id", medicoData.id)
          .order("created_at", { ascending: false });

        if (repassesError) throw repassesError;
        setRepasses(repassesData || []);
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [medicoData?.id, dateRange]);

  // Filter consultas
  const filteredConsultas = useMemo(() => {
    return consultas.filter((c) => {
      const matchOrigin = originFilter === "all" || c.origem === originFilter;
      const matchPayment = paymentFilter === "all" || c.status_pagamento === paymentFilter;
      return matchOrigin && matchPayment;
    });
  }, [consultas, originFilter, paymentFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const aReceber = consultas
      .filter(
        (c) =>
          c.status_pagamento === "pago" &&
          c.status_consulta === "confirmada"
      )
      .reduce((sum, c) => sum + (c.valor_medico || 0), 0);

    const recebido = repasses
      .filter((r) => r.status === "pago")
      .reduce((sum, r) => sum + (r.valor_total || 0), 0);

    const pendentes = consultas
      .filter(
        (c) =>
          c.status_pagamento === "pendente" &&
          c.status_consulta !== "cancelada"
      )
      .reduce((sum, c) => sum + (c.valor_medico || 0), 0);

    const canceladas = consultas
      .filter((c) => c.status_consulta === "cancelada")
      .reduce((sum, c) => sum + (c.valor_medico || 0), 0);

    return { aReceber, recebido, pendentes, canceladas };
  }, [consultas, repasses]);

  // Chart data - Monthly revenue (last 6 months)
  const monthlyChartData = useMemo(() => {
    const months: { [key: string]: number } = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i);
      const key = format(month, "MMM/yy", { locale: ptBR });
      months[key] = 0;
    }

    // Sum up values for paid consultations
    consultas
      .filter((c) => c.status_pagamento === "pago")
      .forEach((c) => {
        const date = parseISO(c.data_hora);
        const key = format(date, "MMM/yy", { locale: ptBR });
        if (months.hasOwnProperty(key)) {
          months[key] += c.valor_medico || 0;
        }
      });

    return Object.entries(months).map(([name, value]) => ({
      name,
      value,
    }));
  }, [consultas]);

  // Chart data - Origin distribution
  const originChartData = useMemo(() => {
    const online = consultas.filter((c) => c.origem === "online").length;
    const interna = consultas.filter((c) => c.origem === "interna").length;
    const total = online + interna;

    return [
      { name: "Online", value: online, percentage: total > 0 ? ((online / total) * 100).toFixed(1) : 0, color: CHART_COLORS.online },
      { name: "Interna", value: interna, percentage: total > 0 ? ((interna / total) * 100).toFixed(1) : 0, color: CHART_COLORS.interna },
    ];
  }, [consultas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPatientName = (consulta: Consulta) => {
    return (
      consulta.nome_paciente_consulta ||
      consulta.dependente?.nome ||
      consulta.paciente?.nome ||
      "Não informado"
    );
  };

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case "7d":
        return "Últimos 7 dias";
      case "month":
        return format(new Date(), "MMMM/yyyy", { locale: ptBR });
      case "3months":
        return "Últimos 3 meses";
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          return `${format(customDateRange.from, "dd/MM")} - ${format(customDateRange.to, "dd/MM/yyyy")}`;
        }
        return "Período personalizado";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">
            Acompanhe seus ganhos e movimentações
          </p>
        </div>

        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodFilter === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {customDateRange.from && customDateRange.to
                    ? `${format(customDateRange.from, "dd/MM")} - ${format(customDateRange.to, "dd/MM")}`
                    : "Selecionar datas"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: customDateRange.from, to: customDateRange.to }}
                  onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* A Receber */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">A Receber</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.aReceber)}</p>
                <p className="text-emerald-200 text-xs mt-2">{getPeriodLabel()}</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <DollarSign className="w-24 h-24" />
            </div>
          </CardContent>
        </Card>

        {/* Recebido */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Recebido</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.recebido)}</p>
                <p className="text-blue-200 text-xs mt-2">Total repassado</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <ArrowUpRight className="w-24 h-24" />
            </div>
          </CardContent>
        </Card>

        {/* Pendentes */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Pendentes</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.pendentes)}</p>
                <p className="text-amber-200 text-xs mt-2">Aguardando pagamento</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Clock className="w-24 h-24" />
            </div>
          </CardContent>
        </Card>

        {/* Canceladas */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Canceladas</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.canceladas)}</p>
                <p className="text-red-200 text-xs mt-2">Valor não realizado</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <ArrowDownRight className="w-24 h-24" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturamento por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("pt-BR", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(value)
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Origin Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Origem das Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {originChartData.every((d) => d.value === 0) ? (
                <p className="text-muted-foreground">Sem dados no período</p>
              ) : (
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={originChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {originChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-4">
                    {originChartData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <div>
                          <p className="font-medium">{entry.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.value} consultas ({entry.percentage}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Consultas and Repasses */}
      <Tabs defaultValue="consultas" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="consultas">Detalhamento de Consultas</TabsTrigger>
          <TabsTrigger value="repasses">Repasses</TabsTrigger>
        </TabsList>

        {/* Consultas Tab */}
        <TabsContent value="consultas">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg">Consultas do Período</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as OriginFilter)}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="interna">Interna</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentStatusFilter)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredConsultas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma consulta encontrada no período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead className="text-right">Valor Consulta</TableHead>
                        <TableHead className="text-right">Seu Valor</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredConsultas.map((consulta) => (
                        <TableRow key={consulta.id}>
                          <TableCell>
                            {format(parseISO(consulta.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {getPatientName(consulta)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                consulta.origem === "online"
                                  ? "border-blue-500 text-blue-600 bg-blue-50"
                                  : "border-green-500 text-green-600 bg-green-50"
                              }
                            >
                              {consulta.origem === "online" ? "Online" : "Interna"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(consulta.valor_consulta)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(consulta.valor_medico)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                consulta.status_pagamento === "pago"
                                  ? "default"
                                  : consulta.status_pagamento === "pendente"
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={
                                consulta.status_pagamento === "pago"
                                  ? "bg-green-500"
                                  : consulta.status_pagamento === "pendente"
                                  ? "bg-amber-500"
                                  : ""
                              }
                            >
                              {consulta.status_pagamento === "pago"
                                ? "Pago"
                                : consulta.status_pagamento === "pendente"
                                ? "Pendente"
                                : "Cancelado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-sm ${
                                consulta.status_consulta === "confirmada"
                                  ? "text-green-600"
                                  : consulta.status_consulta === "cancelada"
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {consulta.status_consulta === "confirmada"
                                ? "Confirmada"
                                : consulta.status_consulta === "cancelada"
                                ? "Cancelada"
                                : consulta.status_consulta === "aguardando_pagamento"
                                ? "Aguardando"
                                : consulta.status_consulta}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repasses Tab */}
        <TabsContent value="repasses">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Repasses</CardTitle>
            </CardHeader>
            <CardContent>
              {repasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum repasse registrado ainda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {repasses.map((repasse) => (
                    <Card key={repasse.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge
                            variant={
                              repasse.status === "pago"
                                ? "default"
                                : repasse.status === "agendado"
                                ? "secondary"
                                : "outline"
                            }
                            className={
                              repasse.status === "pago"
                                ? "bg-green-500"
                                : repasse.status === "agendado"
                                ? "bg-blue-500"
                                : ""
                            }
                          >
                            {repasse.status === "pago"
                              ? "Pago"
                              : repasse.status === "agendado"
                              ? "Agendado"
                              : "Pendente"}
                          </Badge>
                          <span className="text-xl font-bold text-foreground">
                            {formatCurrency(repasse.valor_total)}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Período:</span>
                            <span>
                              {format(parseISO(repasse.periodo_inicio), "dd/MM")} -{" "}
                              {format(parseISO(repasse.periodo_fim), "dd/MM/yyyy")}
                            </span>
                          </div>
                          {repasse.data_prevista_pagamento && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Previsão:</span>
                              <span>
                                {format(parseISO(repasse.data_prevista_pagamento), "dd/MM/yyyy")}
                              </span>
                            </div>
                          )}
                          {repasse.data_pagamento && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pago em:</span>
                              <span>
                                {format(parseISO(repasse.data_pagamento), "dd/MM/yyyy")}
                              </span>
                            </div>
                          )}
                          {repasse.observacoes && (
                            <p className="text-muted-foreground mt-2 text-xs">
                              {repasse.observacoes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
