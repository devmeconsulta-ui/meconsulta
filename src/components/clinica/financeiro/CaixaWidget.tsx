import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  QrCode
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
  onAbrirCaixa: (saldoInicial: number) => void;
  onFecharCaixa: (observacoes: string) => void;
  onRegistrarMovimento: (movimento: Omit<MovimentoCaixa, "id" | "hora">) => void;
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

  const handleAbrirCaixa = () => {
    const valor = parseFloat(saldoInicial);
    if (isNaN(valor) || valor < 0) {
      toast.error("Informe um valor válido");
      return;
    }
    onAbrirCaixa(valor);
    setShowAbrirModal(false);
    setSaldoInicial("");
    toast.success("Caixa aberto com sucesso!");
  };

  const handleFecharCaixa = () => {
    onFecharCaixa(observacoesFechamento);
    setShowFecharModal(false);
    setObservacoesFechamento("");
    toast.success("Caixa fechado com sucesso!");
  };

  const handleRegistrarMovimento = () => {
    const valor = parseFloat(valorMovimento);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!descricaoMovimento.trim()) {
      toast.error("Informe uma descrição");
      return;
    }
    
    onRegistrarMovimento({
      tipo: tipoMovimento,
      valor,
      descricao: descricaoMovimento,
      forma_pagamento: tipoMovimento === "entrada" ? formaPagamento : undefined,
    });
    
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
          {!caixaAberto ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">Caixa fechado</p>
              <Button onClick={() => setShowAbrirModal(true)} className="gap-2">
                <Unlock className="w-4 h-4" />
                Abrir Caixa
              </Button>
            </div>
          ) : (
            <>
              {/* Resumo do Caixa */}
              <div className="grid grid-cols-3 gap-3">
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
              </div>

              {/* Saldo Atual */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(saldoAtual)}</p>
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-2">
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
              </div>

              {/* Movimentações Recentes */}
              {movimentos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Movimentações de hoje</p>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {movimentos.slice(0, 10).map((mov) => (
                        <div 
                          key={mov.id} 
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
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
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Fechar Caixa */}
              <Button 
                variant="destructive" 
                className="w-full gap-2"
                onClick={() => setShowFecharModal(true)}
              >
                <Lock className="w-4 h-4" />
                Fechar Caixa
              </Button>
            </>
          )}
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
        <DialogContent>
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
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Abertura</p>
                <p className="font-semibold">{formatCurrency(saldoAbertura)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Final</p>
                <p className="font-semibold text-primary">{formatCurrency(saldoAtual)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Entradas</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(totalEntradas)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Saídas</p>
                <p className="font-semibold text-red-600">{formatCurrency(totalSaidas)}</p>
              </div>
            </div>
            
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Observações sobre o fechamento..."
                value={observacoesFechamento}
                onChange={(e) => setObservacoesFechamento(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFecharModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleFecharCaixa}>Confirmar Fechamento</Button>
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
