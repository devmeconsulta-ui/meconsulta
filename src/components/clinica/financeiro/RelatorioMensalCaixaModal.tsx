import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from "recharts";
import { 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar as CalendarIcon
} from "lucide-react";
import { FechamentoCaixa } from "@/hooks/useHistoricoCaixa";

type PeriodFilter = "7d" | "15d" | "30d" | "mes_atual" | "mes_anterior" | "personalizado";

interface RelatorioMensalCaixaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historico: FechamentoCaixa[];
  formatCurrency: (value: number) => string;
  nomeClinica: string;
}

export function RelatorioMensalCaixaModal({
  open,
  onOpenChange,
  historico,
  formatCurrency,
  nomeClinica,
}: RelatorioMensalCaixaModalProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Calcular range de datas baseado no filtro
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (periodFilter) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "15d":
        return { start: subDays(now, 15), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "mes_atual":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "mes_anterior":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "personalizado":
        return {
          start: customDateStart || subDays(now, 30),
          end: customDateEnd || now
        };
      default:
        return { start: subDays(now, 30), end: now };
    }
  }, [periodFilter, customDateStart, customDateEnd]);

  // Filtrar histórico pelo período selecionado
  const historicoFiltrado = useMemo(() => {
    return historico.filter((f) => {
      const [dia, mes, ano] = f.data.split("/");
      const dataFechamento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return isWithinInterval(dataFechamento, {
        start: dateRange.start,
        end: new Date(dateRange.end.getTime() + 24 * 60 * 60 * 1000 - 1)
      });
    });
  }, [historico, dateRange]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const totalEntradas = historicoFiltrado.reduce((sum, f) => sum + f.totalEntradas, 0);
    const totalSaidas = historicoFiltrado.reduce((sum, f) => sum + f.totalSaidas, 0);
    const saldoMedio = historicoFiltrado.length > 0 
      ? historicoFiltrado.reduce((sum, f) => sum + f.saldoFinal, 0) / historicoFiltrado.length 
      : 0;
    const diasComMovimento = historicoFiltrado.length;
    const ticketMedio = diasComMovimento > 0 ? totalEntradas / diasComMovimento : 0;

    return {
      totalEntradas,
      totalSaidas,
      saldoLiquido: totalEntradas - totalSaidas,
      saldoMedio,
      diasComMovimento,
      ticketMedio,
    };
  }, [historicoFiltrado]);

  // Dados para gráfico de barras diário
  const dadosGrafico = useMemo(() => {
    return historicoFiltrado.map((f) => ({
      data: f.data.split("/").slice(0, 2).join("/"),
      entradas: f.totalEntradas,
      saidas: f.totalSaidas,
      saldo: f.saldoFinal,
    })).reverse();
  }, [historicoFiltrado]);

  // Dados para gráfico de evolução do saldo
  const dadosEvolucao = useMemo(() => {
    let saldoAcumulado = 0;
    return historicoFiltrado.map((f) => {
      saldoAcumulado += f.totalEntradas - f.totalSaidas;
      return {
        data: f.data.split("/").slice(0, 2).join("/"),
        saldoAcumulado,
      };
    }).reverse();
  }, [historicoFiltrado]);

  // Label do período para o PDF
  const getPeriodoLabel = () => {
    switch (periodFilter) {
      case "7d":
        return "Últimos 7 dias";
      case "15d":
        return "Últimos 15 dias";
      case "30d":
        return "Últimos 30 dias";
      case "mes_atual":
        return `${meses[new Date().getMonth()]} de ${new Date().getFullYear()}`;
      case "mes_anterior":
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return `${meses[lastMonth.getMonth()]} de ${lastMonth.getFullYear()}`;
      case "personalizado":
        return `${format(dateRange.start, "dd/MM/yyyy")} a ${format(dateRange.end, "dd/MM/yyyy")}`;
      default:
        return "";
    }
  };

  const gerarPDFRelatorio = () => {
    const doc = new jsPDF();
    const periodoLabel = getPeriodoLabel();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE CAIXA", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(nomeClinica, 105, 30, { align: "center" });
    doc.text(periodoLabel, 105, 38, { align: "center" });
    
    doc.setDrawColor(200);
    doc.line(20, 45, 190, 45);

    // Resumo do período
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo do Período", 20, 55);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let y = 65;
    
    doc.text(`Dias com movimento:`, 20, y);
    doc.text(`${metricas.diasComMovimento}`, 120, y, { align: "right" });
    y += 8;
    
    doc.setTextColor(34, 197, 94);
    doc.text(`Total de Entradas:`, 20, y);
    doc.text(`+ ${formatCurrency(metricas.totalEntradas)}`, 120, y, { align: "right" });
    y += 8;
    
    doc.setTextColor(239, 68, 68);
    doc.text(`Total de Saídas:`, 20, y);
    doc.text(`- ${formatCurrency(metricas.totalSaidas)}`, 120, y, { align: "right" });
    y += 8;
    
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo Líquido:`, 20, y);
    doc.text(formatCurrency(metricas.saldoLiquido), 120, y, { align: "right" });
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.text(`Ticket Médio Diário:`, 20, y);
    doc.text(formatCurrency(metricas.ticketMedio), 120, y, { align: "right" });
    y += 15;

    // Detalhamento diário
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 10;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento Diário", 20, y);
    y += 10;

    if (historicoFiltrado.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Data", 20, y);
      doc.text("Abertura", 55, y);
      doc.text("Entradas", 90, y);
      doc.text("Saídas", 125, y);
      doc.text("Fechamento", 165, y);
      y += 6;
      
      doc.setDrawColor(200);
      doc.line(20, y, 190, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      historicoFiltrado.forEach((f) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(f.data, 20, y);
        doc.text(formatCurrency(f.saldoInicial), 55, y);
        doc.setTextColor(34, 197, 94);
        doc.text(`+${formatCurrency(f.totalEntradas)}`, 90, y);
        doc.setTextColor(239, 68, 68);
        doc.text(`-${formatCurrency(f.totalSaidas)}`, 125, y);
        doc.setTextColor(0);
        doc.text(formatCurrency(f.saldoFinal), 165, y);
        y += 6;
      });
    }

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} - Página ${i} de ${pageCount}`,
        105,
        290,
        { align: "center" }
      );
    }

    doc.save(`relatorio-caixa-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Relatório de Caixa
          </DialogTitle>
          <DialogDescription>
            Análise consolidada dos fechamentos de caixa
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filtros */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Período</Label>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="15d">Últimos 15 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="mes_atual">Mês atual</SelectItem>
                  <SelectItem value="mes_anterior">Mês anterior</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calendários para período personalizado */}
            {periodFilter === "personalizado" && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !customDateStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateStart ? format(customDateStart, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateStart}
                        onSelect={setCustomDateStart}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !customDateEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateEnd ? format(customDateEnd, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateEnd}
                        onSelect={setCustomDateEnd}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Cards de métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <CalendarIcon className="w-3 h-3" />
                    Dias
                  </div>
                  <p className="text-lg font-bold">{metricas.diasComMovimento}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Entradas
                  </div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(metricas.totalEntradas)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-red-600 dark:text-red-400 mb-1">
                    <TrendingDown className="w-3 h-3" />
                    Saídas
                  </div>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(metricas.totalSaidas)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <DollarSign className="w-3 h-3" />
                    Líquido
                  </div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(metricas.saldoLiquido)}
                  </p>
                </div>
              </div>

              {/* Gráfico de barras */}
              {dadosGrafico.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Entradas vs Saídas por Dia</h4>
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dadosGrafico}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            labelStyle={{ fontWeight: "bold" }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="saidas" name="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfico de evolução */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Evolução do Saldo Acumulado</h4>
                    <div className="h-[140px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dadosEvolucao}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Line 
                            type="monotone" 
                            dataKey="saldoAcumulado" 
                            name="Saldo Acumulado"
                            stroke="#3B82F6" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum fechamento encontrado para este período</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter className="flex-col gap-2 sm:flex-row pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button 
            onClick={gerarPDFRelatorio}
            disabled={historicoFiltrado.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
