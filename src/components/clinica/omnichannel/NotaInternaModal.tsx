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
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Send } from "lucide-react";

interface NotaInternaModalProps {
  open: boolean;
  onClose: () => void;
  onEnviar: (mensagem: string) => Promise<void>;
  agenteNome?: string;
}

export function NotaInternaModal({
  open,
  onClose,
  onEnviar,
  agenteNome,
}: NotaInternaModalProps) {
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    if (!mensagem.trim()) return;
    
    setEnviando(true);
    try {
      await onEnviar(mensagem.trim());
      setMensagem("");
      onClose();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Inserir mensagem de informação
          </DialogTitle>
          <DialogDescription>
            Mensagens de informação não serão vistas pelo cliente.
            {agenteNome && (
              <span className="block mt-1 text-primary font-medium">
                Será enviada para: {agenteNome}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Digite a mensagem que será enviada ao atendente..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={4}
            className="resize-none"
            autoFocus
          />
          
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Esta nota aparecerá apenas para o atendente responsável, como um alerta destacado na conversa.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={!mensagem.trim() || enviando}
          >
            {enviando ? (
              "Enviando..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Inserir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
