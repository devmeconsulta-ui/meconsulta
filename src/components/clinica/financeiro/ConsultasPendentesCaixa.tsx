import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, Globe, Building2, CreditCard, Banknote, QrCode, RefreshCw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ConsultaPendente {
  id: string;
  valor_consulta: number;
  nome_paciente_consulta: string | null;
  origem: string;
  medico?: { nome: string } | null;
  paciente?: { nome: string } | null;
  formas_pagamento?: { tipo: string; valor: number }[] | null;
}

interface ConsultasPendentesCaixaProps {
  consultas: ConsultaPendente[];
  formatCurrency: (value: number) => string;
  onSincronizar: (consulta: ConsultaPendente, formaPagamento: string) => Promise<{ data: any; error: any } | null>;
  onSincronizarTodas: (formaPagamento: string) => Promise<any[]>;
  onRefresh: () => void;
  caixaAberto: boolean;
}

export function ConsultasPendentesCaixa({
  consultas,
  formatCurrency,
  onSincronizar,
  onSincronizarTodas,
  onRefresh,
  caixaAberto,
}: ConsultasPendentesCaixaProps) {
  const [showSincronizarModal, setShowSincronizarModal] = useState(false);
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaPendente | null>(null);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [sincronizando, setSincronizando] = useState(false);
  const [showSincronizarTodasModal, setShowSincronizarTodasModal] = useState(false);

  const handleSincronizar = async () => {
    if (!consultaSelecionada) return;
    
    // Usa a forma de pagamento real registrada na consulta, ou a selecionada manualmente
    const formaReal = consultaSelecionada.formas_pagamento?.[0]?.tipo || formaPagamento;
    setSincronizando(true);
    const result = await onSincronizar(consultaSelecionada, formaReal);
    setSincronizando(false);
    
    if (result?.error) {
      toast.error("Erro ao sincronizar: " + result.error.message);
      return;
    }
    
    toast.success("Consulta sincronizada com o caixa!");
    setShowSincronizarModal(false);
    setConsultaSelecionada(null);
  };

  const handleSincronizarTodas = async () => {
    setSincronizando(true);
    const resultados = await onSincronizarTodas(formaPagamento);
    setSincronizando(false);
    
    const erros = resultados.filter(r => r.error);
    if (erros.length > 0) {
      toast.error(`${erros.length} consultas não foram sincronizadas`);
    } else {
      toast.success(`${resultados.length} consultas sincronizadas com sucesso!`);
    }
    
    setShowSincronizarTodasModal(false);
  };

  if (!caixaAberto) return null;

  const totalPendente = consultas.reduce((sum, c) => sum + c.valor_consulta, 0);

  return (
    <>
      <AnimatePresence>
        {consultas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-amber-800">
                        Consultas Pagas Pendentes
                      </CardTitle>
                      <CardDescription className="text-amber-600 text-xs">
                        {consultas.length} consulta(s) aguardando sincronização com o caixa
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={onRefresh}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                      {formatCurrency(totalPendente)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {consultas.map((consulta, index) => (
                      <motion.div
                        key={consulta.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/80 border border-amber-100"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${consulta.origem === "online" ? "bg-blue-100" : "bg-purple-100"}`}>
                            {consulta.origem === "online" ? (
                              <Globe className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {consulta.medico?.nome ? `Dr(a). ${consulta.medico.nome}` : ""}
                              {consulta.origem === "online" ? " • Online" : " • Interno"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(consulta.valor_consulta)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                            onClick={() => {
                              setConsultaSelecionada(consulta);
                              setShowSincronizarModal(true);
                            }}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>

                {consultas.length > 1 && (
                  <Button
                    className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
                    onClick={() => setShowSincronizarTodasModal(true)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Sincronizar Todas ({consultas.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Sincronizar Uma */}
      <Dialog open={showSincronizarModal} onOpenChange={setShowSincronizarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              Sincronizar com Caixa
            </DialogTitle>
            <DialogDescription>
              Registrar pagamento da consulta no caixa
            </DialogDescription>
          </DialogHeader>
          
          {consultaSelecionada && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Paciente</span>
                  <span className="font-medium">
                    {consultaSelecionada.nome_paciente_consulta || consultaSelecionada.paciente?.nome}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Médico</span>
                  <span className="font-medium">
                    {consultaSelecionada.medico?.nome || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Origem</span>
                  <Badge variant={consultaSelecionada.origem === "online" ? "default" : "secondary"}>
                    {consultaSelecionada.origem === "online" ? "Online" : "Interno"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Valor</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency(consultaSelecionada.valor_consulta)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento Recebida</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        PIX
                      </div>
                    </SelectItem>
                    <SelectItem value="dinheiro">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        Dinheiro
                      </div>
                    </SelectItem>
                    <SelectItem value="credito">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Cartão de Crédito
                      </div>
                    </SelectItem>
                    <SelectItem value="debito">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Cartão de Débito
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSincronizarModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSincronizar} disabled={sincronizando}>
              {sincronizando ? "Sincronizando..." : "Sincronizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Sincronizar Todas */}
      <Dialog open={showSincronizarTodasModal} onOpenChange={setShowSincronizarTodasModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Sincronizar Todas as Consultas
            </DialogTitle>
            <DialogDescription>
              Registrar {consultas.length} consultas no caixa
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Total de consultas</span>
                <span className="font-medium">{consultas.length}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Valor Total</span>
                <span className="text-lg font-bold text-emerald-600">
                  {formatCurrency(totalPendente)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento (para todas)</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      PIX
                    </div>
                  </SelectItem>
                  <SelectItem value="dinheiro">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Dinheiro
                    </div>
                  </SelectItem>
                  <SelectItem value="credito">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Cartão de Crédito
                    </div>
                  </SelectItem>
                  <SelectItem value="debito">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Cartão de Débito
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                * Se cada consulta foi paga de forma diferente, sincronize uma a uma
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSincronizarTodasModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSincronizarTodas} disabled={sincronizando}>
              {sincronizando ? "Sincronizando..." : `Sincronizar ${consultas.length} consultas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
