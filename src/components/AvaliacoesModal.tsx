import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, User, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  paciente?: {
    nome: string;
  } | null;
}

interface AvaliacoesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicoId: string;
  medicoNome: string;
  mediaAvaliacao: number;
  totalAvaliacoes: number;
}

export function AvaliacoesModal({
  open,
  onOpenChange,
  medicoId,
  medicoNome,
  mediaAvaliacao,
  totalAvaliacoes,
}: AvaliacoesModalProps) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && medicoId) {
      fetchAvaliacoes();
    }
  }, [open, medicoId]);

  async function fetchAvaliacoes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("avaliacoes_medico")
      .select(`
        id,
        nota,
        comentario,
        created_at,
        paciente:pacientes(nome)
      `)
      .eq("medico_id", medicoId)
      .eq("aprovada_admin", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar avaliações:", error);
    } else {
      setAvaliacoes(data || []);
    }
    setLoading(false);
  }

  const renderStars = (nota: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= nota
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  // Mask patient name for privacy (show first name + initial)
  const maskName = (nome: string | undefined) => {
    if (!nome) return "Paciente";
    const parts = nome.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1]?.charAt(0)}.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            Avaliações de {medicoNome}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">{mediaAvaliacao.toFixed(1)}</p>
            {renderStars(Math.round(mediaAvaliacao))}
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{totalAvaliacoes} avaliação(ões)</p>
            <p>de pacientes verificados</p>
          </div>
        </div>

        {/* Reviews List */}
        <ScrollArea className="max-h-[50vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : avaliacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-4 text-muted" />
              <p>Nenhuma avaliação ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {avaliacoes.map((avaliacao) => (
                <div
                  key={avaliacao.id}
                  className="p-4 bg-card border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium text-foreground truncate">
                          {maskName(avaliacao.paciente?.nome)}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(parseISO(avaliacao.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      {renderStars(avaliacao.nota)}
                      {avaliacao.comentario && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {avaliacao.comentario}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
