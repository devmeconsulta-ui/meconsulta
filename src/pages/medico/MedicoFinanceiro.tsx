import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  LineChart,
  Line,
  ComposedChart,
  Legend,
  Area,
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
  ChevronDown,
  ChevronUp,
  Globe,
  Building2,
  BarChart3,
  PieChartIcon,
  ArrowRightLeft,
  Banknote,
  Target,
  Search,
  X,
  Loader2,
} from "lucide-react";

interface MedicoContext {
  medicoData: { id: string; nome: string } | null;
  isAtendente: boolean;
}

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
  local?: { id: string; nome_local: string } | null;
  finalizado_medico?: boolean | null;
  elegivel_repasse?: boolean | null;
  incluida_em_repasse?: boolean | null;
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

interface LocalAtendimento {
  id: string;
  nome_local: string;
}

type PeriodFilter = "7d" | "30d" | "3months" | "6months" | "12months" | "custom";
type OriginFilter = "all" | "online" | "interna";
type PaymentStatusFilter = "all" | "pago" | "pendente" | "cancelado";
type ConsultaStatusFilter = "all" | "confirmada" | "aguardando_pagamento" | "cancelada";

const CHART_COLORS = {
  online: "hsl(217, 91%, 60%)",
  interna: "hsl(142, 76%, 36%)",
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  previsto: "hsl(45, 93%, 47%)",
  realizado: "hsl(142, 76%, 36%)",
};

export default function MedicoFinanceiro() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [locais, setLocais] = useState<LocalAtendimento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>("all");
  const [consultaStatusFilter, setConsultaStatusFilter] = useState<ConsultaStatusFilter>("all");
  const [localFilter, setLocalFilter] = useState<string>("all");
  const [pacienteSearch, setPacienteSearch] = useState("");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  // Active tab
  const [activeTab, setActiveTab] = useState("visao-geral");

  // Calculate date range based on filter (includes future dates for appointments)
  const dateRange = useMemo(() => {
    const now = new Date();
    const futureEnd = subMonths(now, -3); // Include 3 months in the future for appointments
    switch (periodFilter) {
      case "7d":
        return { start: subDays(now, 7), end: futureEnd };
      case "30d":
        return { start: subDays(now, 30), end: futureEnd };
      case "3months":
        return { start: startOfMonth(subMonths(now, 2)), end: futureEnd };
      case "6months":
        return { start: startOfMonth(subMonths(now, 5)), end: futureEnd };
      case "12months":
        return { start: startOfMonth(subMonths(now, 11)), end: futureEnd };
      case "custom":
        return {
          start: customDateRange.from || startOfMonth(now),
          end: customDateRange.to || futureEnd,
        };
      default:
        return { start: subDays(now, 30), end: futureEnd };
    }
  }, [periodFilter, customDateRange]);

  // Fetch data
  useEffect(() => {
    if (!medicoData?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch consultas with local info and finalization fields
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
            agenda_slot_id,
            finalizado_medico,
            elegivel_repasse,
            incluida_em_repasse,
            paciente:pacientes!consultas_paciente_id_fkey(nome),
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

        // Fetch locais
        const { data: locaisData, error: locaisError } = await supabase
          .from("locais_atendimento")
          .select("id, nome_local")
          .eq("medico_id", medicoData.id)
          .eq("ativo", true);

        if (locaisError) throw locaisError;
        setLocais(locaisData || []);
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
      const matchStatus = consultaStatusFilter === "all" || c.status_consulta === consultaStatusFilter;
      const matchPaciente = !pacienteSearch || 
        (c.nome_paciente_consulta?.toLowerCase().includes(pacienteSearch.toLowerCase()) ||
         c.paciente?.nome?.toLowerCase().includes(pacienteSearch.toLowerCase()) ||
         c.dependente?.nome?.toLowerCase().includes(pacienteSearch.toLowerCase()));
      return matchOrigin && matchPayment && matchStatus && matchPaciente;
    });
  }, [consultas, originFilter, paymentFilter, consultaStatusFilter, pacienteSearch]);

  // Calculate metrics - updated to reflect finalization and repasses
  const metrics = useMemo(() => {
    // A Receber: consultas pagas, elegíveis para repasse, ainda não incluídas em repasse pago
    const aReceber = filteredConsultas
      .filter(
        (c) =>
          c.status_pagamento === "pago" &&
          c.elegivel_repasse === true &&
          !c.incluida_em_repasse
      )
      .reduce((sum, c) => sum + (c.valor_medico || 0), 0);

    // Recebido: soma de repasses pagos
    const recebido = repasses
      .filter((r) => r.status === "pago")
      .reduce((sum, r) => sum + (r.valor_total || 0), 0);

    // Pendentes: consultas com pagamento pendente (não canceladas)
    const pendentes = filteredConsultas
      .filter(
        (c) =>
          c.status_pagamento === "pendente" &&
          c.status_consulta !== "cancelada"
      )
      .reduce((sum, c) => sum + (c.valor_medico || 0), 0);

    // Canceladas
    const canceladas = filteredConsultas
      .filter((c) => c.status_consulta === "cancelada")
      .reduce((sum, c) => sum + (c.valor_medico || 0), 0);

    const totalConsultas = filteredConsultas.length;
    const consultasPagas = filteredConsultas.filter(c => c.status_pagamento === "pago").length;
    
    // Novas métricas de finalização
    const finalizadas = filteredConsultas.filter(c => c.finalizado_medico === true).length;
    const naoCompareceram = filteredConsultas.filter(c => c.status_consulta === "nao_compareceu").length;
    const elegiveis = filteredConsultas.filter(c => c.elegivel_repasse === true && !c.incluida_em_repasse).length;
    const emRepasse = filteredConsultas.filter(c => c.incluida_em_repasse === true).length;

    return { 
      aReceber, 
      recebido, 
      pendentes, 
      canceladas, 
      totalConsultas, 
      consultasPagas,
      finalizadas,
      naoCompareceram,
      elegiveis,
      emRepasse
    };
  }, [filteredConsultas, repasses]);

  // Origin metrics
  const originMetrics = useMemo(() => {
    const onlineConsultas = consultas.filter(c => c.origem === "online");
    const internaConsultas = consultas.filter(c => c.origem === "interna");

    const online = {
      total: onlineConsultas.length,
      valor: onlineConsultas.reduce((sum, c) => sum + (c.valor_medico || 0), 0),
      ticketMedio: onlineConsultas.length > 0 
        ? onlineConsultas.reduce((sum, c) => sum + (c.valor_medico || 0), 0) / onlineConsultas.length 
        : 0,
      pagos: onlineConsultas.filter(c => c.status_pagamento === "pago").length,
    };

    const interna = {
      total: internaConsultas.length,
      valor: internaConsultas.reduce((sum, c) => sum + (c.valor_medico || 0), 0),
      ticketMedio: internaConsultas.length > 0 
        ? internaConsultas.reduce((sum, c) => sum + (c.valor_medico || 0), 0) / internaConsultas.length 
        : 0,
      pagos: internaConsultas.filter(c => c.status_pagamento === "pago").length,
    };

    return { online, interna };
  }, [consultas]);

  // Chart data - Monthly revenue (last 6 months)
  const monthlyChartData = useMemo(() => {
    const months: { [key: string]: { online: number; interna: number } } = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i);
      const key = format(month, "MMM/yy", { locale: ptBR });
      months[key] = { online: 0, interna: 0 };
    }

    // Sum up values for paid consultations
    consultas
      .filter((c) => c.status_pagamento === "pago")
      .forEach((c) => {
        const date = parseISO(c.data_hora);
        const key = format(date, "MMM/yy", { locale: ptBR });
        if (months.hasOwnProperty(key)) {
          if (c.origem === "online") {
            months[key].online += c.valor_medico || 0;
          } else {
            months[key].interna += c.valor_medico || 0;
          }
        }
      });

    return Object.entries(months).map(([name, values]) => ({
      name,
      online: values.online,
      interna: values.interna,
      total: values.online + values.interna,
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

  // Cash flow data - Daily
  const cashFlowData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayConsultas = consultas.filter(c => isSameDay(parseISO(c.data_hora), day));
      
      const previsto = dayConsultas
        .filter(c => c.status_consulta !== "cancelada")
        .reduce((sum, c) => sum + (c.valor_medico || 0), 0);
      
      const realizado = dayConsultas
        .filter(c => c.status_pagamento === "pago")
        .reduce((sum, c) => sum + (c.valor_medico || 0), 0);

      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        fullDate: format(day, "dd/MM/yyyy", { locale: ptBR }),
        previsto,
        realizado,
        consultas: dayConsultas.length,
      };
    });
  }, [consultas, dateRange]);

  // Next repasse
  const nextRepasse = useMemo(() => {
    return repasses.find(r => r.status === "pendente" || r.status === "agendado");
  }, [repasses]);

  // Total repassado no período
  const totalRepassado = useMemo(() => {
    return repasses
      .filter(r => r.status === "pago")
      .reduce((sum, r) => sum + (r.valor_total || 0), 0);
  }, [repasses]);

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
      case "30d":
        return "Últimos 30 dias";
      case "3months":
        return "Últimos 3 meses";
      case "6months":
        return "Últimos 6 meses";
      case "12months":
        return "Últimos 12 meses";
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          return `${format(customDateRange.from, "dd/MM")} - ${format(customDateRange.to, "dd/MM/yyyy")}`;
        }
        return "Período personalizado";
      default:
        return "";
    }
  };

  const clearFilters = () => {
    setPeriodFilter("30d");
    setOriginFilter("all");
    setPaymentFilter("all");
    setConsultaStatusFilter("all");
    setLocalFilter("all");
    setPacienteSearch("");
    setCustomDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = 
    periodFilter !== "30d" || 
    originFilter !== "all" || 
    paymentFilter !== "all" || 
    consultaStatusFilter !== "all" || 
    localFilter !== "all" || 
    pacienteSearch !== "";

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">
            Acompanhe seus ganhos e movimentações - {getPeriodLabel()}
          </p>
        </div>

        {/* Advanced Filters - Collapsible */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtros Avançados
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                    {[originFilter !== "all", paymentFilter !== "all", consultaStatusFilter !== "all", pacienteSearch !== ""].filter(Boolean).length + 1}
                  </Badge>
                )}
                {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          <CollapsibleContent className="mt-4">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Período */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Período</Label>
                    <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                      <SelectTrigger>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="3months">Últimos 3 meses</SelectItem>
                        <SelectItem value="6months">Últimos 6 meses</SelectItem>
                        <SelectItem value="12months">Últimos 12 meses</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    {periodFilter === "custom" && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full mt-2">
                            {customDateRange.from && customDateRange.to
                              ? `${format(customDateRange.from, "dd/MM")} - ${format(customDateRange.to, "dd/MM")}`
                              : "Selecionar datas"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
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

                  {/* Origem */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Origem</Label>
                    <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as OriginFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="interna">Interna</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status de Pagamento */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status Pagamento</Label>
                    <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentStatusFilter)}>
                      <SelectTrigger>
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

                  {/* Status da Consulta */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status Consulta</Label>
                    <Select value={consultaStatusFilter} onValueChange={(v) => setConsultaStatusFilter(v as ConsultaStatusFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="confirmada">Confirmada</SelectItem>
                        <SelectItem value="aguardando_pagamento">Aguardando</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Local de Atendimento */}
                  {locais.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Local</Label>
                      <Select value={localFilter} onValueChange={setLocalFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Local" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {locais.map((local) => (
                            <SelectItem key={local.id} value={local.id}>
                              {local.nome_local}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Buscar Paciente */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Paciente</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome..."
                        value={pacienteSearch}
                        onChange={(e) => setPacienteSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Sub-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="visao-geral" className="gap-2 data-[state=active]:bg-background">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="origem-canais" className="gap-2 data-[state=active]:bg-background">
            <PieChartIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Origem & Canais</span>
          </TabsTrigger>
          <TabsTrigger value="fluxo-caixa" className="gap-2 data-[state=active]:bg-background">
            <ArrowRightLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Fluxo de Caixa</span>
          </TabsTrigger>
          <TabsTrigger value="repasses" className="gap-2 data-[state=active]:bg-background">
            <Banknote className="w-4 h-4" />
            <span className="hidden sm:inline">Repasses</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== VISÃO GERAL ==================== */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* A Receber */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-emerald-100 text-xs sm:text-sm font-medium">A Receber</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(metrics.aReceber)}</p>
                    <p className="text-emerald-200 text-xs mt-2 hidden sm:block">{metrics.elegiveis} consultas elegíveis</p>
                  </div>
                  <div className="bg-white/20 rounded-full p-2 sm:p-3 flex-shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recebido */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-blue-100 text-xs sm:text-sm font-medium">Recebido</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(metrics.recebido)}</p>
                    <p className="text-blue-200 text-xs mt-2 hidden sm:block">{repasses.filter(r => r.status === "pago").length} repasse(s)</p>
                  </div>
                  <div className="bg-white/20 rounded-full p-2 sm:p-3 flex-shrink-0">
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pendentes */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-amber-100 text-xs sm:text-sm font-medium">Pendentes</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(metrics.pendentes)}</p>
                    <p className="text-amber-200 text-xs mt-2 hidden sm:block">Aguardando pagamento</p>
                  </div>
                  <div className="bg-white/20 rounded-full p-2 sm:p-3 flex-shrink-0">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Canceladas */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-red-100 text-xs sm:text-sm font-medium">Canceladas</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(metrics.canceladas)}</p>
                    <p className="text-red-200 text-xs mt-2 hidden sm:block">{metrics.naoCompareceram} não compareceram</p>
                  </div>
                  <div className="bg-white/20 rounded-full p-2 sm:p-3 flex-shrink-0">
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Finalization Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.finalizadas}</p>
                    <p className="text-xs text-muted-foreground">Finalizadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.elegiveis}</p>
                    <p className="text-xs text-muted-foreground">Elegíveis Repasse</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.emRepasse}</p>
                    <p className="text-xs text-muted-foreground">Em Repasse</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.naoCompareceram}</p>
                    <p className="text-xs text-muted-foreground">Não Compareceram</p>
                  </div>
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
                <CardDescription>Receita dos últimos 6 meses por origem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyChartData}>
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
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === "online" ? "Online" : name === "interna" ? "Interna" : "Total"
                        ]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="online" name="Online" fill={CHART_COLORS.online} radius={[4, 4, 0, 0]} stackId="stack" />
                      <Bar dataKey="interna" name="Interna" fill={CHART_COLORS.interna} radius={[4, 4, 0, 0]} stackId="stack" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Origin Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Origem das Consultas</CardTitle>
                <CardDescription>Distribuição por canal de agendamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  {originChartData.every((d) => d.value === 0) ? (
                    <p className="text-muted-foreground">Sem dados no período</p>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-8 w-full">
                      <ResponsiveContainer width="100%" height={200} className="max-w-[200px]">
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
                              className="w-4 h-4 rounded-full flex-shrink-0"
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

          {/* Detalhamento de Consultas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhamento de Consultas</CardTitle>
              <CardDescription>{filteredConsultas.length} consultas no período</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredConsultas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma consulta encontrada com os filtros selecionados.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Data/Hora</TableHead>
                        <TableHead className="min-w-[150px]">Paciente</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Seu Valor</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredConsultas.slice(0, 10).map((consulta) => (
                        <TableRow key={consulta.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(parseISO(consulta.data_hora), "dd/MM/yy HH:mm", { locale: ptBR })}
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
                          <TableCell className="text-right whitespace-nowrap">
                            {formatCurrency(consulta.valor_consulta)}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {formatCurrency(consulta.valor_medico)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                consulta.status_pagamento === "pago"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : consulta.status_pagamento === "pendente"
                                  ? "bg-amber-500 hover:bg-amber-600"
                                  : "bg-red-500 hover:bg-red-600"
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
                              className={`text-sm font-medium ${
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
                                : "Aguardando"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredConsultas.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Mostrando 10 de {filteredConsultas.length} consultas
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ORIGEM & CANAIS ==================== */}
        <TabsContent value="origem-canais" className="space-y-6">
          {/* Origin Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Online Card */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                    <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-blue-700 dark:text-blue-300">Consultas Online</CardTitle>
                    <CardDescription>Agendadas pela plataforma</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/30">
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{originMetrics.online.total}</p>
                    <p className="text-sm text-muted-foreground">Consultas</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/30">
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(originMetrics.online.valor)}</p>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Ticket Médio</span>
                  <span className="font-semibold">{formatCurrency(originMetrics.online.ticketMedio)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Consultas Pagas</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {originMetrics.online.pagos} pagas
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Interna Card */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                    <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-green-700 dark:text-green-300">Consultas Internas</CardTitle>
                    <CardDescription>Agendadas pela clínica</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">{originMetrics.interna.total}</p>
                    <p className="text-sm text-muted-foreground">Consultas</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(originMetrics.interna.valor)}</p>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Ticket Médio</span>
                  <span className="font-semibold">{formatCurrency(originMetrics.interna.ticketMedio)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Consultas Pagas</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {originMetrics.interna.pagos} pagas
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Origin Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparativo Online x Interna por Mês</CardTitle>
              <CardDescription>Faturamento mensal dividido por origem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} barGap={8}>
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
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "online" ? "Online" : "Interna"
                      ]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="online" name="Online" fill={CHART_COLORS.online} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="interna" name="Interna" fill={CHART_COLORS.interna} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Origin Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-center">Qtde Consultas</TableHead>
                      <TableHead className="text-right">Faturamento Total</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-center">Taxa de Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.online }} />
                          <span className="font-medium">Online</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{originMetrics.online.total}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(originMetrics.online.valor)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(originMetrics.online.ticketMedio)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {originMetrics.online.total > 0 
                            ? ((originMetrics.online.pagos / originMetrics.online.total) * 100).toFixed(0) 
                            : 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.interna }} />
                          <span className="font-medium">Interna</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{originMetrics.interna.total}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(originMetrics.interna.valor)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(originMetrics.interna.ticketMedio)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {originMetrics.interna.total > 0 
                            ? ((originMetrics.interna.pagos / originMetrics.interna.total) * 100).toFixed(0) 
                            : 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== FLUXO DE CAIXA ==================== */}
        <TabsContent value="fluxo-caixa" className="space-y-6">
          {/* Cash Flow Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fluxo de Caixa Diário</CardTitle>
              <CardDescription>Comparativo entre valores previstos e realizados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cashFlowData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
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
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "previsto" ? "Previsto" : "Realizado"
                      ]}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="previsto"
                      name="Previsto"
                      fill={CHART_COLORS.previsto}
                      fillOpacity={0.2}
                      stroke={CHART_COLORS.previsto}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="realizado"
                      name="Realizado"
                      stroke={CHART_COLORS.realizado}
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Target className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Previsto</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.previsto, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Realizado</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.realizado, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Consultas</p>
                    <p className="text-2xl font-bold">
                      {cashFlowData.reduce((sum, d) => sum + d.consultas, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhamento Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Consultas</TableHead>
                      <TableHead className="text-right">Previsto</TableHead>
                      <TableHead className="text-right">Realizado</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlowData.filter(d => d.consultas > 0).map((day) => (
                      <TableRow key={day.fullDate}>
                        <TableCell className="font-medium">{day.fullDate}</TableCell>
                        <TableCell className="text-center">{day.consultas}</TableCell>
                        <TableCell className="text-right">{formatCurrency(day.previsto)}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{formatCurrency(day.realizado)}</TableCell>
                        <TableCell className="text-right">
                          <span className={day.realizado >= day.previsto ? "text-green-600" : "text-amber-600"}>
                            {formatCurrency(day.realizado - day.previsto)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cashFlowData.filter(d => d.consultas > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhuma consulta no período selecionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== REPASSES ==================== */}
        <TabsContent value="repasses" className="space-y-6">
          {/* Repasse Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Próximo Repasse */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Próximo Repasse
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextRepasse ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{formatCurrency(nextRepasse.valor_total)}</p>
                      <Badge 
                        className={
                          nextRepasse.status === "agendado" 
                            ? "bg-blue-500 mt-2" 
                            : "bg-amber-500 mt-2"
                        }
                      >
                        {nextRepasse.status === "agendado" ? "Agendado" : "Pendente"}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Período:</span>
                        <span>
                          {format(parseISO(nextRepasse.periodo_inicio), "dd/MM")} - {format(parseISO(nextRepasse.periodo_fim), "dd/MM/yyyy")}
                        </span>
                      </div>
                      {nextRepasse.data_prevista_pagamento && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Previsão:</span>
                          <span className="font-medium">{format(parseISO(nextRepasse.data_prevista_pagamento), "dd/MM/yyyy")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum repasse pendente</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Repassado */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  Total Repassado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRepassado)}</p>
                  <p className="text-muted-foreground mt-2">
                    {repasses.filter(r => r.status === "pago").length} repasses realizados
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Repasses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Repasses</CardTitle>
              <CardDescription>Todos os repasses registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {repasses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Banknote className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Nenhum repasse registrado ainda</p>
                  <p className="text-sm mt-1">Os repasses aparecerão aqui quando forem processados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Previsão</TableHead>
                        <TableHead>Pago em</TableHead>
                        <TableHead>Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repasses.map((repasse) => (
                        <TableRow key={repasse.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(parseISO(repasse.periodo_inicio), "dd/MM")} - {format(parseISO(repasse.periodo_fim), "dd/MM/yy")}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(repasse.valor_total)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                repasse.status === "pago"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : repasse.status === "agendado"
                                  ? "bg-blue-500 hover:bg-blue-600"
                                  : "bg-amber-500 hover:bg-amber-600"
                              }
                            >
                              {repasse.status === "pago"
                                ? "Pago"
                                : repasse.status === "agendado"
                                ? "Agendado"
                                : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {repasse.data_prevista_pagamento
                              ? format(parseISO(repasse.data_prevista_pagamento), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {repasse.data_pagamento
                              ? format(parseISO(repasse.data_pagamento), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={repasse.observacoes || ""}>
                            {repasse.observacoes || "-"}
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
      </Tabs>
    </div>
  );
}
