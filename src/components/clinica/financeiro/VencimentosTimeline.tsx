import { useMemo } from "react";
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Vencimento {
  id: string;
  tipo: "pagar" | "receber";
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  entidade?: string; // fornecedor ou cliente
}

interface VencimentosTimelineProps {
  vencimentos: Vencimento[];
  formatCurrency: (value: number) => string;
}

export function VencimentosTimeline({ vencimentos, formatCurrency }: VencimentosTimelineProps) {
  // Agrupa vencimentos por data
  const groupedVencimentos = useMemo(() => {
    const sorted = [...vencimentos]
      .filter(v => v.status === "pendente")
      .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());

    const groups: { [key: string]: Vencimento[] } = {};
    
    sorted.forEach(v => {
      const date = v.data_vencimento;
      if (!groups[date]) groups[date] = [];
      groups[date].push(v);
    });

    return Object.entries(groups).slice(0, 10); // Próximos 10 dias com vencimentos
  }, [vencimentos]);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    
    if (isPast(date) && !isToday(date)) {
      const daysAgo = differenceInDays(new Date(), date);
      return { label: `Vencido há ${daysAgo} dia(s)`, variant: "destructive" as const };
    }
    
    if (isToday(date)) {
      return { label: "Hoje", variant: "default" as const };
    }
    
    if (isTomorrow(date)) {
      return { label: "Amanhã", variant: "outline" as const };
    }
    
    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil <= 7) {
      return { label: format(date, "EEEE", { locale: ptBR }), variant: "secondary" as const };
    }
    
    return { label: format(date, "dd/MM", { locale: ptBR }), variant: "secondary" as const };
  };

  const totals = useMemo(() => {
    const pagar = vencimentos
      .filter(v => v.tipo === "pagar" && v.status === "pendente")
      .reduce((sum, v) => sum + v.valor, 0);
      
    const receber = vencimentos
      .filter(v => v.tipo === "receber" && v.status === "pendente")
      .reduce((sum, v) => sum + v.valor, 0);

    const vencidos = vencimentos
      .filter(v => v.status === "pendente" && isPast(parseISO(v.data_vencimento)) && !isToday(parseISO(v.data_vencimento)))
      .length;

    const venceHoje = vencimentos
      .filter(v => v.status === "pendente" && isToday(parseISO(v.data_vencimento)))
      .length;

    return { pagar, receber, vencidos, venceHoje };
  }, [vencimentos]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Calendário de Vencimentos
            </CardTitle>
            <CardDescription className="text-xs">Próximos vencimentos a pagar e receber</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {totals.vencidos > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {totals.vencidos} vencido(s)
              </Badge>
            )}
            {totals.venceHoje > 0 && (
              <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
                <Clock className="w-3 h-3" />
                {totals.venceHoje} hoje
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-red-600">A Pagar</span>
            </div>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totals.pagar)}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">A Receber</span>
            </div>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totals.receber)}</p>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[280px]">
          {groupedVencimentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50 text-emerald-500" />
              <p>Nenhum vencimento pendente</p>
            </div>
          ) : (
            <div className="space-y-4 pr-2">
              {groupedVencimentos.map(([date, items]) => {
                const { label, variant } = getDateLabel(date);
                const isOverdue = isPast(parseISO(date)) && !isToday(parseISO(date));
                
                return (
                  <div 
                    key={date} 
                    className={cn(
                      "relative pl-6 pb-4 border-l-2",
                      isOverdue ? "border-l-red-300" : "border-l-border"
                    )}
                  >
                    {/* Dot */}
                    <div className={cn(
                      "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-background",
                      isOverdue ? "border-red-500" : isToday(parseISO(date)) ? "border-amber-500" : "border-primary"
                    )}>
                      {isOverdue && <AlertTriangle className="w-2 h-2 text-red-500 absolute top-0.5 left-0.5" />}
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={variant} className="text-xs">
                        {label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(date), "dd/MM/yyyy")}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                            item.tipo === "pagar" 
                              ? "bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/50" 
                              : "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {item.tipo === "pagar" ? (
                              <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium truncate max-w-[150px]">{item.descricao}</p>
                              {item.entidade && (
                                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {item.entidade}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={cn(
                            "text-sm font-bold",
                            item.tipo === "pagar" ? "text-red-600" : "text-emerald-600"
                          )}>
                            {formatCurrency(item.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
