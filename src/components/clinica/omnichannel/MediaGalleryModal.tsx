import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniMensagem } from "@/hooks/useOmniAtendimentos";
import { ImageIcon, Video } from "lucide-react";

interface MediaGalleryModalProps {
  open: boolean;
  onClose: () => void;
  mensagens: OmniMensagem[];
}

export function MediaGalleryModal({
  open,
  onClose,
  mensagens,
}: MediaGalleryModalProps) {
  const mediaMessages = useMemo(() => {
    return mensagens.filter(
      (msg) => msg.tipo === "imagem" || msg.tipo === "video"
    );
  }, [mensagens]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Mídias ({mediaMessages.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          {mediaMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma mídia nesta conversa</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-2">
              {mediaMessages.map((msg) => (
                <a
                  key={msg.id}
                  href={msg.arquivo_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity group"
                >
                  {msg.tipo === "imagem" && msg.arquivo_url ? (
                    <img
                      src={msg.arquivo_url}
                      alt="Mídia"
                      className="w-full h-full object-cover"
                    />
                  ) : msg.tipo === "video" && msg.arquivo_url ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Video className="h-8 w-8 text-white" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                </a>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
