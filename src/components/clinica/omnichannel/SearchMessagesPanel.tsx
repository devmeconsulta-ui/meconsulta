import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, ArrowLeft, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniMensagem } from "@/hooks/useOmniAtendimentos";
import { cn } from "@/lib/utils";

interface SearchMessagesPanelProps {
  open: boolean;
  onClose: () => void;
  mensagens: OmniMensagem[];
  onMessageClick: (messageId: string) => void;
}

export function SearchMessagesPanel({
  open,
  onClose,
  mensagens,
  onMessageClick,
}: SearchMessagesPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const search = searchTerm.toLowerCase();
    return mensagens.filter(
      (msg) =>
        msg.conteudo?.toLowerCase().includes(search) ||
        msg.arquivo_nome?.toLowerCase().includes(search)
    );
  }, [mensagens, searchTerm]);

  if (!open) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l shadow-lg z-10 flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={onClose}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-semibold">Pesquisar mensagens</h3>
      </div>

      {/* Search input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar nas mensagens..."
            className="pl-9 pr-9 bg-gray-50 border-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {!searchTerm.trim() ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Search className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm text-center px-4">
              Digite para pesquisar nas mensagens dos últimos 60 dias
            </p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma mensagem encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            <div className="px-3 py-2 bg-gray-50">
              <span className="text-xs text-gray-500">
                {filteredMessages.length} resultado{filteredMessages.length !== 1 ? "s" : ""}
              </span>
            </div>
            {filteredMessages.map((msg) => (
              <button
                key={msg.id}
                className="w-full p-3 hover:bg-gray-50 text-left transition-colors"
                onClick={() => {
                  onMessageClick(msg.id);
                  onClose();
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-500">
                    {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    msg.direcao === "saida" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-blue-100 text-blue-700"
                  )}>
                    {msg.direcao === "saida" ? "Enviada" : "Recebida"}
                  </span>
                </div>
                <p className="text-sm text-gray-800 line-clamp-2">
                  {msg.conteudo || `[${msg.tipo}]`}
                </p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
