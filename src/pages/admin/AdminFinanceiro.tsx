import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight, Filter, Download, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#0066CC", "#10B981", "#F59E0B", "#8B5CF6"];

export default function AdminFinanceiro() {
  const [periodo, setPeriodo] = useState("30");
  const [dateRange, setDateRange] = useState({
    inicio: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    fim: format(new Date(), "yyyy-MM-dd"),
  });

  // Fetch financial data
  const { data: consultas, isLoading } = useQuery({
    queryKey: ["admin-financeiro", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          *,
          medico:medicos(nome, especialidade, percentual_repasse)
        `)
        .gte("data_hora", `${dateRange.inicio}T00:00:00`)
        .lte("data_hora", `${dateRange.fim}T23:59:59`)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate financial metrics - consultas internas não geram receita
  const consultasOnline = consultas?.filter((c) => c.origem !== 'interna') || [];
  const metrics = {
    receitaTotal: consultasOnline.reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
    receitaPaga: consultasOnline.filter((c) => c.status_pagamento === "pago").reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
    receitaPendente: consultasOnline.filter((c) => c.status_pagamento === "pendente").reduce((acc, c) => acc + Number(c.valor_consulta), 0) || 0,
    totalRepasses: consultasOnline.reduce((acc, c) => acc + Number(c.valor_medico), 0) || 0,
    lucroPlataforma: consultasOnline.reduce((acc, c) => acc + Number(c.valor_plataforma), 0) || 0,
    consultasPagas: consultasOnline.filter((c) => c.status_pagamento === "pago").length || 0,
    consultasPendentes: consultasOnline.filter((c) => c.status_pagamento === "pendente").length || 0,
  };

  // Chart data - Receita por dia (apenas consultas online)
  const receitaPorDia = (() => {
    if (!consultasOnline.length) return [];
    const days: Record<string, { receita: number; repasse: number; lucro: number }> = {};
    
    consultasOnline.forEach((c) => {
      const day = format(new Date(c.data_hora), "dd/MM");
      if (!days[day]) {
        days[day] = { receita: 0, repasse: 0, lucro: 0 };
      }
      days[day].receita += Number(c.valor_consulta);
      days[day].repasse += Number(c.valor_medico);
      days[day].lucro += Number(c.valor_plataforma);
    });

    return Object.entries(days)
      .slice(-14)
      .map(([name, values]) => ({ name, ...values }));
  })();

  // Chart data - Distribuição de receita
  const distribuicaoReceita = [
    { name: "Repasses Médicos", value: metrics.totalRepasses, color: "#0066CC" },
    { name: "Lucro Plataforma", value: metrics.lucroPlataforma, color: "#10B981" },
  ];

  // Chart data - Status de pagamento
  const statusPagamento = [
    { name: "Pago", value: metrics.receitaPaga, color: "#10B981" },
    { name: "Pendente", value: metrics.receitaPendente, color: "#F59E0B" },
  ];

  // Top médicos por receita (apenas consultas online)
  const topMedicos = (() => {
    if (!consultasOnline.length) return [];
    const medicos: Record<string, { nome: string; receita: number; consultas: number }> = {};
    
    consultasOnline.forEach((c: any) => {
      const nome = c.medico?.nome || "Desconhecido";
      if (!medicos[nome]) {
        medicos[nome] = { nome, receita: 0, consultas: 0 };
      }
      medicos[nome].receita += Number(c.valor_consulta);
      medicos[nome].consultas += 1;
    });

    return Object.values(medicos)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  })();

  const handlePeriodoChange = (value: string) => {
    setPeriodo(value);
    const dias = parseInt(value);
    setDateRange({
      inicio: format(subDays(new Date(), dias), "yyyy-MM-dd"),
      fim: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-7 w-7" />
            Financeiro
          </h1>
          <p className="text-muted-foreground">Gestão financeira e relatórios da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.receitaTotal)}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {consultas?.length || 0} consultas
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Paga</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.receitaPaga)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.consultasPagas} consultas pagas
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(metrics.receitaPendente)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.consultasPendentes} consultas pendentes
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lucro Plataforma</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.lucroPlataforma)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa de serviço
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução da Receita</CardTitle>
          </CardHeader>
          <CardContent>
            {receitaPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={receitaPorDia}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066CC" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#0066CC" fillOpacity={1} fill="url(#colorReceita)" />
                  <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#10B981" fillOpacity={1} fill="url(#colorLucro)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            {distribuicaoReceita.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribuicaoReceita}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {distribuicaoReceita.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Médicos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Médicos por Receita</CardTitle>
        </CardHeader>
        <CardContent>
          {topMedicos.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topMedicos} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                <YAxis type="category" dataKey="nome" width={150} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
          )}
        </CardContent>
      </Card>

      {/* Repasses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Repasses Pendentes para Médicos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : consultas && consultas.filter((c) => c.status_pagamento === "pago" && c.status_repasse === "pendente").length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Médico</TableHead>
                    <TableHead>Data Consulta</TableHead>
                    <TableHead>Valor Consulta</TableHead>
                    <TableHead>Valor Repasse</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas
                    .filter((c) => c.status_pagamento === "pago" && c.status_repasse === "pendente")
                    .map((consulta: any) => (
                      <TableRow key={consulta.id}>
                        <TableCell className="font-medium">{consulta.medico?.nome || "—"}</TableCell>
                        <TableCell>
                          {format(new Date(consulta.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{formatCurrency(consulta.valor_consulta)}</TableCell>
                        <TableCell className="font-semibold text-primary">
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
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum repasse pendente.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
