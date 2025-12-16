import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, UserX, AlertCircle, Calendar, MapPin, Globe, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FinalizarConsultaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consulta: {
    id: string;
    data_hora: string;
    origem: string | null;
    status_pagamento?: string;
    paciente?: { nome: string } | null;
    nome_paciente_consulta?: string | null;
    local?: { nome_local: string } | null;
  };
  medicoId: string;
  onSuccess: () => void;
}

type ResultadoAtendimento = "atendida" | "nao_compareceu" | "parcial";

export default function FinalizarConsultaModal({
  open,
  onOpenChange,
  consulta,
  medicoId,
  onSuccess,
}: FinalizarConsultaModalProps) {
  const [resultado, setResultado] = useState<ResultadoAtendimento>("atendida");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Determine the new status and eligibility for repasse
      const newStatus = resultado === "nao_compareceu" ? "nao_compareceu" : "atendida_medico";
      const elegivelRepasse = resultado !== "nao_compareceu";

      // Update the consultation
      const { error: updateError } = await supabase
        .from("consultas")
        .update({
          status_consulta: newStatus,
          finalizado_medico: true,
          finalizado_medico_id: medicoId,
          data_hora_finalizacao_medico: new Date().toISOString(),
          observacao_finalizacao_medico: observacao || null,
          elegivel_repasse: elegivelRepasse,
        })
        .eq("id", consulta.id);

      if (updateError) throw updateError;

      // Create event log
      let descricao = "";
      switch (resultado) {
        case "atendida":
          descricao = "Consulta finalizada com sucesso pelo médico";
          break;
        case "parcial":
          descricao = "Consulta finalizada parcialmente pelo médico";
          break;
        case "nao_compareceu":
          descricao = "Paciente não compareceu à consulta";
          break;
      }

      const { error: eventError } = await supabase
        .from("consultas_eventos")
        .insert({
          consulta_id: consulta.id,
          tipo_evento: "finalizada_medico",
          descricao,
          usuario_tipo: "medico",
          usuario_id: medicoId,
        });

      if (eventError) {
        console.error("Error creating event log:", eventError);
      }

      // Se é elegível para repasse, consulta online e foi paga, realizar transferência automática
      if (elegivelRepasse && consulta.origem === "online" && consulta.status_pagamento === "pago") {
        try {
          console.log("Iniciando transferência PIX automática para médico...");
          const { data: transferData, error: transferError } = await supabase.functions.invoke(
            "transfer-to-doctor",
            { body: { consulta_id: consulta.id } }
          );

          if (transferError) {
            console.error("Erro na transferência automática:", transferError);
            toast.warning("Consulta finalizada, mas houve erro na transferência automática. Entre em contato com o suporte.");
          } else if (transferData?.success) {
            console.log("Transferência realizada com sucesso:", transferData);
            toast.success(`Transferência PIX de R$ ${transferData.valor?.toFixed(2)} realizada!`);
          } else {
            console.warn("Resposta da transferência:", transferData);
          }
        } catch (transferErr) {
          console.error("Erro ao chamar transferência:", transferErr);
        }
      }

      toast.success(
        resultado === "nao_compareceu"
          ? "Consulta marcada como não comparecimento"
          : "Consulta finalizada com sucesso!"
      );
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setResultado("atendida");
      setObservacao("");
    } catch (error) {
      console.error("Error finalizing consultation:", error);
      toast.error("Erro ao finalizar consulta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const patientName = consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Finalizar Consulta
          </DialogTitle>
          <DialogDescription>
            Registre o resultado do atendimento para liberar a consulta para repasse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Consultation Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{patientName}</span>
              {consulta.origem === "online" ? (
                <Badge className="bg-blue-500/10 text-blue-600 gap-1">
                  <Globe className="w-3 h-3" />
                  Online
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-600 gap-1">
                  <Building2 className="w-3 h-3" />
                  Interna
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {format(parseISO(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            {consulta.local && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {consulta.local.nome_local}
              </div>
            )}
          </div>

          {/* Result Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Resultado do atendimento</Label>
            <RadioGroup
              value={resultado}
              onValueChange={(v) => setResultado(v as ResultadoAtendimento)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="atendida" id="atendida" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="atendida" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Atendida normalmente</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Consulta realizada com sucesso. Será elegível para repasse.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="parcial" id="parcial" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="parcial" className="flex items-center gap-2 cursor-pointer">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">Atendimento parcial</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Atendimento com ressalvas. Use a observação para detalhar.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="nao_compareceu" id="nao_compareceu" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="nao_compareceu" className="flex items-center gap-2 cursor-pointer">
                    <UserX className="w-4 h-4 text-red-500" />
                    <span className="font-medium">Paciente não compareceu</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Não será elegível para repasse.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Observation */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione detalhes sobre a finalização..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              "Confirmar Finalização"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
