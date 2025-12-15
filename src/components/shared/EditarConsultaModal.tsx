import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Trash2, X, Edit } from "lucide-react";
import { format, parseISO } from "date-fns";

interface EditarConsultaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consulta: any;
  onSuccess?: () => void;
}

const statusOptions = [
  { value: "aguardando_pagamento", label: "Aguardando Pagamento" },
  { value: "confirmada", label: "Confirmada" },
  { value: "atendida_medico", label: "Atendida pelo Médico" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
  { value: "nao_compareceu", label: "Não Compareceu" },
];

const paymentStatusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

export function EditarConsultaModal({
  open,
  onOpenChange,
  consulta,
  onSuccess,
}: EditarConsultaModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    data_hora: "",
    status_consulta: "",
    status_pagamento: "",
    motivo_consulta: "",
    sintomas: "",
    observacoes_paciente: "",
    valor_consulta: 0,
    nome_paciente_consulta: "",
  });

  useEffect(() => {
    if (consulta) {
      const dataHora = parseISO(consulta.data_hora);
      setFormData({
        data_hora: format(dataHora, "yyyy-MM-dd'T'HH:mm"),
        status_consulta: consulta.status_consulta || "confirmada",
        status_pagamento: consulta.status_pagamento || "pendente",
        motivo_consulta: consulta.motivo_consulta || "",
        sintomas: consulta.sintomas || "",
        observacoes_paciente: consulta.observacoes_paciente || "",
        valor_consulta: consulta.valor_consulta || 0,
        nome_paciente_consulta: consulta.nome_paciente_consulta || consulta.paciente?.nome || "",
      });
    }
  }, [consulta]);

  const handleSave = async () => {
    if (!consulta?.id) return;
    
    setLoading(true);
    try {
      const updateData: any = {
        data_hora: new Date(formData.data_hora).toISOString(),
        status_consulta: formData.status_consulta,
        status_pagamento: formData.status_pagamento,
        motivo_consulta: formData.motivo_consulta || null,
        sintomas: formData.sintomas || null,
        observacoes_paciente: formData.observacoes_paciente || null,
        valor_consulta: formData.valor_consulta,
        nome_paciente_consulta: formData.nome_paciente_consulta || null,
      };

      // Se cancelando, também cancelar no Asaas se tiver payment_id
      if (formData.status_consulta === "cancelada" && consulta.asaas_payment_id) {
        try {
          await supabase.functions.invoke("cancel-asaas-payment", {
            body: { consultaId: consulta.id },
          });
        } catch (e) {
          console.error("Erro ao cancelar pagamento Asaas:", e);
        }
      }

      // Se status mudou para cancelada, liberar o slot da agenda
      if (formData.status_consulta === "cancelada" && consulta.agenda_slot_id) {
        await supabase
          .from("agenda_slots")
          .update({ disponivel: true })
          .eq("id", consulta.agenda_slot_id);
      }

      const { error } = await supabase
        .from("consultas")
        .update(updateData)
        .eq("id", consulta.id);

      if (error) throw error;

      toast({
        title: "Consulta atualizada",
        description: "Os dados da consulta foram salvos com sucesso.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao atualizar consulta:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!consulta?.id) return;
    
    setDeleting(true);
    try {
      // Se tiver pagamento Asaas, cancelar primeiro
      if (consulta.asaas_payment_id) {
        try {
          await supabase.functions.invoke("cancel-asaas-payment", {
            body: { consultaId: consulta.id },
          });
        } catch (e) {
          console.error("Erro ao cancelar pagamento Asaas:", e);
        }
      }

      // Liberar slot da agenda se existir
      if (consulta.agenda_slot_id) {
        await supabase
          .from("agenda_slots")
          .update({ disponivel: true })
          .eq("id", consulta.agenda_slot_id);
      }

      // Deletar a consulta
      const { error } = await supabase
        .from("consultas")
        .delete()
        .eq("id", consulta.id);

      if (error) throw error;

      toast({
        title: "Consulta excluída",
        description: "A consulta foi removida com sucesso.",
      });

      setDeleteDialogOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao excluir consulta:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir a consulta.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!consulta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Editar Consulta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome do paciente */}
          <div className="space-y-2">
            <Label htmlFor="nome_paciente">Nome do Paciente</Label>
            <Input
              id="nome_paciente"
              value={formData.nome_paciente_consulta}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nome_paciente_consulta: e.target.value }))
              }
              placeholder="Nome do paciente"
            />
          </div>

          {/* Data e Hora */}
          <div className="space-y-2">
            <Label htmlFor="data_hora">Data e Hora</Label>
            <Input
              id="data_hora"
              type="datetime-local"
              value={formData.data_hora}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, data_hora: e.target.value }))
              }
            />
          </div>

          {/* Status da Consulta */}
          <div className="space-y-2">
            <Label>Status da Consulta</Label>
            <Select
              value={formData.status_consulta}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, status_consulta: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status do Pagamento */}
          <div className="space-y-2">
            <Label>Status do Pagamento</Label>
            <Select
              value={formData.status_pagamento}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, status_pagamento: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_consulta}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, valor_consulta: parseFloat(e.target.value) || 0 }))
              }
            />
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Consulta</Label>
            <Textarea
              id="motivo"
              value={formData.motivo_consulta}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, motivo_consulta: e.target.value }))
              }
              placeholder="Descreva o motivo da consulta"
              rows={2}
            />
          </div>

          {/* Sintomas */}
          <div className="space-y-2">
            <Label htmlFor="sintomas">Sintomas</Label>
            <Textarea
              id="sintomas"
              value={formData.sintomas}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sintomas: e.target.value }))
              }
              placeholder="Descreva os sintomas"
              rows={2}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes_paciente}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, observacoes_paciente: e.target.value }))
              }
              placeholder="Observações adicionais"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Delete button with confirmation */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2 w-full sm:w-auto">
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir consulta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. A consulta será permanentemente excluída
                  e o horário será liberado na agenda.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-initial"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-initial">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
