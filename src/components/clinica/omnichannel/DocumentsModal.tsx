import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniMensagem } from "@/hooks/useOmniAtendimentos";
import { FileText, Download, ExternalLink } from "lucide-react";

interface DocumentsModalProps {
  open: boolean;
  onClose: () => void;
  mensagens: OmniMensagem[];
}

export function DocumentsModal({
  open,
  onClose,
  mensagens,
}: DocumentsModalProps) {
  const documentMessages = useMemo(() => {
    return mensagens.filter((msg) => msg.tipo === "documento");
  }, [mensagens]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos ({documentMessages.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[50vh]">
          {documentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <FileText className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Nenhum documento nesta conversa</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {documentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {msg.arquivo_nome || "Documento"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {msg.arquivo_url && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a
                          href={msg.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a
                          href={msg.arquivo_url}
                          download={msg.arquivo_nome}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
