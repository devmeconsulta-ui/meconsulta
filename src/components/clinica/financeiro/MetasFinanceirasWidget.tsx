import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MetasFinanceirasWidgetProps {
  clinicaId: string;
  faturamentoAtual: number;
  consultasAtual: number;
  novosPacientesAtual: number;
  ticketMedioAtual: number;
  formatCurrency: (value: number) => string;
}

interface MetaFinanceira {
  id?: string;
  meta_faturamento: number;
  meta_consultas: number;
  meta_novos_pacientes: number;
  meta_ticket_medio: number;
}

export function MetasFinanceirasWidget({
  clinicaId,
  faturamentoAtual,
  consultasAtual,
  novosPacientesAtual,
  ticketMedioAtual,
  formatCurrency,
}: MetasFinanceirasWidgetProps) {
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
  const [meta, setMeta] = useState<MetaFinanceira | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formMeta, setFormMeta] = useState({
    meta_faturamento: "",
    meta_consultas: "",
    meta_novos_pacientes: "",
    meta_ticket_medio: "",
  });

  useEffect(() => {
    fetchMeta();
  }, [clinicaId, mesAtual, anoAtual]);

  const fetchMeta = async () => {
    if (!clinicaId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("metas_financeiras")
      .select("*")
      .eq("clinica_id", clinicaId)
      .eq("mes", mesAtual)
      .eq("ano", anoAtual)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Erro ao buscar meta:", error);
    }

    if (data) {
      setMeta({
        id: data.id,
        meta_faturamento: Number(data.meta_faturamento),
        meta_consultas: data.meta_consultas,
        meta_novos_pacientes: data.meta_novos_pacientes,
        meta_ticket_medio: Number(data.meta_ticket_medio),
      });
    } else {
      setMeta(null);
    }
    setLoading(false);
  };

  const handleOpenEdit = () => {
    if (meta) {
      setFormMeta({
        meta_faturamento: meta.meta_faturamento.toString(),
        meta_consultas: meta.meta_consultas.toString(),
        meta_novos_pacientes: meta.meta_novos_pacientes.toString(),
        meta_ticket_medio: meta.meta_ticket_medio.toString(),
      });
    } else {
      setFormMeta({
        meta_faturamento: "",
        meta_consultas: "",
        meta_novos_pacientes: "",
        meta_ticket_medio: "",
      });
    }
    setShowEditModal(true);
  };

  const handleSaveMeta = async () => {
    const payload = {
      clinica_id: clinicaId,
      mes: mesAtual,
      ano: anoAtual,
      meta_faturamento: parseFloat(formMeta.meta_faturamento) || 0,
      meta_consultas: parseInt(formMeta.meta_consultas) || 0,
      meta_novos_pacientes: parseInt(formMeta.meta_novos_pacientes) || 0,
      meta_ticket_medio: parseFloat(formMeta.meta_ticket_medio) || 0,
    };

    if (meta?.id) {
      const { error } = await supabase
        .from("metas_financeiras")
        .update(payload)
        .eq("id", meta.id);

      if (error) {
        toast.error("Erro ao atualizar meta");
        return;
      }
    } else {
      const { error } = await supabase
        .from("metas_financeiras")
        .insert(payload);

      if (error) {
        toast.error("Erro ao criar meta");
        return;
      }
    }

    toast.success("Metas salvas com sucesso!");
    setShowEditModal(false);
    fetchMeta();
  };

  const navegarMes = (direcao: -1 | 1) => {
    let novoMes = mesAtual + direcao;
    let novoAno = anoAtual;
    
    if (novoMes > 12) {
      novoMes = 1;
      novoAno++;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno--;
    }
    
    setMesAtual(novoMes);
    setAnoAtual(novoAno);
  };

  const calcularProgresso = (atual: number, meta: number) => {
    if (meta === 0) return 0;
    return Math.min((atual / meta) * 100, 100);
  };

  const getProgressColor = (progresso: number) => {
    if (progresso >= 100) return "bg-emerald-500";
    if (progresso >= 75) return "bg-blue-500";
    if (progresso >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getStatusIcon = (progresso: number) => {
    if (progresso >= 100) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (progresso >= 75) return <TrendingUp className="w-4 h-4 text-blue-500" />;
    return <AlertCircle className="w-4 h-4 text-amber-500" />;
  };

  const metas = useMemo(() => {
    if (!meta) return [];
    
    return [
      {
        label: "Faturamento",
        icon: DollarSign,
        atual: faturamentoAtual,
        meta: meta.meta_faturamento,
        formatValue: (v: number) => formatCurrency(v),
        progresso: calcularProgresso(faturamentoAtual, meta.meta_faturamento),
      },
      {
        label: "Consultas",
        icon: Target,
        atual: consultasAtual,
        meta: meta.meta_consultas,
        formatValue: (v: number) => v.toString(),
        progresso: calcularProgresso(consultasAtual, meta.meta_consultas),
      },
      {
        label: "Novos Pacientes",
        icon: Users,
        atual: novosPacientesAtual,
        meta: meta.meta_novos_pacientes,
        formatValue: (v: number) => v.toString(),
        progresso: calcularProgresso(novosPacientesAtual, meta.meta_novos_pacientes),
      },
      {
        label: "Ticket Médio",
        icon: TrendingUp,
        atual: ticketMedioAtual,
        meta: meta.meta_ticket_medio,
        formatValue: (v: number) => formatCurrency(v),
        progresso: calcularProgresso(ticketMedioAtual, meta.meta_ticket_medio),
      },
    ];
  }, [meta, faturamentoAtual, consultasAtual, novosPacientesAtual, ticketMedioAtual]);

  const mesLabel = format(new Date(anoAtual, mesAtual - 1, 1), "MMMM yyyy", { locale: ptBR });

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <Target className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Metas Financeiras</CardTitle>
                <CardDescription className="text-xs capitalize">{mesLabel}</CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navegarMes(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navegarMes(1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleOpenEdit}
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : !meta ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">Nenhuma meta definida para este mês</p>
              <Button onClick={handleOpenEdit} variant="outline" className="gap-2">
                <Edit2 className="w-4 h-4" />
                Definir Metas
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {metas.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {item.formatValue(item.atual)} / {item.formatValue(item.meta)}
                      </span>
                      {getStatusIcon(item.progresso)}
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={item.progresso} className="h-2" />
                    <div
                      className={cn(
                        "absolute top-0 left-0 h-2 rounded-full transition-all",
                        getProgressColor(item.progresso)
                      )}
                      style={{ width: `${item.progresso}%` }}
                    />
                  </div>
                  <p className="text-xs text-right text-muted-foreground">
                    {item.progresso.toFixed(1)}% concluído
                  </p>
                </div>
              ))}

              {/* Resumo Geral */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progresso Geral</span>
                  <span className="text-sm font-bold text-primary">
                    {(metas.reduce((acc, m) => acc + m.progresso, 0) / metas.length).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Editar Metas */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-600" />
              Definir Metas - {mesLabel}
            </DialogTitle>
            <DialogDescription>
              Configure as metas financeiras para o mês
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Meta de Faturamento (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 50000"
                value={formMeta.meta_faturamento}
                onChange={(e) => setFormMeta({ ...formMeta, meta_faturamento: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Meta de Consultas
              </Label>
              <Input
                type="number"
                placeholder="Ex: 200"
                value={formMeta.meta_consultas}
                onChange={(e) => setFormMeta({ ...formMeta, meta_consultas: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Meta de Novos Pacientes
              </Label>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={formMeta.meta_novos_pacientes}
                onChange={(e) => setFormMeta({ ...formMeta, meta_novos_pacientes: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Meta de Ticket Médio (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 250"
                value={formMeta.meta_ticket_medio}
                onChange={(e) => setFormMeta({ ...formMeta, meta_ticket_medio: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveMeta} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Salvar Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
