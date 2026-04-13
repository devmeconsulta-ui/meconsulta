import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Landmark,
  Check,
  Lock,
  Unlock,
} from "lucide-react";
import { CaixaDefinicao } from "@/hooks/useCaixaClinica";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MultiCaixaSelectorProps {
  caixas: CaixaDefinicao[];
  caixaSelecionadoId: string | null;
  caixaAberto: boolean;
  onSelecionarCaixa: (id: string) => void;
  onCriarCaixa: (nome: string, descricao?: string, cor?: string) => Promise<{ data: any; error: any }>;
  onEditarCaixa: (id: string, updates: { nome?: string; descricao?: string; cor?: string }) => Promise<{ data: any; error: any }>;
  onExcluirCaixa: (id: string) => Promise<{ error: any }>;
}

const CORES_CAIXA = [
  "#3b82f6", "#22c55e", "#eab308", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

export function MultiCaixaSelector({
  caixas,
  caixaSelecionadoId,
  caixaAberto,
  onSelecionarCaixa,
  onCriarCaixa,
  onEditarCaixa,
  onExcluirCaixa,
}: MultiCaixaSelectorProps) {
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState<CaixaDefinicao | null>(null);
  const [showExcluirConfirm, setShowExcluirConfirm] = useState<CaixaDefinicao | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState(CORES_CAIXA[0]);
  const [saving, setSaving] = useState(false);

  const handleCriar = async () => {
    if (!nome.trim()) {
      toast.error("Informe um nome para o caixa");
      return;
    }
    setSaving(true);
    const result = await onCriarCaixa(nome.trim(), descricao.trim() || undefined, cor);
    if (result.error) {
      toast.error("Erro ao criar caixa");
    } else {
      toast.success(`Caixa "${nome}" criado!`);
      setShowCriarModal(false);
      setNome("");
      setDescricao("");
      setCor(CORES_CAIXA[0]);
    }
    setSaving(false);
  };

  const handleEditar = async () => {
    if (!showEditarModal || !nome.trim()) return;
    setSaving(true);
    const result = await onEditarCaixa(showEditarModal.id, { nome: nome.trim(), descricao: descricao.trim() || undefined, cor });
    if (result.error) {
      toast.error("Erro ao editar caixa");
    } else {
      toast.success("Caixa atualizado!");
      setShowEditarModal(null);
    }
    setSaving(false);
  };

  const handleExcluir = async () => {
    if (!showExcluirConfirm) return;
    setSaving(true);
    const result = await onExcluirCaixa(showExcluirConfirm.id);
    if (result.error) {
      toast.error("Erro ao excluir caixa");
    } else {
      toast.success("Caixa desativado");
      setShowExcluirConfirm(null);
    }
    setSaving(false);
  };

  const openEditModal = (caixa: CaixaDefinicao) => {
    setNome(caixa.nome);
    setDescricao(caixa.descricao || "");
    setCor(caixa.cor);
    setShowEditarModal(caixa);
  };

  const openCriarModal = () => {
    setNome("");
    setDescricao("");
    setCor(CORES_CAIXA[0]);
    setShowCriarModal(true);
  };

  return (
    <>
      <Card className="card-shadow">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Caixas</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7"
              onClick={openCriarModal}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {caixas.map((caixa) => {
              const isSelected = caixa.id === caixaSelecionadoId;
              return (
                <button
                  key={caixa.id}
                  onClick={() => onSelecionarCaixa(caixa.id)}
                  className={cn(
                    "group relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: caixa.cor }}
                  />
                  <span className="truncate max-w-[120px]">{caixa.nome}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                  {/* Edit/delete on hover */}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(caixa);
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-background"
                    >
                      <Edit className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {caixas.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExcluirConfirm(caixa);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Criar Modal */}
      <Dialog open={showCriarModal} onOpenChange={setShowCriarModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Novo Caixa
            </DialogTitle>
            <DialogDescription>Crie um novo caixa para gerenciar separadamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Caixa *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Caixa Recepção, Caixa 2..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Caixa da recepção principal"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-2">
                {CORES_CAIXA.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform",
                      cor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriarModal(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar Modal */}
      <Dialog open={!!showEditarModal} onOpenChange={() => setShowEditarModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Caixa *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-2">
                {CORES_CAIXA.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform",
                      cor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditarModal(null)}>Cancelar</Button>
            <Button onClick={handleEditar} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir Confirmação */}
      <Dialog open={!!showExcluirConfirm} onOpenChange={() => setShowExcluirConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Desativar Caixa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar o caixa "{showExcluirConfirm?.nome}"? Os dados históricos serão mantidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExcluirConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
