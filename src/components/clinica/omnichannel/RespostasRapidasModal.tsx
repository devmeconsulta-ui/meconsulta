import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

interface RespostaRapida {
  id: string;
  label: string;
  texto: string;
}

const DEFAULT_RESPOSTAS: RespostaRapida[] = [
  { id: "1", label: "Saudação", texto: "Olá! Tudo bem? Como posso ajudar? 😊" },
  { id: "2", label: "Aguarde", texto: "Um momento, por favor. Estou verificando suas informações." },
  { id: "3", label: "Confirmar consulta", texto: "Gostaria de confirmar sua consulta. Podemos prosseguir?" },
  { id: "4", label: "Enviar localização", texto: "Segue o endereço da clínica para sua consulta." },
  { id: "5", label: "Despedida", texto: "Agradeço o contato! Qualquer dúvida, estamos à disposição. 😊" },
  { id: "6", label: "Remarcar", texto: "Sem problemas! Vamos remarcar sua consulta. Qual o melhor horário para você?" },
  { id: "7", label: "Documentos", texto: "Para a consulta, por favor traga: documento com foto, cartão do convênio e exames anteriores." },
];

const STORAGE_KEY = "omni_respostas_rapidas";

function loadRespostas(): RespostaRapida[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_RESPOSTAS;
}

function saveRespostas(respostas: RespostaRapida[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(respostas));
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (texto: string) => void;
}

export function RespostasRapidasModal({ open, onClose, onSelect }: Props) {
  const [respostas, setRespostas] = useState<RespostaRapida[]>(loadRespostas);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoTexto, setNovoTexto] = useState("");

  useEffect(() => {
    if (open) setRespostas(loadRespostas());
  }, [open]);

  const handleSalvarNovo = () => {
    if (!novoLabel.trim() || !novoTexto.trim()) {
      toast.error("Preencha o título e a mensagem");
      return;
    }
    const nova: RespostaRapida = {
      id: Date.now().toString(),
      label: novoLabel.trim(),
      texto: novoTexto.trim(),
    };
    const updated = [...respostas, nova];
    setRespostas(updated);
    saveRespostas(updated);
    setCriando(false);
    setNovoLabel("");
    setNovoTexto("");
    toast.success("Resposta rápida criada!");
  };

  const handleSalvarEdicao = () => {
    if (!novoLabel.trim() || !novoTexto.trim()) {
      toast.error("Preencha o título e a mensagem");
      return;
    }
    const updated = respostas.map(r =>
      r.id === editandoId ? { ...r, label: novoLabel.trim(), texto: novoTexto.trim() } : r
    );
    setRespostas(updated);
    saveRespostas(updated);
    setEditandoId(null);
    setNovoLabel("");
    setNovoTexto("");
    toast.success("Resposta atualizada!");
  };

  const handleExcluir = (id: string) => {
    const updated = respostas.filter(r => r.id !== id);
    setRespostas(updated);
    saveRespostas(updated);
    toast.success("Resposta removida");
  };

  const handleCancelar = () => {
    setCriando(false);
    setEditandoId(null);
    setNovoLabel("");
    setNovoTexto("");
  };

  const handleEditar = (r: RespostaRapida) => {
    setCriando(false);
    setEditandoId(r.id);
    setNovoLabel(r.label);
    setNovoTexto(r.texto);
  };

  const isEditing = criando || editandoId !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { handleCancelar(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Respostas Rápidas
            {!isEditing && (
              <Button size="sm" variant="outline" onClick={() => setCriando(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Nova
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-3">
            <Input
              placeholder="Título (ex: Saudação)"
              value={novoLabel}
              onChange={(e) => setNovoLabel(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Mensagem da resposta rápida..."
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancelar}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={editandoId ? handleSalvarEdicao : handleSalvarNovo} className="gap-1">
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="flex flex-col gap-1">
              {respostas.map((resp) => (
                <div
                  key={resp.id}
                  className="group flex items-start gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    onSelect(resp.texto);
                    onClose();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-primary">{resp.label}</span>
                    <p className="text-xs text-muted-foreground line-clamp-2">{resp.texto}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); handleEditar(resp); }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleExcluir(resp.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {respostas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma resposta rápida cadastrada
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
