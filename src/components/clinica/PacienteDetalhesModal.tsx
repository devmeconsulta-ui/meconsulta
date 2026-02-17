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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Save, X, Phone, MapPin, CreditCard, Calendar, Clock, Stethoscope, Lock } from "lucide-react";
import { maskPhone, maskCPF } from "@/lib/maskUtils";

interface PacienteDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: any;
  consultaCount: number;
  isInterno?: boolean; // Se true, permite edição completa (paciente interno)
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  confirmada: "bg-green-100 text-green-800",
  concluida: "bg-blue-100 text-blue-800",
  cancelada: "bg-red-100 text-red-800",
  aguardando_pagamento: "bg-yellow-100 text-yellow-800",
};

const statusLabels: Record<string, string> = {
  confirmada: "Confirmada",
  concluida: "Concluída",
  cancelada: "Cancelada",
  aguardando_pagamento: "Aguardando Pagamento",
};

export function PacienteDetalhesModal({
  open,
  onOpenChange,
  paciente,
  consultaCount,
  isInterno = false,
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

  // Fetch consultation history
  const { data: consultas } = useQuery({
    queryKey: ["paciente-consultas", paciente?.id],
    queryFn: async () => {
      if (!paciente?.id) return [];

      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          status_pagamento,
          valor_consulta,
          motivo_consulta,
          medico:medicos(nome, especialidade)
        `)
        .eq("paciente_id", paciente.id)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!paciente?.id && open,
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
      setIsEditing(false);
    }
  }, [paciente]);

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "??";
  };

  const handleSave = async () => {
    if (!paciente?.id) return;

    setSaving(true);
    try {
      // Se for paciente interno, permite edição completa
      // Se for online, só permite editar localização
      const updateData: any = {
        nome: formData.nome,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        bairro: formData.bairro || null,
        data_nascimento: formData.data_nascimento || null,
      };

      // Pacientes internos podem ter telefone e CPF editados
      if (isInterno) {
        updateData.telefone = formData.telefone || null;
        updateData.cpf = formData.cpf || null;
      }

      const { error } = await supabase
        .from("pacientes")
        .update(updateData)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* Header com avatar */}
        <div className="flex items-center gap-4 pb-4">
          <Avatar className="h-14 w-14">
            {paciente?.foto_url && (
              <AvatarImage src={paciente.foto_url} alt={formData.nome} />
            )}
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
                className="font-semibold"
              />
            ) : (
              <h3 className="font-semibold text-lg">{formData.nome}</h3>
            )}
            <Badge variant="secondary" className="mt-1">
              {consultaCount} consulta{consultaCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="historico">Histórico de Consultas</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="flex-1 overflow-auto mt-4">
            <div className="grid gap-4">
              {/* Aviso de privacidade - só mostra se não for interno */}
              {!isInterno && (
                <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Paciente de consulta online. Dados sensíveis são protegidos pelo marketplace.
                  </p>
                </div>
              )}

              {/* Aviso para paciente interno */}
              {isInterno && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Paciente de consulta interna. Você pode editar todos os dados cadastrais.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  {isEditing && isInterno ? (
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  ) : (
                    <p className="text-sm flex items-center gap-2">
                      {isInterno ? (
                        formData.telefone || "Não informado"
                      ) : (
                        <>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                          {maskPhone(formData.telefone)}
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    CPF
                  </Label>
                  {isEditing && isInterno ? (
                    <Input
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  ) : (
                    <p className="text-sm flex items-center gap-2">
                      {isInterno ? (
                        formData.cpf || "Não informado"
                      ) : (
                        <>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                          {maskCPF(formData.cpf)}
                        </>
                      )}
                    </p>
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
          </TabsContent>

          <TabsContent value="historico" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {consultas?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma consulta encontrada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consultas?.map((consulta: any) => (
                    <div
                      key={consulta.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(parseISO(consulta.data_hora), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {consulta.medico && (
                            <p className="text-sm text-muted-foreground">
                              Dr(a). {consulta.medico.nome} - {consulta.medico.especialidade}
                            </p>
                          )}
                          {consulta.motivo_consulta && (
                            <p className="text-sm text-muted-foreground">
                              Motivo: {consulta.motivo_consulta}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusColors[consulta.status_consulta] || "bg-gray-100 text-gray-800"}>
                            {statusLabels[consulta.status_consulta] || consulta.status_consulta}
                          </Badge>
                          <span className="text-sm font-medium">
                            R$ {consulta.valor_consulta?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
