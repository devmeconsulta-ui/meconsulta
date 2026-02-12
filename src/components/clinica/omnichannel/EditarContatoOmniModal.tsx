import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContatoData {
  id: string;
  nome: string;
  telefone: string;
  documento?: string | null;
  email?: string | null;
  instagram?: string | null;
  empresa?: string | null;
  observacoes?: string | null;
}

interface EditarContatoOmniModalProps {
  open: boolean;
  onClose: () => void;
  contato: ContatoData | null;
  onUpdated?: (updatedContato: ContatoData) => void;
}

export function EditarContatoOmniModal({
  open,
  onClose,
  contato,
  onUpdated,
}: EditarContatoOmniModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    documento: "",
    email: "",
    instagram: "",
    empresa: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open && contato) {
      setFormData({
        nome: contato.nome || "",
        telefone: contato.telefone || "",
        documento: contato.documento || "",
        email: contato.email || "",
        instagram: contato.instagram || "",
        empresa: contato.empresa || "",
        observacoes: contato.observacoes || "",
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!contato) return;
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("omni_contatos")
        .update({
          nome: formData.nome.trim(),
          telefone: formData.telefone.trim(),
          documento: formData.documento.trim() || null,
          email: formData.email.trim() || null,
          instagram: formData.instagram.trim() || null,
          empresa: formData.empresa.trim() || null,
          observacoes: formData.observacoes.trim() || null,
        })
        .eq("id", contato.id);

      if (error) throw error;

      toast.success("Contato atualizado com sucesso");
      onUpdated?.({
        ...contato,
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        documento: formData.documento.trim() || null,
        email: formData.email.trim() || null,
        instagram: formData.instagram.trim() || null,
        empresa: formData.empresa.trim() || null,
        observacoes: formData.observacoes.trim() || null,
      });
      onClose();
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Erro ao atualizar contato");
    } finally {
      setSaving(false);
    }
  };

  if (!contato) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome do contato"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="5511999999999"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CPF/CNPJ</Label>
              <Input
                value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                placeholder="Documento"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Instagram</Label>
              <Input
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@usuario"
              />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                placeholder="Empresa"
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações sobre o contato"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
