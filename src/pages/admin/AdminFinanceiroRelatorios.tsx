import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Stethoscope,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid, AreaChart, Area
} from "recharts";

const CHART_COLORS = ["#0066CC", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

export default function AdminFinanceiroRelatorios() {
  const [periodo, setPeriodo] = useState("30");
  const [tipoRelatorio, setTipoRelatorio] = useState("geral");
  const [agrupamento, setAgrupamento] = useState("dia");

  const dateRange = useMemo(() => ({
    inicio: format(subDays(new Date(), parseInt(periodo)), "yyyy-MM-dd"),
    fim: format(new Date(), "yyyy-MM-dd"),
  }), [periodo]);

  // Fetch all data
  const { data: consultas, isLoading } = useQuery({
    queryKey: ["admin-relatorios", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          *,
          medico:medicos!consultas_medico_id_fkey(id, nome, especialidade),
          paciente:pacientes!consultas_paciente_id_fkey(id, nome, cidade, estado)
        `)
        .gte("data_hora", `${dateRange.inicio}T00:00:00`)
        .lte("data_hora", `${dateRange.fim}T23:59:59`)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Only online consultations for revenue
  const consultasOnline = useMemo(() => 
    consultas?.filter(c => c.origem !== 'interna') || [], 
    [consultas]
  );

  // General metrics
  const metrics = useMemo(() => {
    const all = consultas || [];
    const online = consultasOnline;
    
    return {
      totalConsultas: all.length,
      consultasOnline: online.length,
      consultasInternas: all.filter(c => c.origem === 'interna').length,
      consultasPagas: online.filter(c => c.status_pagamento === 'pago').length,
      consultasPendentes: online.filter(c => c.status_pagamento === 'pendente').length,
      consultasCanceladas: online.filter(c => c.status_pagamento === 'cancelado').length,
      receitaTotal: online.reduce((sum, c) => sum + Number(c.valor_consulta), 0),
      receitaPaga: online.filter(c => c.status_pagamento === 'pago').reduce((sum, c) => sum + Number(c.valor_consulta), 0),
      lucroPlataforma: online.reduce((sum, c) => sum + Number(c.valor_plataforma), 0),
      repassesMedicos: online.reduce((sum, c) => sum + Number(c.valor_medico), 0),
      ticketMedio: online.length > 0 ? online.reduce((sum, c) => sum + Number(c.valor_consulta), 0) / online.length : 0,
    };
  }, [consultas, consultasOnline]);

  // Data by period
  const dadosPorPeriodo = useMemo(() => {
    if (!consultasOnline.length) return [];
    
    const grouped: Record<string, { receita: number; lucro: number; consultas: number }> = {};
    
    consultasOnline.forEach(c => {
      let key = '';
      const date = new Date(c.data_hora);
      
      if (agrupamento === 'dia') {
        key = format(date, 'dd/MM');
      } else if (agrupamento === 'semana') {
        key = `Sem ${format(date, 'w')}`;
      } else {
        key = format(date, 'MMM/yy', { locale: ptBR });
      }
      
      if (!grouped[key]) {
        grouped[key] = { receita: 0, lucro: 0, consultas: 0 };
      }
      grouped[key].receita += Number(c.valor_consulta);
      grouped[key].lucro += Number(c.valor_plataforma);
      grouped[key].consultas += 1;
    });
    
    return Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data }))
      .slice(-15);
  }, [consultasOnline, agrupamento]);

  // Data by specialty
  const dadosPorEspecialidade = useMemo(() => {
    if (!consultasOnline.length) return [];
    
    const grouped: Record<string, { receita: number; consultas: number }> = {};
    
    consultasOnline.forEach((c: any) => {
      const esp = c.medico?.especialidade || 'Não informado';
      if (!grouped[esp]) {
        grouped[esp] = { receita: 0, consultas: 0 };
      }
      grouped[esp].receita += Number(c.valor_consulta);
      grouped[esp].consultas += 1;
    });
    
    return Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.receita - a.receita);
  }, [consultasOnline]);

  // Data by doctor
  const dadosPorMedico = useMemo(() => {
    if (!consultasOnline.length) return [];
    
    const grouped: Record<string, { nome: string; especialidade: string; receita: number; consultas: number; ticketMedio: number }> = {};
    
    consultasOnline.forEach((c: any) => {
      const id = c.medico?.id || 'unknown';
      if (!grouped[id]) {
        grouped[id] = { 
          nome: c.medico?.nome || 'Desconhecido', 
          especialidade: c.medico?.especialidade || '',
          receita: 0, 
          consultas: 0,
          ticketMedio: 0 
        };
      }
      grouped[id].receita += Number(c.valor_consulta);
      grouped[id].consultas += 1;
    });
    
    return Object.values(grouped)
      .map(d => ({ ...d, ticketMedio: d.consultas > 0 ? d.receita / d.consultas : 0 }))
      .sort((a, b) => b.receita - a.receita);
  }, [consultasOnline]);

  // Data by region
  const dadosPorRegiao = useMemo(() => {
    if (!consultas?.length) return [];
    
    const grouped: Record<string, { consultas: number; pacientes: Set<string> }> = {};
    
    consultas.forEach((c: any) => {
      const estado = c.paciente?.estado || 'Não informado';
      if (!grouped[estado]) {
        grouped[estado] = { consultas: 0, pacientes: new Set() };
      }
      grouped[estado].consultas += 1;
      if (c.paciente?.id) {
        grouped[estado].pacientes.add(c.paciente.id);
      }
    });
    
    return Object.entries(grouped)
      .map(([name, data]) => ({ name, consultas: data.consultas, pacientes: data.pacientes.size }))
      .sort((a, b) => b.consultas - a.consultas)
      .slice(0, 10);
  }, [consultas]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('R$') || entry.dataKey === 'receita' || entry.dataKey === 'lucro' 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-44">
            <Calendar className="h-4 w-4 mr-2" />
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

        <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
          <SelectTrigger className="w-44">
            <FileText className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="geral">Visão Geral</SelectItem>
            <SelectItem value="medicos">Por Médico</SelectItem>
            <SelectItem value="especialidades">Por Especialidade</SelectItem>
            <SelectItem value="regioes">Por Região</SelectItem>
          </SelectContent>
        </Select>

        <Select value={agrupamento} onValueChange={setAgrupamento}>
          <SelectTrigger className="w-36">
            <BarChart3 className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dia">Por Dia</SelectItem>
            <SelectItem value="semana">Por Semana</SelectItem>
            <SelectItem value="mes">Por Mês</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2 ml-auto">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Consultas</p>
            <p className="text-2xl font-bold">{metrics.totalConsultas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Online</p>
            <p className="text-2xl font-bold text-blue-600">{metrics.consultasOnline}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Internas</p>
            <p className="text-2xl font-bold text-green-600">{metrics.consultasInternas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.receitaTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Lucro Plataforma</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.lucroPlataforma)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
            <p className="text-2xl font-bold text-cyan-600">{formatCurrency(metrics.ticketMedio)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts based on report type */}
      {tipoRelatorio === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue over time */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Receita e Lucro por Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosPorPeriodo}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="receita" name="Receita" fill="#0066CC" fillOpacity={0.3} stroke="#0066CC" />
                    <Area type="monotone" dataKey="lucro" name="Lucro" fill="#8B5CF6" fillOpacity={0.3} stroke="#8B5CF6" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pagas', value: metrics.consultasPagas, color: '#10B981' },
                        { name: 'Pendentes', value: metrics.consultasPendentes, color: '#F59E0B' },
                        { name: 'Canceladas', value: metrics.consultasCanceladas, color: '#EF4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[{ color: '#10B981' }, { color: '#F59E0B' }, { color: '#EF4444' }].map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Consultations over time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Volume de Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPorPeriodo}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="consultas" name="Consultas" fill="#0066CC" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tipoRelatorio === 'especialidades' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Receita por Especialidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosPorEspecialidade}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="receita"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {dadosPorEspecialidade.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes por Especialidade</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Especialidade</TableHead>
                    <TableHead className="text-right">Consultas</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosPorEspecialidade.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.consultas}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.receita)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tipoRelatorio === 'medicos' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performance por Médico
            </CardTitle>
            <CardDescription>Ranking de médicos por receita gerada</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead className="text-right">Consultas</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">Receita Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPorMedico.map((med, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        {index + 1}º
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{med.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{med.especialidade || '-'}</TableCell>
                    <TableCell className="text-right">{med.consultas}</TableCell>
                    <TableCell className="text-right">{formatCurrency(med.ticketMedio)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(med.receita)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tipoRelatorio === 'regioes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Consultas por Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPorRegiao} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="consultas" name="Consultas" fill="#0066CC" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes por Região</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Consultas</TableHead>
                    <TableHead className="text-right">Pacientes Únicos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosPorRegiao.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.consultas}</TableCell>
                      <TableCell className="text-right">{item.pacientes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
