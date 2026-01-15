import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  DollarSign, 
  Users, 
  Stethoscope,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

interface MedicoFaturamento {
  nome: string;
  valor: number;
  consultas: number;
}

interface FaturamentoChartProps {
  medicoData: MedicoFaturamento[];
  totalFaturamento: number;
  formatCurrency: (value: number) => string;
}

const COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#EF4444", // red
  "#14B8A6", // teal
];

export function FaturamentoChart({ medicoData, totalFaturamento, formatCurrency }: FaturamentoChartProps) {
  const chartData = useMemo(() => {
    return medicoData.map((m, index) => ({
      ...m,
      color: COLORS[index % COLORS.length],
      percentual: totalFaturamento > 0 ? ((m.valor / totalFaturamento) * 100).toFixed(1) : "0",
    }));
  }, [medicoData, totalFaturamento]);

  const totalConsultas = chartData.reduce((sum, m) => sum + m.consultas, 0);
  const ticketMedio = totalConsultas > 0 ? totalFaturamento / totalConsultas : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[180px]">
          <p className="font-medium text-sm mb-2">{data.nome}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Faturamento:</span>
              <span className="font-medium">{formatCurrency(data.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consultas:</span>
              <span className="font-medium">{data.consultas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Participação:</span>
              <span className="font-medium">{data.percentual}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="w-5 h-5 text-primary" />
            Faturamento por Médico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="w-5 h-5 text-primary" />
              Faturamento por Médico
            </CardTitle>
            <CardDescription className="text-xs">Distribuição da receita por profissional</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            {chartData.length} médico(s)
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-sm">{formatCurrency(totalFaturamento)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Consultas</p>
            <p className="font-bold text-sm">{totalConsultas}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="font-bold text-sm">{formatCurrency(ticketMedio)}</p>
          </div>
        </div>

        {/* Gráfico + Lista */}
        <div className="flex gap-6">
          {/* Pie Chart */}
          <div className="w-[160px] h-[160px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Lista de Médicos */}
          <div className="flex-1 space-y-3 max-h-[200px] overflow-auto pr-2">
            {chartData.map((medico, index) => (
              <div key={medico.nome} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: medico.color }}
                    />
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {medico.nome}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(medico.valor)}</p>
                    <p className="text-xs text-muted-foreground">{medico.consultas} consultas</p>
                  </div>
                </div>
                <Progress 
                  value={parseFloat(medico.percentual)} 
                  className="h-1.5"
                  style={{
                    // @ts-ignore - Custom CSS variable
                    '--progress-foreground': medico.color,
                  } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
