import { useState } from "react";
import { Smile, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Reacao } from "@/hooks/useChatClinica";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  reacoes: Reacao[];
  onToggleReacao: (emoji: string) => void;
  isMinhaMsg: boolean;
}

const EMOJIS_DISPONIVEIS = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎉"];

export function MessageReactions({ reacoes, onToggleReacao, isMinhaMsg }: MessageReactionsProps) {
  const { currentUser } = useAuth();
  const [showPicker, setShowPicker] = useState(false);

  const meuId = currentUser?.medicoId || currentUser?.id;

  // Agrupar reações por emoji
  const reacoesAgrupadas = reacoes.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = [];
    }
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, Reacao[]>);

  const handleEmojiClick = (emoji: string) => {
    onToggleReacao(emoji);
    setShowPicker(false);
  };

  const verificarMinhaReacao = (emoji: string) => {
    const reacoesDeste = reacoesAgrupadas[emoji] || [];
    return reacoesDeste.some(r => {
      const reacaoUserId = r.medico_id || r.usuario_id || r.usuario_clinica_id;
      return reacaoUserId === meuId;
    });
  };

  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", isMinhaMsg ? "justify-end" : "justify-start")}>
      {/* Reações existentes */}
      {Object.entries(reacoesAgrupadas).map(([emoji, lista]) => {
        const minhaReacao = verificarMinhaReacao(emoji);
        return (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 py-0 text-xs rounded-full",
              minhaReacao 
                ? "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                : "bg-muted/50 hover:bg-muted"
            )}
            onClick={() => onToggleReacao(emoji)}
            title={minhaReacao ? "Clique para remover sua reação" : "Clique para reagir"}
          >
            <span className="mr-1">{emoji}</span>
            <span className="font-medium">{lista.length}</span>
          </Button>
        );
      })}

      {/* Botão para adicionar reação */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            title="Adicionar reação"
          >
            <Smile className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1">
            {EMOJIS_DISPONIVEIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 text-lg hover:bg-muted",
                  verificarMinhaReacao(emoji) && "bg-primary/20"
                )}
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
