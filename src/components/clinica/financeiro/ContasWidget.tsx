import { useState } from "react";
import { format, parseISO, isPast, isToday, isTomorrow, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Check, 
  Edit, 
  Trash2,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  Building2,
  User,
  Filter,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  centro_custo_id: string | null;
  fornecedor: string | null;
  centro_custo?: { nome: string };
}

interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  status: string;
  cliente: string | null;
}

interface CentroCusto {
  id: string;
  nome: string;
}

interface ContasWidgetProps {
  contasPagar: ContaPagar[];
  contasReceber: ContaReceber[];
  centrosCusto: CentroCusto[];
  formatCurrency: (value: number) => string;
  onSaveContaPagar: (conta: Partial<ContaPagar>, isEdit: boolean) => Promise<void>;
  onSaveContaReceber: (conta: Partial<ContaReceber>, isEdit: boolean) => Promise<void>;
  onMarcarPago: (tipo: "pagar" | "receber", id: string) => Promise<void>;
  onDelete: (tipo: "pagar" | "receber", id: string) => Promise<void>;
}

export function ContasWidget({
  contasPagar,
  contasReceber,
  centrosCusto,
  formatCurrency,
  onSaveContaPagar,
  onSaveContaReceber,
  onMarcarPago,
  onDelete,
}: ContasWidgetProps) {
  const [activeTab, setActiveTab] = useState("pagar");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"pagar" | "receber">("pagar");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "pago">("pendente");
  
  const [formPagar, setFormPagar] = useState({
    descricao: "",
    valor: "",
    data_vencimento: "",
    fornecedor: "",
    centro_custo_id: "",
    observacoes: "",
  });
  
  const [formReceber, setFormReceber] = useState({
    descricao: "",
    valor: "",
    data_vencimento: "",
    cliente: "",
    observacoes: "",
  });

  const openModal = (tipo: "pagar" | "receber", item?: any) => {
    setModalType(tipo);
    setEditingItem(item);
    
    if (item) {
      if (tipo === "pagar") {
        setFormPagar({
          descricao: item.descricao,
          valor: String(item.valor),
          data_vencimento: item.data_vencimento,
          fornecedor: item.fornecedor || "",
          centro_custo_id: item.centro_custo_id || "",
          observacoes: "",
        });
      } else {
        setFormReceber({
          descricao: item.descricao,
          valor: String(item.valor),
          data_vencimento: item.data_vencimento,
          cliente: item.cliente || "",
          observacoes: "",
        });
      }
    } else {
      setFormPagar({ descricao: "", valor: "", data_vencimento: "", fornecedor: "", centro_custo_id: "", observacoes: "" });
      setFormReceber({ descricao: "", valor: "", data_vencimento: "", cliente: "", observacoes: "" });
    }
    
    setShowModal(true);
  };

  const handleSave = async () => {
    if (modalType === "pagar") {
      if (!formPagar.descricao || !formPagar.valor || !formPagar.data_vencimento) {
        toast.error("Preencha os campos obrigatórios");
        return;
      }
      await onSaveContaPagar({
        id: editingItem?.id,
        descricao: formPagar.descricao,
        valor: parseFloat(formPagar.valor),
        data_vencimento: formPagar.data_vencimento,
        fornecedor: formPagar.fornecedor || null,
        centro_custo_id: formPagar.centro_custo_id || null,
      }, !!editingItem);
    } else {
      if (!formReceber.descricao || !formReceber.valor || !formReceber.data_vencimento) {
        toast.error("Preencha os campos obrigatórios");
        return;
      }
      await onSaveContaReceber({
        id: editingItem?.id,
        descricao: formReceber.descricao,
        valor: parseFloat(formReceber.valor),
        data_vencimento: formReceber.data_vencimento,
        cliente: formReceber.cliente || null,
      }, !!editingItem);
    }
    
    setShowModal(false);
    setEditingItem(null);
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const vencimento = parseISO(dataVencimento);
    
    if (status === "pago") {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">Pago</Badge>;
    }
    
    if (isPast(vencimento) && !isToday(vencimento)) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    
    if (isToday(vencimento)) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Vence hoje</Badge>;
    }
    
    if (isTomorrow(vencimento)) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Amanhã</Badge>;
    }
    
    const diasRestantes = differenceInDays(vencimento, new Date());
    if (diasRestantes <= 7) {
      return <Badge variant="outline">Em {diasRestantes} dias</Badge>;
    }
    
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const filteredPagar = contasPagar.filter(c => {
    if (filterStatus === "todos") return true;
    return c.status === filterStatus;
  }).sort((a, b) => {
    if (a.status === "pago" && b.status !== "pago") return 1;
    if (a.status !== "pago" && b.status === "pago") return -1;
    return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
  });

  const filteredReceber = contasReceber.filter(c => {
    if (filterStatus === "todos") return true;
    return c.status === filterStatus;
  }).sort((a, b) => {
    if (a.status === "pago" && b.status !== "pago") return 1;
    if (a.status !== "pago" && b.status === "pago") return -1;
    return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
  });

  const totalPagarPendente = contasPagar.filter(c => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0);
  const totalReceberPendente = contasReceber.filter(c => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0);

  const ContaItem = ({ conta, tipo }: { conta: ContaPagar | ContaReceber; tipo: "pagar" | "receber" }) => {
    const isPagar = tipo === "pagar";
    const contaPagar = conta as ContaPagar;
    
    return (
      <div className={cn(
        "group p-4 rounded-xl border transition-all hover:shadow-md",
        conta.status === "pago" && "opacity-60 bg-muted/30",
        conta.status !== "pago" && isPast(parseISO(conta.data_vencimento)) && !isToday(parseISO(conta.data_vencimento)) && "border-red-200 bg-red-50/50"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge(conta.status, conta.data_vencimento)}
              {isPagar && contaPagar.centro_custo && (
                <Badge variant="outline" className="text-xs">
                  {contaPagar.centro_custo.nome}
                </Badge>
              )}
            </div>
            
            <p className="font-medium text-sm truncate">{conta.descricao}</p>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {isPagar && contaPagar.fornecedor && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {contaPagar.fornecedor}
                </span>
              )}
              {!isPagar && (conta as ContaReceber).cliente && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {(conta as ContaReceber).cliente}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(conta.data_vencimento), "dd/MM/yyyy")}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <p className={cn(
              "text-lg font-bold",
              isPagar ? "text-red-600" : "text-emerald-600"
            )}>
              {formatCurrency(Number(conta.valor))}
            </p>
            
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {conta.status !== "pago" && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => onMarcarPago(tipo, conta.id)}
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={() => openModal(tipo, conta)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDelete(tipo, conta.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Contas a Pagar / Receber</CardTitle>
              <CardDescription className="text-xs">Gerencie suas obrigações financeiras</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="pagar" className="gap-2 text-sm">
                <TrendingDown className="w-4 h-4" />
                A Pagar
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredPagar.filter(c => c.status === "pendente").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="receber" className="gap-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                A Receber
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredReceber.filter(c => c.status === "pendente").length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pagar" className="mt-0 space-y-4">
              {/* Resumo */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <span className="text-sm text-red-700 dark:text-red-400">Total Pendente:</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(totalPagarPendente)}</span>
              </div>

              {/* Lista */}
              <ScrollArea className="h-[350px]">
                <div className="space-y-3 pr-2">
                  {filteredPagar.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma conta a pagar</p>
                    </div>
                  ) : (
                    filteredPagar.map((conta) => (
                      <ContaItem key={conta.id} conta={conta} tipo="pagar" />
                    ))
                  )}
                </div>
              </ScrollArea>

              <Button 
                className="w-full gap-2" 
                variant="outline"
                onClick={() => openModal("pagar")}
              >
                <Plus className="w-4 h-4" />
                Nova Conta a Pagar
              </Button>
            </TabsContent>

            <TabsContent value="receber" className="mt-0 space-y-4">
              {/* Resumo */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <span className="text-sm text-emerald-700 dark:text-emerald-400">Total Pendente:</span>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalReceberPendente)}</span>
              </div>

              {/* Lista */}
              <ScrollArea className="h-[350px]">
                <div className="space-y-3 pr-2">
                  {filteredReceber.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma conta a receber</p>
                    </div>
                  ) : (
                    filteredReceber.map((conta) => (
                      <ContaItem key={conta.id} conta={conta} tipo="receber" />
                    ))
                  )}
                </div>
              </ScrollArea>

              <Button 
                className="w-full gap-2" 
                variant="outline"
                onClick={() => openModal("receber")}
              >
                <Plus className="w-4 h-4" />
                Nova Conta a Receber
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalType === "pagar" ? (
                <TrendingDown className="w-5 h-5 text-red-500" />
              ) : (
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              )}
              {editingItem ? "Editar" : "Nova"} Conta a {modalType === "pagar" ? "Pagar" : "Receber"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Aluguel, Fornecedor, etc"
                value={modalType === "pagar" ? formPagar.descricao : formReceber.descricao}
                onChange={(e) => modalType === "pagar" 
                  ? setFormPagar({ ...formPagar, descricao: e.target.value })
                  : setFormReceber({ ...formReceber, descricao: e.target.value })
                }
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={modalType === "pagar" ? formPagar.valor : formReceber.valor}
                  onChange={(e) => modalType === "pagar"
                    ? setFormPagar({ ...formPagar, valor: e.target.value })
                    : setFormReceber({ ...formReceber, valor: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={modalType === "pagar" ? formPagar.data_vencimento : formReceber.data_vencimento}
                  onChange={(e) => modalType === "pagar"
                    ? setFormPagar({ ...formPagar, data_vencimento: e.target.value })
                    : setFormReceber({ ...formReceber, data_vencimento: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {modalType === "pagar" ? (
              <>
                <div>
                  <Label>Fornecedor</Label>
                  <Input
                    placeholder="Nome do fornecedor"
                    value={formPagar.fornecedor}
                    onChange={(e) => setFormPagar({ ...formPagar, fornecedor: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Centro de Custo</Label>
                  <Select 
                    value={formPagar.centro_custo_id} 
                    onValueChange={(v) => setFormPagar({ ...formPagar, centro_custo_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {centrosCusto.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div>
                <Label>Cliente</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={formReceber.cliente}
                  onChange={(e) => setFormReceber({ ...formReceber, cliente: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
