import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, 
  Plus, 
  Minus, 
  Lock, 
  Unlock, 
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Printer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MovimentoCaixa {
  id: string;
  tipo: "entrada" | "saida" | "sangria" | "reforco";
  valor: number;
  descricao: string;
  forma_pagamento?: string;
  hora: string;
}

interface CaixaWidgetProps {
  caixaAberto: boolean;
  saldoAbertura: number;
  saldoAtual: number;
  movimentos: MovimentoCaixa[];
  formatCurrency: (value: number) => string;
  onAbrirCaixa: (saldoInicial: number) => Promise<{ data: any; error: any } | undefined>;
  onFecharCaixa: (observacoes: string) => Promise<{ data: any; error: any } | undefined>;
  onRegistrarMovimento: (movimento: Omit<MovimentoCaixa, "id" | "hora">) => Promise<{ data: any; error: any } | undefined>;
  nomeClinica?: string;
}

export function CaixaWidget({
  caixaAberto,
  saldoAbertura,
  saldoAtual,
  movimentos,
  formatCurrency,
  onAbrirCaixa,
  onFecharCaixa,
  onRegistrarMovimento,
  nomeClinica = "Clínica",
}: CaixaWidgetProps) {
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showMovimentoModal, setShowMovimentoModal] = useState(false);
  const [tipoMovimento, setTipoMovimento] = useState<"entrada" | "saida" | "sangria" | "reforco">("entrada");
  
  const [saldoInicial, setSaldoInicial] = useState("");
  const [valorMovimento, setValorMovimento] = useState("");
  const [descricaoMovimento, setDescricaoMovimento] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [observacoesFechamento, setObservacoesFechamento] = useState("");

  // Função para gerar PDF do resumo do caixa
  const gerarPDFResumoCaixa = () => {
    const doc = new jsPDF();
    const dataHoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const horaAtual = format(new Date(), "HH:mm");
    
    // Calcular totais
    const totalEntradasPDF = movimentos
      .filter(m => m.tipo === "entrada" || m.tipo === "reforco")
      .reduce((sum, m) => sum + m.valor, 0);
    const totalSaidasPDF = movimentos
      .filter(m => m.tipo === "saida" || m.tipo === "sangria")
      .reduce((sum, m) => sum + m.valor, 0);

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO DE FECHAMENTO DE CAIXA", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(nomeClinica, 105, 30, { align: "center" });
    doc.text(`Data: ${dataHoje} - Hora: ${horaAtual}`, 105, 38, { align: "center" });
    
    // Linha separadora
    doc.setDrawColor(200);
    doc.line(20, 45, 190, 45);

    // Resumo Financeiro
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Financeiro", 20, 55);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let y = 65;
    
    doc.text(`Saldo de Abertura:`, 20, y);
    doc.text(formatCurrency(saldoAbertura), 120, y, { align: "right" });
    y += 8;
    
    doc.setTextColor(34, 197, 94); // Verde
    doc.text(`Total de Entradas:`, 20, y);
    doc.text(`+ ${formatCurrency(totalEntradasPDF)}`, 120, y, { align: "right" });
    y += 8;
    
    doc.setTextColor(239, 68, 68); // Vermelho
    doc.text(`Total de Saídas:`, 20, y);
    doc.text(`- ${formatCurrency(totalSaidasPDF)}`, 120, y, { align: "right" });
    y += 8;
    
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo Final:`, 20, y);
    doc.text(formatCurrency(saldoAtual), 120, y, { align: "right" });
    y += 15;

    // Linha separadora
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 10;

    // Movimentações
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Movimentações do Dia (${movimentos.length})`, 20, y);
    y += 10;

    if (movimentos.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Hora", 20, y);
      doc.text("Tipo", 45, y);
      doc.text("Descrição", 80, y);
      doc.text("Valor", 170, y, { align: "right" });
      y += 6;
      
      doc.setDrawColor(200);
      doc.line(20, y, 190, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      movimentos.forEach((mov) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        const tipoLabel = {
          entrada: "Entrada",
          saida: "Saída",
          sangria: "Sangria",
          reforco: "Reforço",
        }[mov.tipo];
        
        const isPositivo = mov.tipo === "entrada" || mov.tipo === "reforco";
        
        doc.text(mov.hora, 20, y);
        doc.text(tipoLabel, 45, y);
        doc.text(mov.descricao.substring(0, 35), 80, y);
        
        if (isPositivo) {
          doc.setTextColor(34, 197, 94);
          doc.text(`+ ${formatCurrency(mov.valor)}`, 170, y, { align: "right" });
        } else {
          doc.setTextColor(239, 68, 68);
          doc.text(`- ${formatCurrency(mov.valor)}`, 170, y, { align: "right" });
        }
        doc.setTextColor(0);
        y += 7;
      });
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Nenhuma movimentação registrada", 20, y);
    }

    // Observações
    if (observacoesFechamento.trim()) {
      y += 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Observações:", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const obsLines = doc.splitTextToSize(observacoesFechamento, 170);
      doc.text(obsLines, 20, y);
    }

    // Rodapé
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128);
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
      doc.text("Gerado automaticamente pelo sistema", 105, 295, { align: "center" });
    }

    // Salvar PDF
    doc.save(`fechamento-caixa-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const handleFecharCaixaComPDF = async (imprimirPDF: boolean) => {
    if (imprimirPDF) {
      gerarPDFResumoCaixa();
    }
    
    const result = await onFecharCaixa(observacoesFechamento);
    
    if (result?.error) {
      toast.error("Erro ao fechar caixa: " + result.error.message);
      return;
    }
    
    setShowFecharModal(false);
    setObservacoesFechamento("");
    toast.success("Caixa fechado com sucesso!");
  };

  const handleAbrirCaixa = async () => {
    const valor = parseFloat(saldoInicial);
    if (isNaN(valor) || valor < 0) {
      toast.error("Informe um valor válido");
      return;
    }
    
    const result = await onAbrirCaixa(valor);
    
    if (result?.error) {
      toast.error("Erro ao abrir caixa: " + result.error.message);
      return;
    }
    
    setShowAbrirModal(false);
    setSaldoInicial("");
    toast.success("Caixa aberto com sucesso!");
  };

  const handleFecharCaixa = async () => {
    const result = await onFecharCaixa(observacoesFechamento);
    
    if (result?.error) {
      toast.error("Erro ao fechar caixa: " + result.error.message);
      return;
    }
    
    setShowFecharModal(false);
    setObservacoesFechamento("");
    toast.success("Caixa fechado com sucesso!");
  };

  const handleRegistrarMovimento = async () => {
    const valor = parseFloat(valorMovimento);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!descricaoMovimento.trim()) {
      toast.error("Informe uma descrição");
      return;
    }
    
    const result = await onRegistrarMovimento({
      tipo: tipoMovimento,
      valor,
      descricao: descricaoMovimento,
      forma_pagamento: tipoMovimento === "entrada" ? formaPagamento : undefined,
    });
    
    if (result?.error) {
      toast.error("Erro ao registrar movimento: " + result.error.message);
      return;
    }
    
    setShowMovimentoModal(false);
    setValorMovimento("");
    setDescricaoMovimento("");
    setFormaPagamento("dinheiro");
    toast.success("Movimento registrado!");
  };

  const totalEntradas = movimentos
    .filter(m => m.tipo === "entrada" || m.tipo === "reforco")
    .reduce((sum, m) => sum + m.valor, 0);
    
  const totalSaidas = movimentos
    .filter(m => m.tipo === "saida" || m.tipo === "sangria")
    .reduce((sum, m) => sum + m.valor, 0);

  const getIconeMovimento = (tipo: string) => {
    switch (tipo) {
      case "entrada": return <ArrowUpCircle className="w-4 h-4 text-emerald-500" />;
      case "saida": return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
      case "sangria": return <Minus className="w-4 h-4 text-amber-500" />;
      case "reforco": return <Plus className="w-4 h-4 text-blue-500" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  const getFormaPagamentoIcon = (forma?: string) => {
    switch (forma) {
      case "dinheiro": return <Banknote className="w-3 h-3" />;
      case "credito": 
      case "debito": return <CreditCard className="w-3 h-3" />;
      case "pix": return <QrCode className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Controle de Caixa</CardTitle>
                <CardDescription className="text-xs">
                  {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
                </CardDescription>
              </div>
            </div>
            
            <Badge 
              variant={caixaAberto ? "default" : "secondary"}
              className={cn(
                "gap-1.5",
                caixaAberto && "bg-emerald-500 hover:bg-emerald-600"
              )}
            >
              {caixaAberto ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {caixaAberto ? "Aberto" : "Fechado"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            {!caixaAberto ? (
              <motion.div 
                key="caixa-fechado"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="text-center py-8"
              >
                <motion.div 
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </motion.div>
                <p className="text-muted-foreground mb-4">Caixa fechado</p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button onClick={() => setShowAbrirModal(true)} className="gap-2">
                    <Unlock className="w-4 h-4" />
                    Abrir Caixa
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="caixa-aberto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Resumo do Caixa */}
                <motion.div 
                  className="grid grid-cols-3 gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Abertura</p>
                    <p className="font-semibold text-sm">{formatCurrency(saldoAbertura)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                    <p className="text-xs text-emerald-600">Entradas</p>
                    <p className="font-semibold text-sm text-emerald-600">{formatCurrency(totalEntradas)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <p className="text-xs text-red-600">Saídas</p>
                    <p className="font-semibold text-sm text-red-600">{formatCurrency(totalSaidas)}</p>
                  </div>
                </motion.div>

                {/* Saldo Atual */}
                <motion.div 
                  className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                  <motion.p 
                    className="text-3xl font-bold text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {formatCurrency(saldoAtual)}
                  </motion.p>
                </motion.div>

                {/* Botões de Ação */}
                <motion.div 
                  className="grid grid-cols-2 gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => { setTipoMovimento("entrada"); setShowMovimentoModal(true); }}
                  >
                    <Plus className="w-4 h-4" />
                    Entrada
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => { setTipoMovimento("saida"); setShowMovimentoModal(true); }}
                  >
                    <Minus className="w-4 h-4" />
                    Saída
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                    onClick={() => { setTipoMovimento("sangria"); setShowMovimentoModal(true); }}
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                    Sangria
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                    onClick={() => { setTipoMovimento("reforco"); setShowMovimentoModal(true); }}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    Reforço
                  </Button>
                </motion.div>

                {/* Movimentações Recentes */}
                {movimentos.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-2">Movimentações de hoje</p>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-2">
                        {movimentos.slice(0, 10).map((mov, index) => (
                          <motion.div 
                            key={mov.id} 
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * index }}
                          >
                            <div className="flex items-center gap-2">
                              {getIconeMovimento(mov.tipo)}
                              <div>
                                <p className="text-sm font-medium truncate max-w-[150px]">{mov.descricao}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {mov.hora}
                                  {mov.forma_pagamento && (
                                    <>
                                      <span className="mx-1">•</span>
                                      {getFormaPagamentoIcon(mov.forma_pagamento)}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={cn(
                              "text-sm font-semibold",
                              mov.tipo === "entrada" || mov.tipo === "reforco" ? "text-emerald-600" : "text-red-600"
                            )}>
                              {mov.tipo === "entrada" || mov.tipo === "reforco" ? "+" : "-"}
                              {formatCurrency(mov.valor)}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}

                {/* Fechar Caixa */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button 
                    variant="destructive" 
                    className="w-full gap-2"
                    onClick={() => setShowFecharModal(true)}
                  >
                    <Lock className="w-4 h-4" />
                    Fechar Caixa
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Modal Abrir Caixa */}
      <Dialog open={showAbrirModal} onOpenChange={setShowAbrirModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-primary" />
              Abrir Caixa
            </DialogTitle>
            <DialogDescription>
              Informe o valor em dinheiro para abertura do caixa
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Saldo Inicial (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              className="mt-2 text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAbrirModal(false)}>Cancelar</Button>
            <Button onClick={handleAbrirCaixa}>Abrir Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Fechar Caixa */}
      <Dialog open={showFecharModal} onOpenChange={setShowFecharModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Fechar Caixa
            </DialogTitle>
            <DialogDescription>
              Confira o resumo e confirme o fechamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Resumo Financeiro - Grid 2x2 organizado */}
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Linha 1: Abertura e Saldo Final */}
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-4 text-center bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Abertura</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(saldoAbertura)}</p>
                </div>
                <div className="p-4 text-center bg-blue-50 dark:bg-blue-900/30">
                  <p className="text-xs font-medium mb-1 text-blue-600 dark:text-blue-400">Saldo Final</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(saldoAtual)}</p>
                </div>
              </div>
              
              {/* Linha 2: Entradas e Saídas */}
              <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                <div className="p-4 text-center bg-emerald-50 dark:bg-emerald-900/30">
                  <p className="text-xs font-medium mb-1 text-emerald-600 dark:text-emerald-400">Total Entradas</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+ {formatCurrency(totalEntradas)}</p>
                </div>
                <div className="p-4 text-center bg-red-50 dark:bg-red-900/30">
                  <p className="text-xs font-medium mb-1 text-red-600 dark:text-red-400">Total Saídas</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">- {formatCurrency(totalSaidas)}</p>
                </div>
              </div>
            </div>
            
            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Observações sobre o fechamento..."
                value={observacoesFechamento}
                onChange={(e) => setObservacoesFechamento(e.target.value)}
                rows={3}
              />
            </div>

            {/* Dica PDF */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
              <Printer className="w-5 h-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Gere um PDF com o resumo completo do caixa
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowFecharModal(false)} className="sm:order-1">
              Cancelar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleFecharCaixaComPDF(true)}
              className="gap-2 sm:order-2"
            >
              <Printer className="w-4 h-4" />
              Fechar e Imprimir PDF
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleFecharCaixaComPDF(false)}
              className="sm:order-3"
            >
              Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Movimento */}
      <Dialog open={showMovimentoModal} onOpenChange={setShowMovimentoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tipoMovimento === "entrada" && <ArrowUpCircle className="w-5 h-5 text-emerald-500" />}
              {tipoMovimento === "saida" && <ArrowDownCircle className="w-5 h-5 text-red-500" />}
              {tipoMovimento === "sangria" && <Minus className="w-5 h-5 text-amber-500" />}
              {tipoMovimento === "reforco" && <Plus className="w-5 h-5 text-blue-500" />}
              {tipoMovimento === "entrada" && "Registrar Entrada"}
              {tipoMovimento === "saida" && "Registrar Saída"}
              {tipoMovimento === "sangria" && "Registrar Sangria"}
              {tipoMovimento === "reforco" && "Registrar Reforço"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valorMovimento}
                onChange={(e) => setValorMovimento(e.target.value)}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Pagamento consulta Dr. João"
                value={descricaoMovimento}
                onChange={(e) => setDescricaoMovimento(e.target.value)}
                className="mt-2"
              />
            </div>
            
            {tipoMovimento === "entrada" && (
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        Dinheiro
                      </div>
                    </SelectItem>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        PIX
                      </div>
                    </SelectItem>
                    <SelectItem value="credito">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Cartão Crédito
                      </div>
                    </SelectItem>
                    <SelectItem value="debito">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Cartão Débito
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovimentoModal(false)}>Cancelar</Button>
            <Button onClick={handleRegistrarMovimento}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
