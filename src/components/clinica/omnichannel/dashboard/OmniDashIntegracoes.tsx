import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, isToday, subDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";

interface Props {
  instancias: any[];
  mensagens: any[];
  filas: any[];
  periodo: string;
  filaFilter: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function OmniDashIntegracoes({ instancias, mensagens, filas, periodo, filaFilter }: Props) {
  const [chartView, setChartView] = useState<"hora" | "dia">("hora");
  const [pieView, setPieView] = useState<"envios" | "respostas">("envios");

  // Filtrar mensagens por período
  const filteredMensagens = useMemo(() => {
    const now = new Date();
    return mensagens.filter(m => {
      const date = new Date(m.created_at);
      switch (periodo) {
        case "hoje":
          return isToday(date);
        case "ontem":
          return format(date, "yyyy-MM-dd") === format(subDays(now, 1), "yyyy-MM-dd");
        case "7dias":
          return isWithinInterval(date, { start: subDays(now, 7), end: now });
        case "30dias":
          return isWithinInterval(date, { start: subDays(now, 30), end: now });
        case "mes":
          return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
        default:
          return true;
      }
    });
  }, [mensagens, periodo]);

  // Métricas de integrações
  const totalMensagens = filteredMensagens.length;
  const enviadasSucesso = filteredMensagens.filter(m => m.direcao === 'saida' && m.status !== 'erro').length;
  const falhas = filteredMensagens.filter(m => m.status === 'erro').length;
  const respondidas = filteredMensagens.filter(m => m.direcao === 'entrada').length;
  const taxaSucesso = totalMensagens > 0 ? Math.round((enviadasSucesso / totalMensagens) * 100) : 0;
  const taxaResposta = totalMensagens > 0 ? Math.round((respondidas / totalMensagens) * 100) : 0;

  // Dados do gráfico por hora
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hora: `${i.toString().padStart(2, '0')}h`,
      envios: 0,
      respostas: 0,
      falhas: 0
    }));

    filteredMensagens.forEach(m => {
      const hour = new Date(m.created_at).getHours();
      if (m.status === 'erro') {
        hours[hour].falhas++;
      } else if (m.direcao === 'saida') {
        hours[hour].envios++;
      } else {
        hours[hour].respostas++;
      }
    });

    return hours;
  }, [filteredMensagens]);

  // Dados da tabela por integração/instância
  const instanciasData = useMemo(() => {
    return instancias.map(inst => {
      const instMsgs = filteredMensagens.filter(m => {
        // Precisamos verificar qual fila está associada a esta instância
        const filasInst = filas.filter(f => f.instancia_id === inst.id);
        return filasInst.some(f => m.atendimento?.fila_id === f.id);
      });

      const fila = filas.find(f => f.instancia_id === inst.id);

      return {
        id: inst.id,
        nome: inst.nome,
        fila: fila?.nome || "-",
        envios: instMsgs.filter(m => m.direcao === 'saida' && m.status !== 'erro').length,
        falhas: instMsgs.filter(m => m.status === 'erro').length,
        respostas: instMsgs.filter(m => m.direcao === 'entrada').length
      };
    });
  }, [instancias, filteredMensagens, filas]);

  // Dados do pie chart
  const pieData = useMemo(() => {
    if (pieView === "envios") {
      return instanciasData
        .filter(i => i.envios > 0)
        .map(i => ({ name: i.nome, value: i.envios }));
    }
    return instanciasData
      .filter(i => i.respostas > 0)
      .map(i => ({ name: i.nome, value: i.respostas }));
  }, [instanciasData, pieView]);

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total de mensagens" value={totalMensagens} />
        <MetricCard 
          label="Enviadas com sucesso" 
          value={enviadasSucesso} 
          showProgress 
          progress={taxaSucesso} 
        />
        <MetricCard label="Problemas com o número" value={0} />
        <MetricCard label="Outros problemas" value={0} />
        <MetricCard label="Total de falhas" value={falhas} />
        <MetricCard 
          label="Mensagens respondidas" 
          value={respondidas} 
          showProgress 
          progress={taxaResposta} 
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Tabs value={chartView} onValueChange={(v) => setChartView(v as "hora" | "dia")}>
                <TabsList>
                  <TabsTrigger value="hora">Mensagens por hora</TabsTrigger>
                  <TabsTrigger value="dia">Mensagens por dia do mês</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Envios</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Respostas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Falhas</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hora" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="envios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="respostas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="falhas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pizza */}
        <Card>
          <CardHeader className="pb-2">
            <Tabs value={pieView} onValueChange={(v) => setPieView(v as "envios" | "respostas")}>
              <TabsList className="w-full">
                <TabsTrigger value="envios" className="flex-1">Envios por integração</TabsTrigger>
                <TabsTrigger value="respostas" className="flex-1">Respostas</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Integrações */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Integração</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integração</TableHead>
                <TableHead>Fila</TableHead>
                <TableHead className="text-center">Envios</TableHead>
                <TableHead className="text-center">Falhas</TableHead>
                <TableHead className="text-center">Respostas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instanciasData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Sem dados
                  </TableCell>
                </TableRow>
              ) : (
                instanciasData.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.nome}</TableCell>
                    <TableCell>{inst.fila}</TableCell>
                    <TableCell className="text-center">{inst.envios}</TableCell>
                    <TableCell className="text-center">{inst.falhas}</TableCell>
                    <TableCell className="text-center">{inst.respostas}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Card de Métrica
function MetricCard({ 
  label, 
  value, 
  showProgress, 
  progress
}: { 
  label: string; 
  value: string | number; 
  showProgress?: boolean;
  progress?: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold">{value}</span>
          {showProgress && progress !== undefined && (
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${progress} ${100 - progress}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {progress}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
