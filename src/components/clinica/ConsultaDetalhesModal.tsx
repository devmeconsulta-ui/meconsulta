import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  MapPin, 
  CreditCard,
  FileText,
  Lock,
  Globe,
  Building2
} from "lucide-react";
import { maskPhone, maskCPF } from "@/lib/maskUtils";

interface ConsultaDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consulta: any;
}

const statusColors: Record<string, string> = {
  confirmada: "bg-green-500",
  concluida: "bg-blue-500",
  cancelada: "bg-red-500",
  aguardando_pagamento: "bg-yellow-500",
  atendida_medico: "bg-purple-500",
};

const statusLabels: Record<string, string> = {
  confirmada: "Confirmada",
  concluida: "Concluída",
  cancelada: "Cancelada",
  aguardando_pagamento: "Aguardando Pagamento",
  atendida_medico: "Atendida pelo Médico",
};

const paymentStatusLabels: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

const paymentStatusColors: Record<string, string> = {
  pago: "bg-green-500",
  pendente: "bg-yellow-500",
  cancelado: "bg-red-500",
};

export function ConsultaDetalhesModal({
  open,
  onOpenChange,
  consulta,
}: ConsultaDetalhesModalProps) {
  if (!consulta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Detalhes da Consulta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aviso de privacidade */}
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Dados sensíveis são protegidos. Exibimos apenas prévia.
            </p>
          </div>

          {/* Status e Origem */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge className={statusColors[consulta.status_consulta] || "bg-gray-500"}>
                {statusLabels[consulta.status_consulta] || consulta.status_consulta}
              </Badge>
              <Badge className={paymentStatusColors[consulta.status_pagamento] || "bg-gray-500"}>
                {paymentStatusLabels[consulta.status_pagamento] || consulta.status_pagamento}
              </Badge>
            </div>
            <Badge variant={consulta.origem === "online" ? "default" : "secondary"} className="gap-1">
              {consulta.origem === "online" ? (
                <>
                  <Globe className="w-3 h-3" />
                  Online
                </>
              ) : (
                <>
                  <Building2 className="w-3 h-3" />
                  Interna
                </>
              )}
            </Badge>
          </div>

          <Separator />

          {/* Data e Hora */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {format(parseISO(consulta.data_hora), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(consulta.data_hora), "HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <Separator />

          {/* Paciente */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Paciente
            </h4>
            <div className="pl-6 space-y-1">
              <p className="font-semibold">
                {consulta.nome_paciente_consulta || consulta.paciente?.nome || "Não informado"}
              </p>
              {consulta.paciente?.cpf && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  CPF: {maskCPF(consulta.paciente.cpf)}
                </p>
              )}
              {consulta.paciente?.telefone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Tel: {maskPhone(consulta.paciente.telefone)}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Médico */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              Médico
            </h4>
            <div className="pl-6 space-y-1">
              <p className="font-semibold">Dr(a). {consulta.medico?.nome}</p>
              <p className="text-sm text-muted-foreground">
                {consulta.medico?.especialidade}
              </p>
            </div>
          </div>

          {/* Local */}
          {consulta.local?.nome_local && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Local de Atendimento
                </h4>
                <p className="pl-6 text-sm">{consulta.local.nome_local}</p>
              </div>
            </>
          )}

          {/* Motivo/Sintomas */}
          {(consulta.motivo_consulta || consulta.sintomas || consulta.observacoes_paciente) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Informações da Consulta
                </h4>
                <div className="pl-6 space-y-2 text-sm">
                  {consulta.motivo_consulta && (
                    <div>
                      <span className="text-muted-foreground">Motivo:</span>{" "}
                      {consulta.motivo_consulta}
                    </div>
                  )}
                  {consulta.sintomas && (
                    <div>
                      <span className="text-muted-foreground">Sintomas:</span>{" "}
                      {consulta.sintomas}
                    </div>
                  )}
                  {consulta.observacoes_paciente && (
                    <div>
                      <span className="text-muted-foreground">Observações:</span>{" "}
                      {consulta.observacoes_paciente}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Valor */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Valor da Consulta</span>
            </div>
            <span className="text-lg font-bold text-primary">
              R$ {consulta.valor_consulta?.toFixed(2)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
