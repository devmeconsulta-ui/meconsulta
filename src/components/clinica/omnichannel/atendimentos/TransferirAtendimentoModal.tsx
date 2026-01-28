import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";
import { OmniAtendimento } from "@/hooks/useOmniAtendimentos";
import { cn } from "@/lib/utils";

interface TransferirAtendimentoModalProps {
  open: boolean;
  onClose: () => void;
  atendimento: OmniAtendimento | null;
  filas: Array<{ id: string; nome: string; cor: string }>;
  agentes: Array<{ id: string; nome: string; atendimentos_count?: number }>;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredAgentes = useMemo(() => {
    if (!searchTerm) return agentes;
    return agentes.filter((agente) =>
      agente.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agentes, searchTerm]);

  const handleSelectAgente = async (agenteId: string) => {
    if (!atendimento) return;

    setLoading(true);
    try {
      await onTransferir(atendimento.id, agenteId, undefined);
      onClose();
      setSearchTerm("");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!atendimento) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir atendimento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Selecione o agente para quem deseja transferir
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search Field */}
          <div className="space-y-1">
            <Label className="text-xs text-primary">Buscar</Label>
            <Input
              placeholder="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus-visible:ring-primary"
            />
          </div>

          {/* Agents List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredAgentes.length === 0 ? (
              <p className="text-center py-4 text-sm text-muted-foreground">
                Nenhum agente encontrado
              </p>
            ) : (
              filteredAgentes.map((agente) => (
                <button
                  key={agente.id}
                  onClick={() => handleSelectAgente(agente.id)}
                  disabled={loading}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Avatar className="h-10 w-10 bg-muted">
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                      {getInitials(agente.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{agente.nome}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="h-3 w-3" />
                      <span>{agente.atendimentos_count || 0}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
