import { useState } from "react";
import { Calendar, Filter, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, Search, Eye, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from "recharts";

const COLORS = {
  confirmada: "#10B981",
  aguardando_pagamento: "#F59E0B",
  cancelada: "#EF4444",
  pago: "#10B981",
  pendente: "#F59E0B",
  falhou: "#EF4444",
};

const statusConsultaLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando Pagamento",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const statusPagamentoLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  falhou: "Falhou",
};

export default function AdminConsultas() {
  const [filters, setFilters] = useState({
    dataInicio: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    dataFim: format(new Date(), "yyyy-MM-dd"),
    statusConsulta: "all",
    statusPagamento: "all",
    search: "",
  });

  // Fetch consultas
  const { data: consultas, isLoading } = useQuery({
    queryKey: ["admin-consultas-full", filters],
    queryFn: async () => {
      let query = supabase
        .from("consultas")
        .select(`
          *,
          medico:medicos(nome, especialidade),
          paciente:pacientes(nome, cpf, telefone)
        `)
        .order("data_hora", { ascending: false });

      if (filters.dataInicio) {
        query = query.gte("data_hora", `${filters.dataInicio}T00:00:00`);
      }
      if (filters.dataFim) {
        query = query.lte("data_hora", `${filters.dataFim}T23:59:59`);
      }
      if (filters.statusConsulta !== "all") {
        query = query.eq("status_consulta", filters.statusConsulta);
      }
      if (filters.statusPagamento !== "all") {
        query = query.eq("status_pagamento", filters.statusPagamento);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return data?.filter(
          (c: any) =>
            c.medico?.nome?.toLowerCase().includes(searchLower) ||
            c.paciente?.nome?.toLowerCase().includes(searchLower)
        );
      }

      return data;
    },
  });

  // Stats
  const stats = {
    total: consultas?.length || 0,
    confirmadas: consultas?.filter((c) => c.status_consulta === "confirmada").length || 0,
    aguardando: consultas?.filter((c) => c.status_consulta === "aguardando_pagamento").length || 0,
    canceladas: consultas?.filter((c) => c.status_consulta === "cancelada").length || 0,
    valorTotal: consultas?.reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
    valorPago: consultas?.filter((c) => c.status_pagamento === "pago").reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
  };

  // Chart data - Status Consulta
  const statusConsultaData = [
    { name: "Confirmadas", value: stats.confirmadas, color: COLORS.confirmada },
    { name: "Aguardando", value: stats.aguardando, color: COLORS.aguardando_pagamento },
    { name: "Canceladas", value: stats.canceladas, color: COLORS.cancelada },
  ].filter((d) => d.value > 0);

  // Chart data - Status Pagamento
  const statusPagamentoData = [
    { name: "Pago", value: consultas?.filter((c) => c.status_pagamento === "pago").length || 0, color: COLORS.pago },
    { name: "Pendente", value: consultas?.filter((c) => c.status_pagamento === "pendente").length || 0, color: COLORS.pendente },
    { name: "Falhou", value: consultas?.filter((c) => c.status_pagamento === "falhou").length || 0, color: COLORS.falhou },
  ].filter((d) => d.value > 0);

  // Chart data - Consultas por dia
  const consultasPorDia = (() => {
    if (!consultas) return [];
    const days: Record<string, number> = {};
    
    consultas.forEach((c) => {
      const day = format(new Date(c.data_hora), "dd/MM");
      days[day] = (days[day] || 0) + 1;
    });

    return Object.entries(days)
      .slice(-14)
      .map(([name, consultas]) => ({ name, consultas }));
  })();

  const clearFilters = () => {
    setFilters({
      dataInicio: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      dataFim: format(new Date(), "yyyy-MM-dd"),
      statusConsulta: "all",
      statusPagamento: "all",
      search: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7" />
            Consultas
          </h1>
          <p className="text-muted-foreground">Visualize e gerencie todas as consultas do sistema</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Consultas</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmadas</p>
                <p className="text-3xl font-bold text-green-600">{stats.confirmadas}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aguardando</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.aguardando}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.valorTotal)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status das Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            {statusConsultaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusConsultaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {statusConsultaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPagamentoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusPagamentoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {statusPagamentoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consultas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {consultasPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={consultasPorDia}>
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="consultas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar médico ou paciente..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Inicial</Label>
              <Input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Final</Label>
              <Input
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
              />
            </div>
            <Select
              value={filters.statusConsulta}
              onValueChange={(value) => setFilters({ ...filters, statusConsulta: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status Consulta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="aguardando_pagamento">Aguardando</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.statusPagamento}
              onValueChange={(value) => setFilters({ ...filters, statusPagamento: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="falhou">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Consultas ({consultas?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : consultas && consultas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas.map((consulta: any) => (
                    <TableRow key={consulta.id}>
                      <TableCell className="font-medium">{consulta.paciente?.nome || "—"}</TableCell>
                      <TableCell>{consulta.medico?.nome || "—"}</TableCell>
                      <TableCell>{consulta.medico?.especialidade || "—"}</TableCell>
                      <TableCell>
                        {format(new Date(consulta.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(consulta.valor_consulta)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: COLORS[consulta.status_consulta as keyof typeof COLORS] }}
                          className="text-white"
                        >
                          {statusConsultaLabels[consulta.status_consulta] || consulta.status_consulta}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: COLORS[consulta.status_pagamento as keyof typeof COLORS] }}
                          className="text-white"
                        >
                          {statusPagamentoLabels[consulta.status_pagamento] || consulta.status_pagamento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Ver detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhuma consulta encontrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
