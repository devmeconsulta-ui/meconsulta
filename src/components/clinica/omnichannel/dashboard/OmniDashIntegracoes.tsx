import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, isToday, subDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { 
  MessageSquare, 
  Send, 
  AlertTriangle, 
  MessageCircle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface Props {
  instancias: any[];
  mensagens: any[];
  filas: any[];
  periodo: string;
  filaFilter: string;
}

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',  // blue
  'hsl(160, 84%, 39%)',  // emerald
  'hsl(271, 91%, 65%)',  // violet
  'hsl(43, 96%, 56%)',   // amber
  'hsl(189, 94%, 43%)',  // cyan
];

// Estilos para os cards de métricas
const cardStyles = {
  total: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40",
    border: "border-blue-200/50 dark:border-blue-800/50",
    icon: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400"
  },
  sucesso: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/40",
    border: "border-emerald-200/50 dark:border-emerald-800/50",
    icon: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400"
  },
  problema: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/40",
    border: "border-amber-200/50 dark:border-amber-800/50",
    icon: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400"
  },
  outros: {
    bg: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/40 dark:to-slate-900/40",
    border: "border-slate-200/50 dark:border-slate-800/50",
    icon: "bg-slate-500/20 text-slate-600 dark:text-slate-400",
    text: "text-slate-600 dark:text-slate-400"
  },
  falhas: {
    bg: "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/40",
    border: "border-rose-200/50 dark:border-rose-800/50",
    icon: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
    text: "text-rose-600 dark:text-rose-400"
  },
  respostas: {
    bg: "bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/40 dark:to-violet-900/40",
    border: "border-violet-200/50 dark:border-violet-800/50",
    icon: "bg-violet-500/20 text-violet-600 dark:text-violet-400",
    text: "text-violet-600 dark:text-violet-400"
  }
};

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
        const filasInst = filas.filter(f => f.instancia_id === inst.id);
        return filasInst.some(f => m.atendimento?.fila_id === f.id);
      });

      const fila = filas.find(f => f.instancia_id === inst.id);
      const envios = instMsgs.filter(m => m.direcao === 'saida' && m.status !== 'erro').length;
      const falhasInst = instMsgs.filter(m => m.status === 'erro').length;
      const respostas = instMsgs.filter(m => m.direcao === 'entrada').length;
      const total = envios + falhasInst + respostas;
      const taxaSucessoInst = total > 0 ? Math.round((envios / (envios + falhasInst)) * 100) : 0;

      return {
        id: inst.id,
        nome: inst.nome,
        fila: fila?.nome || "-",
        envios,
        falhas: falhasInst,
        respostas,
        taxaSucesso: taxaSucessoInst,
        status: inst.status
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
      {/* Cards de Métricas Modernos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard 
          label="Total de mensagens" 
          value={totalMensagens} 
          icon={MessageSquare}
          style={cardStyles.total}
        />
        <MetricCard 
          label="Enviadas com sucesso" 
          value={enviadasSucesso} 
          icon={Send}
          style={cardStyles.sucesso}
          showProgress 
          progress={taxaSucesso} 
          progressColor="emerald"
        />
        <MetricCard 
          label="Problemas com número" 
          value={0} 
          icon={AlertTriangle}
          style={cardStyles.problema}
        />
        <MetricCard 
          label="Outros problemas" 
          value={0} 
          icon={XCircle}
          style={cardStyles.outros}
        />
        <MetricCard 
          label="Total de falhas" 
          value={falhas} 
          icon={XCircle}
          style={cardStyles.falhas}
          trend={falhas > 0 ? "down" : "neutral"}
        />
        <MetricCard 
          label="Mensagens respondidas" 
          value={respondidas} 
          icon={MessageCircle}
          style={cardStyles.respostas}
          showProgress 
          progress={taxaResposta} 
          progressColor="violet"
        />
      </div>

      {/* Gráficos Modernos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Área */}
        <Card className="lg:col-span-2 border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Tabs value={chartView} onValueChange={(v) => setChartView(v as "hora" | "dia")}>
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="hora" className="text-xs">Por hora</TabsTrigger>
                  <TabsTrigger value="dia" className="text-xs">Por dia</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Envios</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Respostas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-muted-foreground">Falhas</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorEnvios" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRespostas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFalhas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis 
                  dataKey="hora" 
                  className="text-xs" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  className="text-xs" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="envios" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorEnvios)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="respostas" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRespostas)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="falhas" 
                  stroke="#f43f5e" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorFalhas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza Moderno */}
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <Tabs value={pieView} onValueChange={(v) => setPieView(v as "envios" | "respostas")}>
              <TabsList className="w-full bg-muted/50">
                <TabsTrigger value="envios" className="flex-1 text-xs">Envios</TabsTrigger>
                <TabsTrigger value="respostas" className="flex-1 text-xs">Respostas</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <span className="text-sm">Sem dados no período</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px'
                    }} 
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Integrações Moderna */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Desempenho por Integração</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-muted/50">
                <TableHead className="text-xs font-medium text-muted-foreground">Integração</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Fila</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-center">Envios</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-center">Falhas</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-center">Respostas</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-center">Taxa Sucesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instanciasData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Nenhuma integração configurada</p>
                  </TableCell>
                </TableRow>
              ) : (
                instanciasData.map((inst) => (
                  <TableRow key={inst.id} className="hover:bg-muted/30 border-muted/50">
                    <TableCell className="font-medium">{inst.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{inst.fila}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={
                          inst.status === 'conectado' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-800'
                        }
                      >
                        {inst.status === 'conectado' ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" /> Desconectado</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm">
                        <Send className="w-3.5 h-3.5 text-blue-500" />
                        {inst.envios}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        {inst.falhas}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm">
                        <MessageCircle className="w-3.5 h-3.5 text-violet-500" />
                        {inst.respostas}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              inst.taxaSucesso >= 80 ? 'bg-emerald-500' :
                              inst.taxaSucesso >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${inst.taxaSucesso}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-8">
                          {inst.taxaSucesso}%
                        </span>
                      </div>
                    </TableCell>
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

// Componente de Card de Métrica Moderno
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  style: {
    bg: string;
    border: string;
    icon: string;
    text: string;
  };
  showProgress?: boolean;
  progress?: number;
  progressColor?: "emerald" | "violet" | "blue" | "amber";
  trend?: "up" | "down" | "neutral";
}

function MetricCard({ 
  label, 
  value, 
  icon: Icon,
  style,
  showProgress, 
  progress,
  progressColor = "blue",
  trend
}: MetricCardProps) {
  const progressColors = {
    emerald: "stroke-emerald-500",
    violet: "stroke-violet-500",
    blue: "stroke-blue-500",
    amber: "stroke-amber-500"
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Card className={`border ${style.border} ${style.bg} shadow-sm hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-xl ${style.icon}`}>
            <Icon className="w-4 h-4" />
          </div>
          {showProgress && progress !== undefined && (
            <div className="relative w-11 h-11">
              <svg className="w-11 h-11 transform -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-muted/30"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${(progress / 100) * 113.1} 113.1`}
                  strokeLinecap="round"
                  className={progressColors[progressColor]}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                {progress}%
              </span>
            </div>
          )}
          {trend && !showProgress && (
            <div className={`p-1.5 rounded-full ${
              trend === "up" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" :
              trend === "down" ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400" :
              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}>
              <TrendIcon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
