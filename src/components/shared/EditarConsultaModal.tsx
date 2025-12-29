import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Trash2, X, Edit, Plus, ClipboardList, User, History, Stethoscope, MapPin, Phone } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Procedimento {
  id?: string;
  nome_procedimento: string;
  valor: number;
  isNew?: boolean;
}

interface EditarConsultaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consulta: any;
  onSuccess?: () => void;
  readOnly?: boolean;
}

const statusOptions = [
  { value: "agendada", label: "Agendada" },
  { value: "aguardando_pagamento", label: "Aguardando Pagamento" },
  { value: "confirmada", label: "Confirmada" },
  { value: "aguardando", label: "Aguardando" },
  { value: "atendendo", label: "Atendendo" },
  { value: "concluida", label: "Concluída" },
  { value: "nao_compareceu", label: "Não Compareceu" },
  { value: "cancelada", label: "Cancelada" },
];

const paymentStatusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

export function EditarConsultaModal({
  open,
  onOpenChange,
  consulta,
  onSuccess,
  readOnly = false,
}: EditarConsultaModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [procedimentosRemovidos, setProcedimentosRemovidos] = useState<string[]>([]);
  const [novoProcedimento, setNovoProcedimento] = useState({ nome: "", valor: "" });
  const [medicoData, setMedicoData] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    data_hora: "",
    status_consulta: "",
    status_pagamento: "",
    motivo_consulta: "",
    sintomas: "",
    observacoes_paciente: "",
    valor_consulta: 0,
    nome_paciente_consulta: "",
  });

  useEffect(() => {
    if (consulta && open) {
      const dataHora = parseISO(consulta.data_hora);
      // Carrega dados iniciais - valor será recalculado após carregar procedimentos
      setFormData({
        data_hora: format(dataHora, "yyyy-MM-dd'T'HH:mm"),
        status_consulta: consulta.status_consulta || "confirmada",
        status_pagamento: consulta.status_pagamento || "pendente",
        motivo_consulta: consulta.motivo_consulta || "",
        sintomas: consulta.sintomas || "",
        observacoes_paciente: consulta.observacoes_paciente || "",
        valor_consulta: consulta.valor_consulta || 0,
        nome_paciente_consulta: consulta.nome_paciente_consulta || consulta.paciente?.nome || "",
      });
      
      // Fetch existing procedures
      fetchProcedimentos();
      
      // Fetch additional data for readOnly mode
      if (readOnly) {
        fetchMedicoData();
        fetchEventos();
      }
    }
  }, [consulta, open, readOnly]);

  const fetchMedicoData = async () => {
    if (!consulta?.medico_id) return;
    
    const { data } = await supabase
      .from("medicos")
      .select("*, locais_atendimento(*)")
      .eq("id", consulta.medico_id)
      .single();
    
    setMedicoData(data);
  };

  const fetchEventos = async () => {
    if (!consulta?.id) return;
    
    const { data } = await supabase
      .from("consultas_eventos")
      .select("*")
      .eq("consulta_id", consulta.id)
      .order("created_at", { ascending: false });
    
    setEventos(data || []);
  };

  const fetchProcedimentos = async () => {
    if (!consulta?.id) return;
    
    const { data, error } = await supabase
      .from("consulta_procedimentos")
      .select("*")
      .eq("consulta_id", consulta.id)
      .order("created_at", { ascending: true });
    
    if (!error && data) {
      const procs = data.map(p => ({
        id: p.id,
        nome_procedimento: p.nome_procedimento,
        valor: Number(p.valor)
      }));
      setProcedimentos(procs);
      
      // Recalcula valor base: valor_consulta salvo - soma dos procedimentos existentes
      const somaProcedimentos = procs.reduce((sum, p) => sum + p.valor, 0);
      const valorBase = (consulta.valor_consulta || 0) - somaProcedimentos;
      setFormData(prev => ({ ...prev, valor_consulta: Math.max(0, valorBase) }));
    }
    setProcedimentosRemovidos([]);
  };

  const handleAddProcedimento = () => {
    if (!novoProcedimento.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do procedimento.",
        variant: "destructive",
      });
      return;
    }

    const valor = parseFloat(novoProcedimento.valor) || 0;
    setProcedimentos(prev => [
      ...prev,
      {
        nome_procedimento: novoProcedimento.nome.trim(),
        valor: valor,
        isNew: true
      }
    ]);
    setNovoProcedimento({ nome: "", valor: "" });
  };

  const handleRemoveProcedimento = (index: number) => {
    const proc = procedimentos[index];
    if (proc.id) {
      setProcedimentosRemovidos(prev => [...prev, proc.id!]);
    }
    setProcedimentos(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcedimentoChange = (index: number, field: "nome_procedimento" | "valor", value: string) => {
    setProcedimentos(prev => prev.map((p, i) => {
      if (i === index) {
        return {
          ...p,
          [field]: field === "valor" ? (parseFloat(value) || 0) : value
        };
      }
      return p;
    }));
  };

  const totalProcedimentos = procedimentos.reduce((acc, p) => acc + p.valor, 0);
  const valorTotal = formData.valor_consulta + totalProcedimentos;

  const handleSave = async () => {
    if (!consulta?.id) return;
    
    setLoading(true);
    try {
      // valor_consulta = valor base + procedimentos (reflete em todo sistema financeiro)
      const updateData: any = {
        data_hora: new Date(formData.data_hora).toISOString(),
        status_consulta: formData.status_consulta,
        status_pagamento: formData.status_pagamento,
        motivo_consulta: formData.motivo_consulta || null,
        sintomas: formData.sintomas || null,
        observacoes_paciente: formData.observacoes_paciente || null,
        valor_consulta: valorTotal, // Total = base + procedimentos (reflete nos relatórios financeiros)
        nome_paciente_consulta: formData.nome_paciente_consulta || null,
      };

      // Se cancelando, também cancelar no Asaas se tiver payment_id
      if (formData.status_consulta === "cancelada" && consulta.asaas_payment_id) {
        try {
          await supabase.functions.invoke("cancel-asaas-payment", {
            body: { consultaId: consulta.id },
          });
        } catch (e) {
          console.error("Erro ao cancelar pagamento Asaas:", e);
        }
      }

      // Se status mudou para cancelada, liberar o slot da agenda
      if (formData.status_consulta === "cancelada" && consulta.agenda_slot_id) {
        await supabase
          .from("agenda_slots")
          .update({ disponivel: true })
          .eq("id", consulta.agenda_slot_id);
      }

      const { error } = await supabase
        .from("consultas")
        .update(updateData)
        .eq("id", consulta.id);

      if (error) throw error;

      // Delete removed procedures
      if (procedimentosRemovidos.length > 0) {
        await supabase
          .from("consulta_procedimentos")
          .delete()
          .in("id", procedimentosRemovidos);
      }

      // Save procedures
      for (const proc of procedimentos) {
        if (proc.isNew) {
          // Insert new
          await supabase
            .from("consulta_procedimentos")
            .insert({
              consulta_id: consulta.id,
              nome_procedimento: proc.nome_procedimento,
              valor: proc.valor
            });
        } else if (proc.id) {
          // Update existing
          await supabase
            .from("consulta_procedimentos")
            .update({
              nome_procedimento: proc.nome_procedimento,
              valor: proc.valor
            })
            .eq("id", proc.id);
        }
      }

      toast({
        title: "Consulta atualizada",
        description: "Os dados da consulta foram salvos com sucesso.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao atualizar consulta:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!consulta?.id) return;
    
    setDeleting(true);
    try {
      // Se tiver pagamento Asaas, cancelar primeiro
      if (consulta.asaas_payment_id) {
        try {
          await supabase.functions.invoke("cancel-asaas-payment", {
            body: { consultaId: consulta.id },
          });
        } catch (e) {
          console.error("Erro ao cancelar pagamento Asaas:", e);
        }
      }

      // Liberar slot da agenda se existir
      if (consulta.agenda_slot_id) {
        await supabase
          .from("agenda_slots")
          .update({ disponivel: true })
          .eq("id", consulta.agenda_slot_id);
      }

      // Deletar a consulta (procedimentos são deletados por CASCADE)
      const { error } = await supabase
        .from("consultas")
        .delete()
        .eq("id", consulta.id);

      if (error) throw error;

      toast({
        title: "Consulta excluída",
        description: "A consulta foi removida com sucesso.",
      });

      setDeleteDialogOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao excluir consulta:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir a consulta.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!consulta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            {readOnly ? "Detalhes da Consulta" : "Editar Consulta"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className={`grid w-full ${readOnly ? "grid-cols-4" : "grid-cols-2"}`}>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="procedimentos" className="gap-1">
              <ClipboardList className="h-3 w-3" />
              Procedimentos
            </TabsTrigger>
            {readOnly && (
              <>
                <TabsTrigger value="medico" className="gap-1">
                  <Stethoscope className="h-3 w-3" />
                  Médico
                </TabsTrigger>
                <TabsTrigger value="historico" className="gap-1">
                  <History className="h-3 w-3" />
                  Histórico
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            {/* Nome do paciente */}
            <div className="space-y-2">
              <Label htmlFor="nome_paciente">Nome do Paciente</Label>
              <Input
                id="nome_paciente"
                value={formData.nome_paciente_consulta}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome_paciente_consulta: e.target.value }))
                }
                placeholder="Nome do paciente"
                disabled={readOnly}
              />
            </div>

            {/* Data e Hora */}
            <div className="space-y-2">
              <Label htmlFor="data_hora">Data e Hora</Label>
              <Input
                id="data_hora"
                type="datetime-local"
                value={formData.data_hora}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, data_hora: e.target.value }))
                }
                disabled={readOnly}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status da Consulta */}
              <div className="space-y-2">
                <Label>Status da Consulta</Label>
                <Select
                  value={formData.status_consulta}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status_consulta: value }))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status do Pagamento */}
              <div className="space-y-2">
                <Label>Status do Pagamento</Label>
                <Select
                  value={formData.status_pagamento}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status_pagamento: value }))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Valor base da consulta */}
            <div className="space-y-2">
              <Label htmlFor="valor">Valor Base da Consulta (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_consulta}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, valor_consulta: parseFloat(e.target.value) || 0 }))
                }
                disabled={readOnly}
              />
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Consulta</Label>
              <Textarea
                id="motivo"
                value={formData.motivo_consulta}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, motivo_consulta: e.target.value }))
                }
                placeholder="Descreva o motivo da consulta"
                rows={2}
                disabled={readOnly}
              />
            </div>

            {/* Sintomas */}
            <div className="space-y-2">
              <Label htmlFor="sintomas">Sintomas</Label>
              <Textarea
                id="sintomas"
                value={formData.sintomas}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sintomas: e.target.value }))
                }
                placeholder="Descreva os sintomas"
                rows={2}
                disabled={readOnly}
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes_paciente}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observacoes_paciente: e.target.value }))
                }
                placeholder="Observações adicionais"
                rows={2}
                disabled={readOnly}
              />
            </div>
          </TabsContent>

          <TabsContent value="procedimentos" className="space-y-4 mt-4">
            {/* Add new procedure - hide in readOnly mode */}
            {!readOnly && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Nome do Procedimento</Label>
                      <Input
                        placeholder="Ex: Raio-X, Ultrassom, Exame de sangue..."
                        value={novoProcedimento.nome}
                        onChange={(e) => setNovoProcedimento(prev => ({ ...prev, nome: e.target.value }))}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={novoProcedimento.valor}
                        onChange={(e) => setNovoProcedimento(prev => ({ ...prev, valor: e.target.value }))}
                      />
                    </div>
                    <Button onClick={handleAddProcedimento} size="icon" className="shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Procedures list */}
            {procedimentos.length > 0 ? (
              <div className="space-y-2">
                <Label>Procedimentos Adicionados</Label>
                {procedimentos.map((proc, index) => (
                  <Card key={proc.id || `new-${index}`} className="bg-muted/50">
                    <CardContent className="py-3">
                      <div className="flex gap-2 items-center">
                        <Input
                          value={proc.nome_procedimento}
                          onChange={(e) => handleProcedimentoChange(index, "nome_procedimento", e.target.value)}
                          className="flex-1"
                          disabled={readOnly}
                        />
                        <div className="flex items-center gap-1 w-32">
                          <span className="text-muted-foreground text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={proc.valor}
                            onChange={(e) => handleProcedimentoChange(index, "valor", e.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveProcedimento(index)}
                            className="text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum procedimento adicional</p>
                <p className="text-sm">Adicione procedimentos usando o formulário acima</p>
              </div>
            )}

            {/* Totals */}
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor base da consulta:</span>
                <span>R$ {formData.valor_consulta.toFixed(2)}</span>
              </div>
              {procedimentos.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Procedimentos ({procedimentos.length}):</span>
                  <span>R$ {totalProcedimentos.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary">R$ {valorTotal.toFixed(2)}</span>
              </div>
            </div>
          </TabsContent>

          {/* Aba Médico - só em readOnly */}
          {readOnly && (
            <TabsContent value="medico" className="space-y-4 mt-4">
              {medicoData ? (
                <div className="space-y-4">
                  {/* Info básica */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        {medicoData.foto_url ? (
                          <img 
                            src={medicoData.foto_url} 
                            alt={medicoData.nome}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{medicoData.nome}</h3>
                          <p className="text-muted-foreground">{medicoData.especialidade || "Especialidade não informada"}</p>
                          {medicoData.crm && (
                            <Badge variant="outline" className="mt-1">CRM: {medicoData.crm}</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contato */}
                  {medicoData.telefone_whatsapp && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>WhatsApp: {medicoData.telefone_whatsapp}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Local da consulta */}
                  {consulta.local && (
                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Local do Atendimento
                        </h4>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">{consulta.local.nome_local}</p>
                          {consulta.local.endereco && (
                            <p className="text-muted-foreground">{consulta.local.endereco}</p>
                          )}
                          {(consulta.local.cidade || consulta.local.estado) && (
                            <p className="text-muted-foreground">
                              {consulta.local.cidade}{consulta.local.cidade && consulta.local.estado && " - "}{consulta.local.estado}
                            </p>
                          )}
                          <Badge variant="secondary" className="mt-2">
                            {consulta.local.tipo_atendimento === "online" ? "Online" : "Presencial"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Valores */}
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Valores do Médico</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor consulta padrão:</span>
                          <span>R$ {(medicoData.valor_consulta || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Percentual de repasse:</span>
                          <span>{medicoData.percentual_repasse || 70}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Dados do médico não disponíveis</p>
                </div>
              )}
            </TabsContent>
          )}

          {/* Aba Histórico - só em readOnly */}
          {readOnly && (
            <TabsContent value="historico" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Histórico de Eventos</Label>
                {eventos.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {eventos.map((evento) => (
                        <Card key={evento.id} className="bg-muted/50">
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {evento.tipo_evento}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    por {evento.usuario_tipo}
                                  </span>
                                </div>
                                {evento.descricao && (
                                  <p className="text-sm mt-1">{evento.descricao}</p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {evento.created_at && format(parseISO(evento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum evento registrado</p>
                  </div>
                )}
              </div>

              {/* Info adicional da consulta */}
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origem:</span>
                  <Badge variant={consulta.origem === "online" ? "default" : "secondary"}>
                    {consulta.origem === "online" ? "Online" : "Interna"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criada em:</span>
                  <span>{consulta.created_at && format(parseISO(consulta.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
                {consulta.asaas_payment_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID Pagamento Asaas:</span>
                    <span className="font-mono text-xs">{consulta.asaas_payment_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Médico:</span>
                  <span>R$ {(consulta.valor_medico || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Plataforma:</span>
                  <span>R$ {(consulta.valor_plataforma || 0).toFixed(2)}</span>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          {readOnly ? (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          ) : (
            <>
              {/* Delete button with confirmation */}
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2 w-full sm:w-auto">
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir consulta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível. A consulta será permanentemente excluída
                      e o horário será liberado na agenda.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="flex-1 sm:flex-initial"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-initial">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
