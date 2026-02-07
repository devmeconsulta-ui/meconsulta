import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Plus, Check, X } from "lucide-react";
import { OmniEtiqueta } from "@/hooks/useOmniEtiquetas";
import { cn } from "@/lib/utils";

interface EtiquetasModalProps {
  open: boolean;
  onClose: () => void;
  etiquetas: OmniEtiqueta[];
  selectedEtiquetas: string[];
  onSave: (etiquetas: string[]) => void;
  onCreateEtiqueta?: (nome: string, cor: string) => Promise<void>;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

export function EtiquetasModal({
  open,
  onClose,
  etiquetas,
  selectedEtiquetas,
  onSave,
  onCreateEtiqueta,
}: EtiquetasModalProps) {
  const [selected, setSelected] = useState<string[]>(selectedEtiquetas);
  const [showCreate, setShowCreate] = useState(false);
  const [newEtiquetaNome, setNewEtiquetaNome] = useState("");
  const [newEtiquetaCor, setNewEtiquetaCor] = useState("#3b82f6");
  const [creating, setCreating] = useState(false);

  const toggleEtiqueta = (nome: string) => {
    setSelected((prev) =>
      prev.includes(nome)
        ? prev.filter((e) => e !== nome)
        : [...prev, nome]
    );
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const handleCreate = async () => {
    if (!newEtiquetaNome.trim() || !onCreateEtiqueta) return;
    
    setCreating(true);
    try {
      await onCreateEtiqueta(newEtiquetaNome.trim(), newEtiquetaCor);
      setNewEtiquetaNome("");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Gerenciar etiquetas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected labels preview */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((nome) => {
                const etiqueta = etiquetas.find((e) => e.nome === nome);
                return (
                  <Badge
                    key={nome}
                    variant="secondary"
                    style={{ backgroundColor: etiqueta?.cor || "#6b7280" }}
                    className="text-white text-xs"
                  >
                    {nome}
                    <button
                      className="ml-1 hover:opacity-70"
                      onClick={() => toggleEtiqueta(nome)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Available labels */}
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {etiquetas.map((etiqueta) => (
                <button
                  key={etiqueta.id}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors",
                    selected.includes(etiqueta.nome) && "bg-gray-50"
                  )}
                  onClick={() => toggleEtiqueta(etiqueta.nome)}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: etiqueta.cor }}
                  />
                  <span className="flex-1 text-left text-sm">{etiqueta.nome}</span>
                  {selected.includes(etiqueta.nome) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}

              {etiquetas.length === 0 && !showCreate && (
                <div className="text-center py-8 text-gray-400">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma etiqueta cadastrada</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Create new label */}
          {showCreate ? (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <Input
                placeholder="Nome da etiqueta"
                value={newEtiquetaNome}
                onChange={(e) => setNewEtiquetaNome(e.target.value)}
                autoFocus
              />
              <div className="flex gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "h-6 w-6 rounded-full transition-transform",
                      newEtiquetaCor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewEtiquetaCor(color)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowCreate(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={!newEtiquetaNome.trim() || creating}
                >
                  {creating ? "Criando..." : "Criar"}
                </Button>
              </div>
            </div>
          ) : (
            onCreateEtiqueta && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar nova etiqueta
              </Button>
            )
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
