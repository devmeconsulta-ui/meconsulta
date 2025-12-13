import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  Clock,
  XCircle,
  DollarSign,
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
  paciente: { nome: string } | null;
  medico: { nome: string } | null;
  nome_paciente_consulta: string | null;
}

type PeriodFilter = "7d" | "30d" | "90d" | "365d";

export default function ClinicaFinanceiro() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "90d":
        return { start: subDays(now, 90), end: now };
      case "365d":
        return { start: subDays(now, 365), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  }, [periodFilter]);

  useEffect(() => {
    if (!clinicaData?.id) return;
    fetchConsultas();
  }, [clinicaData?.id, dateRange]);

  async function fetchConsultas() {
    setLoading(true);

    // Busca médicos vinculados
    const { data: vinculosData } = await supabase
      .from("clinicas_medicos")
      .select("medico_id")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    if (!vinculosData || vinculosData.length === 0) {
      setConsultas([]);
      setLoading(false);
      return;
    }

    const medicoIds = vinculosData.map((v) => v.medico_id);

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
        nome_paciente_consulta,
        paciente:pacientes!consultas_paciente_id_fkey(nome),
        medico:medicos!consultas_medico_id_fkey(nome)
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

  const metrics = useMemo(() => {
    const pago = consultas
      .filter((c) => c.status_pagamento === "pago" && c.origem === "online")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const pendente = consultas
      .filter((c) => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const cancelado = consultas
      .filter((c) => c.status_consulta === "cancelada")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const total = consultas.length;
    const pagos = consultas.filter((c) => c.status_pagamento === "pago").length;

    return { pago, pendente, cancelado, total, pagos };
  }, [consultas]);

  const chartData = useMemo(() => {
    const data: { [key: string]: number } = {};
    consultas
      .filter((c) => c.status_pagamento === "pago")
      .forEach((c) => {
        const date = format(parseISO(c.data_hora), "dd/MM");
        data[date] = (data[date] || 0) + c.valor_consulta;
      });

    return Object.entries(data)
      .map(([date, value]) => ({ date, value }))
      .slice(-15);
  }, [consultas]);

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
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="365d">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(metrics.pago)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-yellow-500">{formatCurrency(metrics.pendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/10">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cancelado</p>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(metrics.cancelado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consultas Pagas</p>
                <p className="text-2xl font-bold">{metrics.pagos} / {metrics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => `R$ ${v}`} />
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

      {/* Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Consultas do Período</CardTitle>
        </CardHeader>
        <CardContent>
          {consultas.length === 0 ? (
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
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas.slice(0, 20).map((consulta) => (
                    <TableRow key={consulta.id}>
                      <TableCell>
                        {format(parseISO(consulta.data_hora), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>Dr(a). {consulta.medico?.nome || "N/A"}</TableCell>
                      <TableCell>{getPatientName(consulta)}</TableCell>
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
