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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Save, X, User, Phone, MapPin, CreditCard, Calendar } from "lucide-react";

interface PacienteDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: any;
  consultaCount: number;
  onUpdate: () => void;
}

export function PacienteDetalhesModal({
  open,
  onOpenChange,
  paciente,
  consultaCount,
  onUpdate,
}: PacienteDetalhesModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    cidade: "",
    estado: "",
    bairro: "",
    data_nascimento: "",
  });

  useEffect(() => {
    if (paciente) {
      setFormData({
        nome: paciente.nome || "",
        telefone: paciente.telefone || "",
        cpf: paciente.cpf || "",
        cidade: paciente.cidade || "",
        estado: paciente.estado || "",
        bairro: paciente.bairro || "",
        data_nascimento: paciente.data_nascimento || "",
      });
    }
  }, [paciente]);

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "??";
  };

  const handleSave = async () => {
    if (!paciente?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("pacientes")
        .update({
          nome: formData.nome,
          telefone: formData.telefone || null,
          cpf: formData.cpf || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          bairro: formData.bairro || null,
          data_nascimento: formData.data_nascimento || null,
        })
        .eq("id", paciente.id);

      if (error) throw error;

      toast.success("Dados do paciente atualizados!");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating patient:", error);
      toast.error("Erro ao atualizar dados do paciente");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      nome: paciente?.nome || "",
      telefone: paciente?.telefone || "",
      cpf: paciente?.cpf || "",
      cidade: paciente?.cidade || "",
      estado: paciente?.estado || "",
      bairro: paciente?.bairro || "",
      data_nascimento: paciente?.data_nascimento || "",
    });
    setIsEditing(false);
  };

  if (!paciente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Paciente</span>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(formData.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo"
                  className="font-semibold text-lg"
                />
              ) : (
                <h3 className="font-semibold text-lg">{formData.nome}</h3>
              )}
              <Badge variant="secondary" className="mt-1">
                {consultaCount} consulta{consultaCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Dados do paciente */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                ) : (
                  <p className="text-sm">{formData.telefone || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  CPF
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                ) : (
                  <p className="text-sm">{formData.cpf || "Não informado"}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Data de Nascimento
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                />
              ) : (
                <p className="text-sm">
                  {formData.data_nascimento
                    ? new Date(formData.data_nascimento).toLocaleDateString("pt-BR")
                    : "Não informado"}
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Localização
              </Label>
              {isEditing ? (
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Cidade"
                  />
                  <Input
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    placeholder="Estado"
                    maxLength={2}
                  />
                  <Input
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
              ) : (
                <p className="text-sm">
                  {[formData.bairro, formData.cidade, formData.estado].filter(Boolean).join(", ") || "Não informado"}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
