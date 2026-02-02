import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Loader2, XCircle, CalendarClock } from "lucide-react";
import { OmniAtendimento } from "@/hooks/useOmniAtendimentos";
import { format } from "date-fns";

interface EncerrarAtendimentoModalProps {
  open: boolean;
  onClose: () => void;
  atendimento: OmniAtendimento | null;
  onEncerrar: (
    motivoFechamento: string,
    dataReabertura?: Date,
    mensagemReabertura?: string
  ) => Promise<void>;
}

const motivosEncerramento = [
  { value: "resolvido", label: "Problema resolvido" },
  { value: "nao_respondeu", label: "Cliente não respondeu" },
  { value: "transferido", label: "Transferido para outro setor" },
  { value: "agendamento", label: "Agendamento realizado" },
  { value: "informacao", label: "Informação fornecida" },
  { value: "cancelado", label: "Cancelado pelo cliente" },
  { value: "outro", label: "Outro" },
];

export function EncerrarAtendimentoModal({
  open,
  onClose,
  atendimento,
  onEncerrar,
}: EncerrarAtendimentoModalProps) {
  const [tipoEncerramento, setTipoEncerramento] = useState<"definitivo" | "reabertura">("definitivo");
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [dataReabertura, setDataReabertura] = useState("");
  const [horaReabertura, setHoraReabertura] = useState("");
  const [mensagemReabertura, setMensagemReabertura] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!motivoSelecionado) return;

    setLoading(true);
    try {
      let dataHoraReabertura: Date | undefined;
      
      if (tipoEncerramento === "reabertura" && dataReabertura && horaReabertura) {
        dataHoraReabertura = new Date(`${dataReabertura}T${horaReabertura}:00`);
      }

      await onEncerrar(
        motivoSelecionado,
        dataHoraReabertura,
        tipoEncerramento === "reabertura" ? mensagemReabertura : undefined
      );

      // Reset form
      setTipoEncerramento("definitivo");
      setMotivoSelecionado("");
      setDataReabertura("");
      setHoraReabertura("");
      setMensagemReabertura("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTipoEncerramento("definitivo");
      setMotivoSelecionado("");
      setDataReabertura("");
      setHoraReabertura("");
      setMensagemReabertura("");
      onClose();
    }
  };

  // Get minimum date (today)
  const minDate = format(new Date(), "yyyy-MM-dd");

  if (!atendimento) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Encerrar atendimento
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Protocolo #{atendimento.protocolo} • {atendimento.contato?.nome || atendimento.contato?.telefone}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo de encerramento */}
          <RadioGroup
            value={tipoEncerramento}
            onValueChange={(v) => setTipoEncerramento(v as "definitivo" | "reabertura")}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="definitivo" id="definitivo" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="definitivo" className="font-medium cursor-pointer">
                  Encerrar definitivamente
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  O atendimento será finalizado e movido para o histórico
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="reabertura" id="reabertura" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="reabertura" className="font-medium cursor-pointer flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Agendar reabertura
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Encerrar agora e reabrir automaticamente em uma data futura
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Motivo de encerramento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Motivo do encerramento</Label>
            <Select value={motivoSelecionado} onValueChange={setMotivoSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {motivosEncerramento.map((motivo) => (
                  <SelectItem key={motivo.value} value={motivo.value}>
                    {motivo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campos de reabertura */}
          {tipoEncerramento === "reabertura" && (
            <div className="space-y-4 p-3 rounded-lg bg-muted/50 border">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Data
                  </Label>
                  <Input
                    type="date"
                    value={dataReabertura}
                    onChange={(e) => setDataReabertura(e.target.value)}
                    min={minDate}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Hora
                  </Label>
                  <Input
                    type="time"
                    value={horaReabertura}
                    onChange={(e) => setHoraReabertura(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Mensagem de reabertura (opcional)
                </Label>
                <Textarea
                  placeholder="Mensagem que será enviada automaticamente ao reabrir..."
                  value={mensagemReabertura}
                  onChange={(e) => setMensagemReabertura(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será enviada automaticamente quando o atendimento for reaberto
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!motivoSelecionado || loading || (tipoEncerramento === "reabertura" && (!dataReabertura || !horaReabertura))}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Encerrando...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Encerrar atendimento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
