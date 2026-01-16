import { useState, useMemo } from "react";
import { format } from "date-fns";
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
  Calendar
} from "lucide-react";
import { FechamentoCaixa } from "@/hooks/useHistoricoCaixa";

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
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const anos = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Filtrar histórico pelo mês/ano selecionado
  const historicoFiltrado = useMemo(() => {
    return historico.filter((f) => {
      const [dia, mes, ano] = f.data.split("/");
      const dataFechamento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return (
        dataFechamento.getMonth() === parseInt(selectedMonth) &&
        dataFechamento.getFullYear() === parseInt(selectedYear)
      );
    });
  }, [historico, selectedMonth, selectedYear]);

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

  const gerarPDFRelatorio = () => {
    const doc = new jsPDF();
    const mesNome = meses[parseInt(selectedMonth)];
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO MENSAL DE CAIXA", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(nomeClinica, 105, 30, { align: "center" });
    doc.text(`${mesNome} de ${selectedYear}`, 105, 38, { align: "center" });
    
    doc.setDrawColor(200);
    doc.line(20, 45, 190, 45);

    // Resumo do mês
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

    doc.save(`relatorio-caixa-${mesNome.toLowerCase()}-${selectedYear}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Relatório Mensal de Caixa
          </DialogTitle>
          <DialogDescription>
            Análise consolidada dos fechamentos de caixa
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filtros */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label className="text-xs">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Cards de métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
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
