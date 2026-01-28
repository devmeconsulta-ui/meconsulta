import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  MessageSquare, 
  Users, 
  Clock, 
  Send, 
  Inbox, 
  UserCheck,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  AreaChart,
  Area
} from "recharts";
import { format, isToday, subDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  atendimentos: any[];
  mensagens: any[];
  filas: any[];
  periodo: string;
  filaFilter: string;
}

// Paleta de cores vibrantes para os cards
const cardStyles = {
  atendimentos: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30",
    icon: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    border: "border-blue-200/50 dark:border-blue-700/50"
  },
  clientes: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30",
    icon: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/50 dark:border-emerald-700/50"
  },
  enviadas: {
    bg: "bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/30",
    icon: "bg-violet-500/20 text-violet-600 dark:text-violet-400",
    border: "border-violet-200/50 dark:border-violet-700/50"
  },
  recebidas: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30",
    icon: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    border: "border-amber-200/50 dark:border-amber-700/50"
  },
  mediaAgente: {
    bg: "bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/50 dark:to-cyan-900/30",
    icon: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-200/50 dark:border-cyan-700/50"
  },
  tma: {
    bg: "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30",
    icon: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
    border: "border-rose-200/50 dark:border-rose-700/50"
  }
};

// Cores modernas para gráficos
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#06b6d4', // cyan-500
  '#f43f5e', // rose-500
];

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
          nome: a.agente?.nome || "Agente",
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
      {/* Cards de Métricas - Redesenhados */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Atendimentos"
          value={totalAtendimentos}
          trend={62}
          trendUp
          icon={<MessageSquare className="w-5 h-5" />}
          style={cardStyles.atendimentos}
        />
        <MetricCard
          label="Clientes únicos"
          value={clientesUnicos}
          trend={47}
          trendUp
          icon={<UserCheck className="w-5 h-5" />}
          style={cardStyles.clientes}
          showProgress
          progress={taxaConversao}
        />
        <MetricCard
          label="Msgs enviadas"
          value={msgsEnviadas}
          trend={213}
          trendUp
          icon={<Send className="w-5 h-5" />}
          style={cardStyles.enviadas}
        />
        <MetricCard
          label="Msgs recebidas"
          value={msgsRecebidas}
          trend={300}
          trendUp
          icon={<Inbox className="w-5 h-5" />}
          style={cardStyles.recebidas}
        />
        <MetricCard
          label="Méd. atend./agente"
          value={mediaAtendAgente}
          trend={143}
          trendUp
          icon={<Users className="w-5 h-5" />}
          style={cardStyles.mediaAgente}
        />
        <MetricCard
          label="TMA"
          value={tmaFormatted}
          isTime
          icon={<Clock className="w-5 h-5" />}
          style={cardStyles.tma}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras moderno */}
        <Card className="lg:col-span-2 shadow-sm border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">Volume de Atendimentos</CardTitle>
              </div>
              <Tabs value={chartView} onValueChange={(v) => setChartView(v as "hora" | "dia")}>
                <TabsList className="h-8">
                  <TabsTrigger value="hora" className="text-xs px-3 h-7">Por Hora</TabsTrigger>
                  <TabsTrigger value="dia" className="text-xs px-3 h-7">Por Dia</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center gap-6 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground text-xs">Chats atendidos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="text-muted-foreground text-xs">Abandonados</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAbandonadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="hora" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="chats" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorChats)" 
                  name="Chats"
                />
                <Area 
                  type="monotone" 
                  dataKey="abandonadas" 
                  stroke="#f43f5e" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorAbandonadas)" 
                  name="Abandonados"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pizza moderno */}
        <Card className="shadow-sm border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <PieChartIcon className="w-4 h-4 text-violet-500" />
              </div>
              <CardTitle className="text-base font-semibold">Distribuição</CardTitle>
            </div>
            <Tabs value={pieView} onValueChange={(v) => setPieView(v as "fila" | "canal")}>
              <TabsList className="w-full h-8">
                <TabsTrigger value="fila" className="flex-1 text-xs h-7">Por Fila</TabsTrigger>
                <TabsTrigger value="canal" className="flex-1 text-xs h-7">Por Canal</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieView === "fila" ? pieDataByFila : pieDataByCanal}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(pieView === "fila" ? pieDataByFila : pieDataByCanal).map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      className="drop-shadow-sm"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Agentes */}
      <Card className="shadow-sm border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <CardTitle className="text-base font-semibold">Performance dos Agentes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Agente</TableHead>
                  <TableHead className="text-center font-semibold">Atendimentos</TableHead>
                  <TableHead className="text-center font-semibold">Dias</TableHead>
                  <TableHead className="text-center font-semibold">Méd./Dia</TableHead>
                  <TableHead className="text-center font-semibold">Enviadas</TableHead>
                  <TableHead className="text-center font-semibold">Recebidas</TableHead>
                  <TableHead className="text-center font-semibold">TMA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-muted-foreground/50" />
                        <span>Nenhum dado de agente disponível</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  agentesData.map((agent, index) => (
                    <TableRow key={agent.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {agent.nome.charAt(0).toUpperCase()}
                          </div>
                          {agent.nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                          {agent.atendimentos}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-primary font-medium">{agent.dias}</TableCell>
                      <TableCell className="text-center">{agent.mediaAtendDia}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-violet-600 dark:text-violet-400">{agent.msgsEnviadas}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-amber-600 dark:text-amber-400">{agent.msgsRecebidas}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">{agent.tma}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Card de Métrica Redesenhado
function MetricCard({ 
  label, 
  value, 
  trend, 
  trendUp, 
  showProgress, 
  progress,
  isTime,
  icon,
  style
}: { 
  label: string; 
  value: string | number; 
  trend?: number; 
  trendUp?: boolean;
  showProgress?: boolean;
  progress?: number;
  isTime?: boolean;
  icon: React.ReactNode;
  style: { bg: string; icon: string; border: string };
}) {
  return (
    <Card className={`${style.bg} ${style.border} border shadow-sm hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground line-clamp-1">{label}</p>
          <div className={`p-2 rounded-xl ${style.icon}`}>
            {icon}
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className={`font-bold tracking-tight ${isTime ? 'text-xl' : 'text-2xl'}`}>
            {value}
          </span>
          <div className="flex items-center gap-1">
            {trend !== undefined && (
              <span className={`flex items-center text-xs font-medium ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {trendUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {trend}%
              </span>
            )}
            {showProgress && progress !== undefined && (
              <div className="relative w-9 h-9">
                <svg className="w-9 h-9 transform -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    stroke="currentColor"
                    className="text-muted/30"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    stroke="currentColor"
                    className="text-emerald-500"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${(progress / 100) * 88} 88`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                  {progress}%
                </span>
              </div>
            )}
          </div>
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
