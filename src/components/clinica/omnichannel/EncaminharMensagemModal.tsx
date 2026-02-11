import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OmniMensagem } from "@/hooks/useOmniAtendimentos";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  foto_url?: string | null;
  atendimento_id?: string;
}

interface EncaminharMensagemModalProps {
  open: boolean;
  onClose: () => void;
  mensagem: OmniMensagem | null;
  clinicaId: string | null;
  agenteId: string | null;
  agenteName: string | null;
  currentAtendimentoId: string | null;
}

function getInitials(name: string) {
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function EncaminharMensagemModal({
  open,
  onClose,
  mensagem,
  clinicaId,
  agenteId,
  agenteName,
  currentAtendimentoId,
}: EncaminharMensagemModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // Load contacts with active atendimentos when modal opens
  const loadContatos = useCallback(async () => {
    if (!clinicaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("omni_atendimentos")
        .select(`
          id,
          contato:omni_contatos!contato_id(id, nome, telefone, foto_url)
        `)
        .eq("clinica_id", clinicaId)
        .in("status", ["aguardando", "em_atendimento"])
        .neq("id", currentAtendimentoId || "");

      if (error) throw error;

      const mapped: Contato[] = (data || [])
        .filter((a: any) => a.contato)
        .map((a: any) => ({
          id: a.contato.id,
          nome: a.contato.nome || a.contato.telefone,
          telefone: a.contato.telefone,
          foto_url: a.contato.foto_url,
          atendimento_id: a.id,
        }));
      setContatos(mapped);
    } catch (err) {
      console.error("Error loading contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [clinicaId, currentAtendimentoId]);

  // Load on open
  useState(() => {
    if (open) loadContatos();
  });

  // Reload when open changes
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSearchTerm("");
      loadContatos();
    }
  }

  const filtered = useMemo(() => {
    if (!searchTerm) return contatos;
    const s = searchTerm.toLowerCase();
    return contatos.filter(
      (c) => c.nome.toLowerCase().includes(s) || c.telefone.includes(s)
    );
  }, [contatos, searchTerm]);

  const handleForward = async (contato: Contato) => {
    if (!mensagem || !contato.atendimento_id) return;
    setSending(contato.id);

    try {
      const content = mensagem.conteudo || "";
      const forwardText = `↪ Mensagem encaminhada:\n${content}`;

      const tipo = mensagem.tipo === "texto" ? "texto" : mensagem.tipo;

      const { data, error } = await supabase.functions.invoke("evolution-send-message", {
        body: {
          atendimento_id: contato.atendimento_id,
          agente_id: agenteId,
          tipo,
          conteudo: tipo === "texto" ? forwardText : content,
          arquivo_url: mensagem.arquivo_url,
          arquivo_nome: mensagem.arquivo_nome,
          arquivo_tipo: mensagem.arquivo_tipo,
        },
      });

      if (error) throw error;

      toast.success(`Mensagem encaminhada para ${contato.nome}`);
      onClose();
    } catch (err) {
      console.error("Error forwarding:", err);
      toast.error("Erro ao encaminhar mensagem");
    } finally {
      setSending(null);
    }
  };

  if (!mensagem) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Encaminhar mensagem</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Selecione o contato para encaminhar
          </p>
        </DialogHeader>

        {/* Preview */}
        <div className="bg-muted/50 rounded-lg p-3 border">
          <p className="text-xs text-muted-foreground mb-1">Mensagem:</p>
          <p className="text-sm line-clamp-3">
            {mensagem.conteudo || mensagem.arquivo_nome || "Mídia"}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Contact list */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">
              Nenhum contato encontrado
            </p>
          ) : (
            filtered.map((contato) => (
              <button
                key={contato.atendimento_id}
                onClick={() => handleForward(contato)}
                disabled={sending !== null}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                  "hover:border-primary hover:bg-primary/5",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  sending === contato.id && "opacity-70",
                  sending !== null && sending !== contato.id && "opacity-50 cursor-not-allowed"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contato.foto_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {getInitials(contato.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{contato.nome}</p>
                  <p className="text-xs text-muted-foreground">{contato.telefone}</p>
                </div>
                {sending === contato.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Send className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
