import { useMemo, useState } from "react";
import { format, parseISO, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";

interface FluxoCaixaData {
  date: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface FluxoCaixaChartProps {
  data: FluxoCaixaData[];
  formatCurrency: (value: number) => string;
}

type ViewMode = "area" | "bar";
type PeriodMode = "7d" | "30d" | "mes";

export function FluxoCaixaChart({ data, formatCurrency }: FluxoCaixaChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("area");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("30d");

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (periodMode) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "mes":
        startDate = startOfMonth(now);
        break;
      default:
        startDate = subDays(now, 30);
    }
    
    return data.slice(-30); // Mostrar últimos 30 registros no máximo
  }, [data, periodMode]);

  const totals = useMemo(() => {
    const entradas = filteredData.reduce((sum, d) => sum + d.entradas, 0);
    const saidas = filteredData.reduce((sum, d) => sum + d.saidas, 0);
    const saldo = entradas - saidas;
    
    return { entradas, saidas, saldo };
  }, [filteredData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[180px]">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Fluxo de Caixa
            </CardTitle>
            <CardDescription className="text-xs">Acompanhe entradas e saídas ao longo do tempo</CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="7d" className="text-xs px-2 h-6">7 dias</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs px-2 h-6">30 dias</TabsTrigger>
                <TabsTrigger value="mes" className="text-xs px-2 h-6">Este mês</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "area" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2 rounded-none"
                onClick={() => setViewMode("area")}
              >
                <LineChartIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "bar" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2 rounded-none"
                onClick={() => setViewMode("bar")}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">Entradas</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.entradas)}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-red-600">Saídas</span>
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totals.saidas)}</p>
          </div>
          
          <div className={cn(
            "p-4 rounded-xl border",
            totals.saldo >= 0 
              ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20" 
              : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {totals.saldo >= 0 ? (
                <TrendingUp className="w-4 h-4 text-primary" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={cn("text-xs font-medium", totals.saldo >= 0 ? "text-primary" : "text-red-600")}>
                Saldo
              </span>
            </div>
            <p className={cn("text-xl font-bold", totals.saldo >= 0 ? "text-primary" : "text-red-600")}>
              {formatCurrency(totals.saldo)}
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-[300px]">
          {filteredData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum dado disponível</p>
              </div>
            </div>
          ) : viewMode === "area" ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEntradas)"
                />
                <Area
                  type="monotone"
                  dataKey="saidas"
                  name="Saídas"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSaidas)"
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
                <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
