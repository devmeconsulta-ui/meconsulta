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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OmniAtendimento } from "@/hooks/useOmniAtendimentos";

interface TransferirAtendimentoModalProps {
  open: boolean;
  onClose: () => void;
  atendimento: OmniAtendimento | null;
  filas: Array<{ id: string; nome: string; cor: string }>;
  agentes: Array<{ id: string; nome: string }>;
  onTransferir: (atendimentoId: string, novoAgenteId?: string, novaFilaId?: string) => Promise<void>;
}

export function TransferirAtendimentoModal({
  open,
  onClose,
  atendimento,
  filas,
  agentes,
  onTransferir,
}: TransferirAtendimentoModalProps) {
  const [selectedFila, setSelectedFila] = useState<string>("");
  const [selectedAgente, setSelectedAgente] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleTransferir = async () => {
    if (!atendimento) return;

    setLoading(true);
    try {
      await onTransferir(
        atendimento.id,
        selectedAgente || undefined,
        selectedFila || undefined
      );
      onClose();
      setSelectedFila("");
      setSelectedAgente("");
    } finally {
      setLoading(false);
    }
  };

  if (!atendimento) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Transferindo atendimento de:{" "}
              <span className="font-medium text-foreground">
                {atendimento.contato?.nome || "Desconhecido"}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Transferir para fila</Label>
            <Select value={selectedFila} onValueChange={setSelectedFila}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma fila (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {filas.map((fila) => (
                  <SelectItem key={fila.id} value={fila.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: fila.cor }}
                      />
                      {fila.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transferir para agente</Label>
            <Select value={selectedAgente} onValueChange={setSelectedAgente}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um agente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {agentes.map((agente) => (
                  <SelectItem key={agente.id} value={agente.id}>
                    {agente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Selecione uma fila e/ou um agente para transferir o atendimento.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransferir}
            disabled={loading || (!selectedFila && !selectedAgente)}
          >
            {loading ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
