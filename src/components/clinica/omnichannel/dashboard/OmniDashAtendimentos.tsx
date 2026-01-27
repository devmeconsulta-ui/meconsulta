import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, startOfDay, isToday, subDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  atendimentos: any[];
  mensagens: any[];
  filas: any[];
  periodo: string;
  filaFilter: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function OmniDashAtendimentos({ atendimentos, mensagens, filas, periodo, filaFilter }: Props) {
  const [chartView, setChartView] = useState<"hora" | "dia">("hora");
  const [pieView, setPieView] = useState<"fila" | "canal">("fila");

  // Filtrar atendimentos por período e fila
  const filteredAtendimentos = useMemo(() => {
    let filtered = atendimentos;

    // Filtrar por fila
    if (filaFilter !== "todas") {
      filtered = filtered.filter(a => a.fila_id === filaFilter);
    }

    // Filtrar por período
    const now = new Date();
    filtered = filtered.filter(a => {
      const date = new Date(a.data_abertura);
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

    return filtered;
  }, [atendimentos, periodo, filaFilter]);

  // Métricas
  const totalAtendimentos = filteredAtendimentos.length;
  const clientesUnicos = new Set(filteredAtendimentos.map(a => a.contato_id)).size;
  const taxaConversao = totalAtendimentos > 0 ? Math.round((clientesUnicos / totalAtendimentos) * 100) : 0;

  const msgsEnviadas = filteredAtendimentos.reduce((acc, a) => {
    const msgs = mensagens.filter(m => m.atendimento_id === a.id && m.direcao === 'saida');
    return acc + msgs.length;
  }, 0);

  const msgsRecebidas = filteredAtendimentos.reduce((acc, a) => {
    const msgs = mensagens.filter(m => m.atendimento_id === a.id && m.direcao === 'entrada');
    return acc + msgs.length;
  }, 0);

  // TMA (Tempo Médio de Atendimento)
  const finalizados = filteredAtendimentos.filter(a => a.status === "finalizado");
  const tmaSegundos = finalizados.reduce((acc, a) => acc + (a.tempo_total_atendimento || 0), 0) / (finalizados.length || 1);
  const tmaFormatted = formatTMA(tmaSegundos);

  // Média de atendimentos por agente
  const agentesUnicos = new Set(filteredAtendimentos.filter(a => a.agente_id).map(a => a.agente_id)).size;
  const mediaAtendAgente = agentesUnicos > 0 ? (totalAtendimentos / agentesUnicos).toFixed(1) : "0";

  // Dados do gráfico de barras por hora
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hora: `${i.toString().padStart(2, '0')}h`,
      chats: 0,
      abandonadas: 0
    }));

    filteredAtendimentos.forEach(a => {
      const hour = new Date(a.data_abertura).getHours();
      if (a.status === "abandonado") {
        hours[hour].abandonadas++;
      } else {
        hours[hour].chats++;
      }
    });

    return hours;
  }, [filteredAtendimentos]);

  // Dados do gráfico de pizza por fila
  const pieDataByFila = useMemo(() => {
    const filaCount: Record<string, number> = {};
    filteredAtendimentos.forEach(a => {
      const filaId = a.fila_id || "sem_fila";
      filaCount[filaId] = (filaCount[filaId] || 0) + 1;
    });

    return Object.entries(filaCount).map(([filaId, count]) => {
      const fila = filas.find(f => f.id === filaId);
      return {
        name: fila?.nome || "Sem fila",
        value: count
      };
    });
  }, [filteredAtendimentos, filas]);

  // Dados do gráfico de pizza por canal
  const pieDataByCanal = useMemo(() => {
    const canalCount: Record<string, number> = {};
    filteredAtendimentos.forEach(a => {
      const canal = a.canal || "whatsapp";
      canalCount[canal] = (canalCount[canal] || 0) + 1;
    });

    return Object.entries(canalCount).map(([canal, count]) => ({
      name: canal.charAt(0).toUpperCase() + canal.slice(1),
      value: count
    }));
  }, [filteredAtendimentos]);

  // Dados da tabela de agentes
  const agentesData = useMemo(() => {
    const agentStats: Record<string, any> = {};

    filteredAtendimentos.forEach(a => {
      if (!a.agente_id) return;
      
      if (!agentStats[a.agente_id]) {
        agentStats[a.agente_id] = {
          id: a.agente_id,
          nome: a.agente?.usuario_clinica?.nome || "Agente",
          atendimentos: 0,
          dias: new Set(),
          msgsEnviadas: 0,
          msgsRecebidas: 0,
          tempoTotal: 0,
          count: 0
        };
      }

      agentStats[a.agente_id].atendimentos++;
      agentStats[a.agente_id].dias.add(format(new Date(a.data_abertura), "yyyy-MM-dd"));
      
      const agentMsgs = mensagens.filter(m => m.atendimento_id === a.id);
      agentStats[a.agente_id].msgsEnviadas += agentMsgs.filter(m => m.direcao === 'saida').length;
      agentStats[a.agente_id].msgsRecebidas += agentMsgs.filter(m => m.direcao === 'entrada').length;
      
      if (a.tempo_total_atendimento) {
        agentStats[a.agente_id].tempoTotal += a.tempo_total_atendimento;
        agentStats[a.agente_id].count++;
      }
    });

    return Object.values(agentStats).map((agent: any) => ({
      ...agent,
      dias: agent.dias.size,
      mediaAtendDia: agent.dias.size > 0 ? (agent.atendimentos / agent.dias.size).toFixed(1) : "0",
      tma: formatTMA(agent.count > 0 ? agent.tempoTotal / agent.count : 0)
    }));
  }, [filteredAtendimentos, mensagens]);

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Atendimentos"
          value={totalAtendimentos}
          trend={62}
          trendUp
        />
        <MetricCard
          label="Clientes únicos"
          value={clientesUnicos}
          trend={47}
          trendUp
          showProgress
          progress={taxaConversao}
        />
        <MetricCard
          label="Mensagens enviadas"
          value={msgsEnviadas}
          trend={213}
          trendUp
        />
        <MetricCard
          label="Mensagens recebidas"
          value={msgsRecebidas}
          trend={300}
          trendUp
        />
        <MetricCard
          label="Méd. atend. / agente"
          value={mediaAtendAgente}
          trend={143}
          trendUp
        />
        <MetricCard
          label="TMA"
          value={tmaFormatted}
          isTime
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
                  <TabsTrigger value="hora">Contatos por hora</TabsTrigger>
                  <TabsTrigger value="dia">Contatos por dia do mês</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Chats</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                  <span className="text-muted-foreground">Abandonadas</span>
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
                <Bar dataKey="chats" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="abandonadas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pizza */}
        <Card>
          <CardHeader className="pb-2">
            <Tabs value={pieView} onValueChange={(v) => setPieView(v as "fila" | "canal")}>
              <TabsList className="w-full">
                <TabsTrigger value="fila" className="flex-1">Atendimentos por fila</TabsTrigger>
                <TabsTrigger value="canal" className="flex-1">Por canal</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieView === "fila" ? pieDataByFila : pieDataByCanal}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {(pieView === "fila" ? pieDataByFila : pieDataByCanal).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Agentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Performance dos Agentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead className="text-center">Atendimentos</TableHead>
                <TableHead className="text-center">Dias</TableHead>
                <TableHead className="text-center">Méd. Atend. / Dia</TableHead>
                <TableHead className="text-center">Msg. Enviadas</TableHead>
                <TableHead className="text-center">Msg. Recebidas</TableHead>
                <TableHead className="text-center">TMA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentesData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum dado de agente disponível
                  </TableCell>
                </TableRow>
              ) : (
                agentesData.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.nome}</TableCell>
                    <TableCell className="text-center">{agent.atendimentos}</TableCell>
                    <TableCell className="text-center text-primary">{agent.dias}</TableCell>
                    <TableCell className="text-center">{agent.mediaAtendDia}</TableCell>
                    <TableCell className="text-center">{agent.msgsEnviadas}</TableCell>
                    <TableCell className="text-center">{agent.msgsRecebidas}</TableCell>
                    <TableCell className="text-center">{agent.tma}</TableCell>
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
  trend, 
  trendUp, 
  showProgress, 
  progress,
  isTime 
}: { 
  label: string; 
  value: string | number; 
  trend?: number; 
  trendUp?: boolean;
  showProgress?: boolean;
  progress?: number;
  isTime?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${isTime ? 'text-2xl' : 'text-3xl'}`}>{value}</span>
          {trend !== undefined && (
            <span className={`flex items-center text-xs ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
              {trendUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {trend}%
            </span>
          )}
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

// Helper para formatar TMA
function formatTMA(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
