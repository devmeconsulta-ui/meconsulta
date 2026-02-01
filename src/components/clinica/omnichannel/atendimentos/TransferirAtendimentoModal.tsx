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
import { MessageCircle, Users, Inbox } from "lucide-react";
import { OmniAtendimento } from "@/hooks/useOmniAtendimentos";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState<"agentes" | "filas">("agentes");

  const filteredAgentes = useMemo(() => {
    if (!searchTerm) return agentes;
    return agentes.filter((agente) =>
      agente.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agentes, searchTerm]);

  const filteredFilas = useMemo(() => {
    if (!searchTerm) return filas;
    return filas.filter((fila) =>
      fila.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filas, searchTerm]);

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

  const handleSelectFila = async (filaId: string) => {
    if (!atendimento) return;

    setLoading(true);
    try {
      await onTransferir(atendimento.id, undefined, filaId);
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
            Selecione para quem deseja transferir
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "agentes" | "filas")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agentes" className="gap-2">
              <Users className="h-4 w-4" />
              Agentes
            </TabsTrigger>
            <TabsTrigger value="filas" className="gap-2">
              <Inbox className="h-4 w-4" />
              Filas
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 py-3">
            {/* Search Field */}
            <div className="space-y-1">
              <Label className="text-xs text-primary">Buscar</Label>
              <Input
                placeholder={activeTab === "agentes" ? "Buscar agente..." : "Buscar fila..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus-visible:ring-primary"
              />
            </div>

            {/* Agents Tab */}
            <TabsContent value="agentes" className="mt-0">
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
                          <span>{agente.atendimentos_count || 0} atendimentos</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Filas Tab */}
            <TabsContent value="filas" className="mt-0">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredFilas.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">
                    Nenhuma fila encontrada
                  </p>
                ) : (
                  filteredFilas.map((fila) => (
                    <button
                      key={fila.id}
                      onClick={() => handleSelectFila(fila.id)}
                      disabled={loading}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${fila.cor}20` }}
                      >
                        <Inbox className="h-5 w-5" style={{ color: fila.cor }} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{fila.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Transferir para esta fila
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
