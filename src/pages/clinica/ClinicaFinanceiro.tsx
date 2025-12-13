import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  Filter,
  ChevronDown,
  Search,
} from "lucide-react";

interface ClinicaContext {
  clinicaData: any;
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
  medico_id: string;
  local_id: string | null;
  paciente: { nome: string } | null;
  medico: { nome: string; especialidade: string } | null;
  local: { nome_local: string } | null;
  nome_paciente_consulta: string | null;
}

type PeriodFilter = "7d" | "30d" | "60d" | "90d" | "180d" | "365d";

const COLORS = ["#22c55e", "#eab308", "#ef4444", "#3b82f6"];

export default function ClinicaFinanceiro() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [medicos, setMedicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [locais, setLocais] = useState<Array<{ id: string; nome_local: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filtros
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [localFilter, setLocalFilter] = useState("todos");
  const [searchPaciente, setSearchPaciente] = useState("");

  const dateRange = useMemo(() => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 90); // 3 months ahead
    
    switch (periodFilter) {
      case "7d":
        return { start: subDays(now, 7), end: future };
      case "30d":
        return { start: subDays(now, 30), end: future };
      case "60d":
        return { start: subDays(now, 60), end: future };
      case "90d":
        return { start: subDays(now, 90), end: future };
      case "180d":
        return { start: subDays(now, 180), end: future };
      case "365d":
        return { start: subDays(now, 365), end: future };
      default:
        return { start: subDays(now, 30), end: future };
    }
  }, [periodFilter]);

  useEffect(() => {
    if (clinicaData?.id) {
      fetchData();
    }
  }, [clinicaData?.id, dateRange]);

  async function fetchData() {
    setLoading(true);

    // Busca médicos vinculados
    const { data: vinculosData } = await supabase
      .from("clinicas_medicos")
      .select("medico_id, medicos(id, nome)")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    const medicosVinculados = vinculosData?.map((v: any) => v.medicos).filter(Boolean) || [];
    setMedicos(medicosVinculados);

    if (medicosVinculados.length === 0) {
      setConsultas([]);
      setLoading(false);
      return;
    }

    const medicoIds = medicosVinculados.map((m: any) => m.id);

    // Busca locais dos médicos
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local")
      .in("medico_id", medicoIds)
      .eq("ativo", true);

    setLocais(locaisData || []);

    // Busca consultas
    const { data, error } = await supabase
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
        medico_id,
        local_id,
        nome_paciente_consulta,
        paciente:pacientes!consultas_paciente_id_fkey(nome),
        medico:medicos!consultas_medico_id_fkey(nome, especialidade),
        local:locais_atendimento!consultas_local_id_fkey(nome_local)
      `)
      .in("medico_id", medicoIds)
      .gte("data_hora", dateRange.start.toISOString())
      .lte("data_hora", dateRange.end.toISOString())
      .order("data_hora", { ascending: false });

    if (!error) {
      setConsultas(data || []);
    }
    setLoading(false);
  }

  const filteredConsultas = useMemo(() => {
    return consultas.filter((c) => {
      const matchMedico = medicoFilter === "todos" || c.medico_id === medicoFilter;
      const matchStatus = statusFilter === "todos" || 
        (statusFilter === "pago" && c.status_pagamento === "pago") ||
        (statusFilter === "pendente" && c.status_pagamento === "pendente" && c.status_consulta !== "cancelada") ||
        (statusFilter === "cancelado" && c.status_consulta === "cancelada");
      const matchOrigem = origemFilter === "todos" || c.origem === origemFilter;
      const matchLocal = localFilter === "todos" || c.local_id === localFilter;
      const matchSearch = !searchPaciente.trim() || 
        (c.nome_paciente_consulta || c.paciente?.nome || "").toLowerCase().includes(searchPaciente.toLowerCase());

      return matchMedico && matchStatus && matchOrigem && matchLocal && matchSearch;
    });
  }, [consultas, medicoFilter, statusFilter, origemFilter, localFilter, searchPaciente]);

  const metrics = useMemo(() => {
    // Only online appointments count for revenue
    const onlineConsultas = filteredConsultas.filter((c) => c.origem === "online");
    
    const pago = onlineConsultas
      .filter((c) => c.status_pagamento === "pago")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const pendente = onlineConsultas
      .filter((c) => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const cancelado = filteredConsultas
      .filter((c) => c.status_consulta === "cancelada")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const total = filteredConsultas.length;
    const pagos = filteredConsultas.filter((c) => c.status_pagamento === "pago").length;

    return { pago, pendente, cancelado, total, pagos };
  }, [filteredConsultas]);

  const chartData = useMemo(() => {
    const data: { [key: string]: number } = {};
    filteredConsultas
      .filter((c) => c.status_pagamento === "pago" && c.origem === "online")
      .forEach((c) => {
        const date = format(parseISO(c.data_hora), "dd/MM");
        data[date] = (data[date] || 0) + c.valor_consulta;
      });

    return Object.entries(data)
      .map(([date, value]) => ({ date, value }))
      .slice(-15);
  }, [filteredConsultas]);

  const medicoChartData = useMemo(() => {
    const data: { [key: string]: number } = {};
    filteredConsultas
      .filter((c) => c.status_pagamento === "pago" && c.origem === "online")
      .forEach((c) => {
        const medicoNome = c.medico?.nome || "Desconhecido";
        data[medicoNome] = (data[medicoNome] || 0) + c.valor_consulta;
      });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredConsultas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPatientName = (consulta: Consulta) => {
    return consulta.nome_paciente_consulta || consulta.paciente?.nome || "Não informado";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financeiro</h2>
          <p className="text-muted-foreground">Acompanhe o faturamento da clínica</p>
        </div>

        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="60d">Últimos 60 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="180d">Últimos 180 dias</SelectItem>
            <SelectItem value="365d">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4" />
            Filtros Avançados
            <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Médico</label>
                  <Select value={medicoFilter} onValueChange={setMedicoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {medicos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          Dr(a). {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Pagamento</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Origem</label>
                  <Select value={origemFilter} onValueChange={setOrigemFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="interna">Interna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Local</label>
                  <Select value={localFilter} onValueChange={setLocalFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {locais.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome_local}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Paciente</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchPaciente}
                      onChange={(e) => setSearchPaciente(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-green-500/10 shrink-0">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Faturamento</p>
                <p className="text-lg sm:text-2xl font-bold text-green-500 truncate">{formatCurrency(metrics.pago)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-yellow-500/10 shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Pendente</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-500 truncate">{formatCurrency(metrics.pendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-red-500/10 shrink-0">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Cancelado</p>
                <p className="text-lg sm:text-2xl font-bold text-red-500 truncate">{formatCurrency(metrics.cancelado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-primary/10 shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Consultas Pagas</p>
                <p className="text-lg sm:text-2xl font-bold truncate">{metrics.pagos} / {metrics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Faturamento Diário</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível para o período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis tickFormatter={(v) => `R$${v}`} fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Faturamento por Médico</CardTitle>
          </CardHeader>
          <CardContent>
            {medicoChartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={medicoChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                    >
                      {medicoChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {medicoChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm truncate flex-1">{item.name}</span>
                      <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Consultas do Período ({filteredConsultas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredConsultas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma consulta no período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsultas.slice(0, 30).map((consulta) => (
                    <TableRow key={consulta.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(consulta.data_hora), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>Dr(a). {consulta.medico?.nome || "N/A"}</TableCell>
                      <TableCell>{getPatientName(consulta)}</TableCell>
                      <TableCell>
                        <Badge variant={consulta.origem === "online" ? "default" : "secondary"}>
                          {consulta.origem === "online" ? "Online" : "Interna"}
                        </Badge>
                      </TableCell>
                      <TableCell>{consulta.local?.nome_local || "-"}</TableCell>
                      <TableCell>{formatCurrency(consulta.valor_consulta)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            consulta.status_pagamento === "pago"
                              ? "default"
                              : consulta.status_consulta === "cancelada"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {consulta.status_pagamento === "pago"
                            ? "Pago"
                            : consulta.status_consulta === "cancelada"
                            ? "Cancelada"
                            : "Pendente"}
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
    </div>
  );
}
