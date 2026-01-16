import { useEffect, useState } from "react";
import { useCrmClinica } from "@/hooks/useCrmClinica";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Trash2 } from "lucide-react";

interface CrmFunilModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funilId: string | null;
  clinicaId: string | null;
}

export default function CrmFunilModal({
  open,
  onOpenChange,
  funilId,
  clinicaId,
}: CrmFunilModalProps) {
  const { funis, criarFunil, atualizarFunil, excluirFunil } = useCrmClinica(clinicaId);
  const funilAtual = funis.find(f => f.id === funilId);
  
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (funilAtual) {
      setNome(funilAtual.nome);
      setDescricao(funilAtual.descricao || "");
    } else {
      setNome("");
      setDescricao("");
    }
    setConfirmDelete(false);
  }, [funilAtual, open]);

  const handleSave = () => {
    if (!nome.trim()) return;

    if (funilId) {
      atualizarFunil.mutate({ id: funilId, nome, descricao });
    } else {
      criarFunil.mutate({ nome, descricao });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (funilId && confirmDelete) {
      excluirFunil.mutate(funilId);
      onOpenChange(false);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {funilId ? "Configurar Funil" : "Novo Funil"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
            <TabsTrigger value="permissoes" className="flex-1">Permissões</TabsTrigger>
            <TabsTrigger value="automacoes" className="flex-1">Automações</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome*</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Comercial, Atendimento..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o objetivo deste funil..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="permissoes" className="mt-4">
            <div className="text-center text-muted-foreground py-8">
              <p>Configurações de permissões em breve</p>
            </div>
          </TabsContent>

          <TabsContent value="automacoes" className="mt-4">
            <div className="text-center text-muted-foreground py-8">
              <p>Configurações de automações em breve</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4">
          {funilId ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={excluirFunil.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {confirmDelete ? "Confirmar Exclusão" : "Excluir"}
              </Button>
              {confirmDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          ) : (
            <div />
          )}
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!nome.trim() || criarFunil.isPending || atualizarFunil.isPending}
            >
              {funilId ? "Atualizar" : "Criar Funil"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
