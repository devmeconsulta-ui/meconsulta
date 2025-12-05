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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  User, 
  Search, 
  MapPin, 
  Clock, 
  ChevronDown, 
  Calendar,
  Phone,
  FileText,
  Building2
} from "lucide-react";

interface UsuarioClinica {
  id: string;
  nome: string;
  papel: string;
}

interface Paciente {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
}

interface LocalAtendimento {
  id: string;
  nome_local: string;
}

interface AgendaInternaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotId: string;
  slotDataHora: string;
  localId: string;
  localNome: string;
  medicoId: string;
  valorConsulta: number;
  percentualRepasse: number;
  usuariosClinica: UsuarioClinica[];
  locais: LocalAtendimento[];
  onSuccess: () => void;
}

export function AgendaInternaModal({
  open,
  onOpenChange,
  slotId,
  slotDataHora,
  localId,
  localNome,
  medicoId,
  valorConsulta,
  percentualRepasse,
  usuariosClinica,
  locais,
  onSuccess,
}: AgendaInternaModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [historicoConsultas, setHistoricoConsultas] = useState<any[]>([]);
  const [useCpf, setUseCpf] = useState(true);
  const [hasDesconto, setHasDesconto] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    localSelecionado: localId,
    tipoAtendimento: "presencial",
    status: "agendado",
    procedimento: "consulta",
    usuarioClinicaId: "",
    valor: valorConsulta,
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      searchPacientes("");
      setFormData((prev) => ({
        ...prev,
        localSelecionado: localId,
        valor: valorConsulta,
      }));
    }
  }, [open, localId, valorConsulta]);

  useEffect(() => {
    if (selectedPaciente) {
      fetchHistorico(selectedPaciente.id);
    }
  }, [selectedPaciente]);

  async function fetchHistorico(pacienteId: string) {
    const { data } = await supabase
      .from("consultas")
      .select("id, data_hora, status_consulta, origem")
      .eq("paciente_id", pacienteId)
      .eq("medico_id", medicoId)
      .order("data_hora", { ascending: false })
      .limit(5);
    
    setHistoricoConsultas(data || []);
  }

  async function searchPacientes(term: string) {
    const query = supabase
      .from("pacientes")
      .select("id, nome, telefone, cpf")
      .order("nome");

    if (term) {
      query.or(`nome.ilike.%${term}%,telefone.ilike.%${term}%,cpf.ilike.%${term}%`);
    }

    const { data } = await query.limit(10);
    setPacientes(data || []);
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    searchPacientes(value);
  }

  function selectPaciente(paciente: Paciente) {
    setSelectedPaciente(paciente);
    setShowNewPatient(false);
    setFormData({
      ...formData,
      nome: paciente.nome,
      telefone: paciente.telefone || "",
      cpf: paciente.cpf || "",
    });
  }

  function handleNewPatient() {
    setSelectedPaciente(null);
    setShowNewPatient(true);
    setFormData({
      ...formData,
      nome: searchTerm,
      telefone: "",
      cpf: "",
    });
  }

  function resetForm() {
    setFormData({
      nome: "",
      telefone: "",
      cpf: "",
      localSelecionado: localId,
      tipoAtendimento: "presencial",
      status: "agendado",
      procedimento: "consulta",
      usuarioClinicaId: "",
      valor: valorConsulta,
      observacoes: "",
    });
    setSelectedPaciente(null);
    setShowNewPatient(false);
    setSearchTerm("");
    setHistoricoConsultas([]);
    setHasDesconto(false);
  }

  async function handleSubmit() {
    if (!formData.nome.trim()) {
      toast.error("Nome do paciente é obrigatório");
      return;
    }

    if (!formData.telefone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }

    setLoading(true);

    try {
      let pacienteId = selectedPaciente?.id;

      // Create new patient if needed
      if (!pacienteId) {
        const { data: newPaciente, error: pacienteError } = await supabase
          .from("pacientes")
          .insert({
            nome: formData.nome,
            telefone: formData.telefone,
            cpf: useCpf && formData.cpf ? formData.cpf : null,
          })
          .select()
          .single();

        if (pacienteError) {
          throw new Error("Erro ao criar paciente");
        }

        pacienteId = newPaciente.id;
      }

      // Calculate values
      const valorFinal = formData.valor;
      const valorMedico = (valorFinal * percentualRepasse) / 100;
      const valorPlataforma = valorFinal - valorMedico;

      // Create consultation
      const { error: consultaError } = await supabase.from("consultas").insert({
        medico_id: medicoId,
        paciente_id: pacienteId,
        data_hora: slotDataHora,
        origem: "interna",
        status_consulta: formData.status === "agendado" ? "confirmada" : formData.status,
        status_pagamento: "pendente",
        valor_consulta: valorFinal,
        valor_medico: valorMedico,
        valor_plataforma: valorPlataforma,
        agenda_slot_id: slotId,
        usuario_clinica_id: formData.usuarioClinicaId || null,
        nome_paciente_consulta: formData.nome,
        tipo_servico: formData.procedimento,
        observacoes_paciente: formData.observacoes || null,
      });

      if (consultaError) {
        throw new Error("Erro ao criar consulta");
      }

      // Mark slot as unavailable
      await supabase
        .from("agenda_slots")
        .update({ disponivel: false })
        .eq("id", slotId);

      toast.success("Consulta agendada com sucesso!");
      onOpenChange(false);
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Erro ao agendar consulta");
    } finally {
      setLoading(false);
    }
  }

  const dataFormatada = slotDataHora 
    ? format(parseISO(slotDataHora), "dd/MM/yyyy", { locale: ptBR })
    : "";

  const horaInicial = slotDataHora
    ? format(parseISO(slotDataHora), "HH:mm", { locale: ptBR })
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-primary/10 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Novo agendamento para {dataFormatada}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {/* Row 1: Patient search + Local + Blocked */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Label className="text-sm">Paciente</Label>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input 
                    type="checkbox" 
                    checked={useCpf}
                    onChange={(e) => setUseCpf(e.target.checked)}
                    className="w-3 h-3"
                  />
                  CPF?
                </div>
              </div>
              
              {!selectedPaciente && !showNewPatient ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome, código ou data de nascimento..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 h-9 text-sm"
                    />
                  </div>

                  {pacientes.length > 0 && searchTerm && (
                    <div className="border rounded-lg max-h-32 overflow-y-auto absolute z-10 bg-background w-full shadow-lg">
                      {pacientes.map((paciente) => (
                        <button
                          key={paciente.id}
                          className="w-full p-2 text-left hover:bg-muted transition-colors border-b last:border-b-0 text-sm"
                          onClick={() => selectPaciente(paciente)}
                        >
                          <p className="font-medium">{paciente.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {paciente.telefone || "Sem telefone"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleNewPatient}
                  >
                    <User className="w-3 h-3 mr-1" />
                    Novo Paciente
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    disabled={!!selectedPaciente}
                    className="h-9 text-sm"
                    placeholder="Nome do paciente"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPaciente(null);
                      setShowNewPatient(false);
                      setSearchTerm("");
                    }}
                    className="text-xs px-2"
                  >
                    Trocar
                  </Button>
                </div>
              )}
            </div>

            <div className="col-span-4">
              <Label className="text-sm mb-1.5 block">Local</Label>
              <Select
                value={formData.localSelecionado}
                onValueChange={(v) => setFormData({ ...formData, localSelecionado: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {locais.map((local) => (
                    <SelectItem key={local.id} value={local.id}>
                      {local.nome_local}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-3 flex flex-col items-center justify-end">
              <Label className="text-sm mb-1.5">Bloqueado</Label>
              <Switch disabled />
            </div>
          </div>

          {/* Row 2: Professional + Times */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <Label className="text-sm mb-1.5 block">Profissional</Label>
              <Select
                value={formData.usuarioClinicaId}
                onValueChange={(v) => setFormData({ ...formData, usuarioClinicaId: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione quem está agendando" />
                </SelectTrigger>
                <SelectContent>
                  {usuariosClinica.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome} ({usuario.papel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-3">
              <Label className="text-sm mb-1.5 block">Hora inicial</Label>
              <div className="bg-primary text-primary-foreground rounded-md h-9 flex items-center justify-center text-sm font-medium">
                {horaInicial}
              </div>
            </div>

            <div className="col-span-4">
              <Label className="text-sm mb-1.5 block">Hora final</Label>
              <div className="bg-primary text-primary-foreground rounded-md h-9 flex items-center justify-center text-sm font-medium">
                {/* Assuming 30min slot duration */}
                {slotDataHora ? format(new Date(new Date(slotDataHora).getTime() + 30 * 60000), "HH:mm") : ""}
              </div>
            </div>
          </div>

          {/* Row 3: Status + Repetition */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <Label className="text-sm mb-1.5 block">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="confirmada">Confirmado</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-7 flex items-end gap-2">
              <Label className="text-sm">Repetição</Label>
              <Switch disabled />
            </div>
          </div>

          {/* Row 4: Procedure + Service Type */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <Label className="text-sm mb-1.5 block">Procedimento</Label>
              <Select
                value={formData.procedimento}
                onValueChange={(v) => setFormData({ ...formData, procedimento: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                  <SelectItem value="exame">Exame</SelectItem>
                  <SelectItem value="procedimento">Procedimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-7">
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-sm">Tipo de atendimento</Label>
                <span className="text-destructive">*</span>
              </div>
              <Select
                value={formData.tipoAtendimento}
                onValueChange={(v) => setFormData({ ...formData, tipoAtendimento: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="telemedicina">Telemedicina</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Insurance + Value + Discount */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <Label className="text-sm mb-1.5 block">Convênio do paciente</Label>
              <Select>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o convênio..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="unimed">Unimed</SelectItem>
                  <SelectItem value="bradesco">Bradesco Saúde</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-4">
              <Label className="text-sm mb-1.5 block">Valor</Label>
              <Input
                type="text"
                value={`R$ ${formData.valor.toFixed(2).replace(".", ",")}`}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d,]/g, "").replace(",", ".");
                  setFormData({ ...formData, valor: parseFloat(val) || 0 });
                }}
                className="h-9 text-sm"
              />
            </div>

            <div className="col-span-3 flex flex-col items-center justify-end">
              <Label className="text-sm mb-1.5">Desconto</Label>
              <Switch 
                checked={hasDesconto} 
                onCheckedChange={setHasDesconto}
              />
            </div>
          </div>

          {/* Row 6: CPF toggle + CPF + Phone */}
          {(showNewPatient || !selectedPaciente) && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2 flex flex-col">
                <Label className="text-sm mb-1.5">Não tem CPF?</Label>
                <Switch 
                  checked={!useCpf}
                  onCheckedChange={(v) => setUseCpf(!v)}
                />
              </div>

              <div className="col-span-4">
                <Label className="text-sm mb-1.5 block">CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  disabled={!useCpf || !!selectedPaciente}
                  placeholder="___.___.___-__"
                  className="h-9 text-sm"
                />
              </div>

              <div className="col-span-6">
                <Label className="text-sm mb-1.5 block">Telefone Celular</Label>
                <div className="flex gap-2">
                  <Select defaultValue="+55">
                    <SelectTrigger className="h-9 text-sm w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+55">+55</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    disabled={!!selectedPaciente}
                    placeholder="(__) _____-____"
                    className="h-9 text-sm flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Observations */}
          <div>
            <Label className="text-sm mb-1.5 block">Observações do Agendamento</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações sobre o agendamento..."
              className="min-h-[80px] text-sm resize-none"
              maxLength={3500}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              Restam {3500 - formData.observacoes.length} caracteres.
            </p>
          </div>

          {/* Appointment History */}
          {selectedPaciente && historicoConsultas.length > 0 && (
            <Collapsible open={showHistorico} onOpenChange={setShowHistorico}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                <span className="text-sm font-medium">Histórico de Agendamentos</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showHistorico ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {historicoConsultas.map((consulta) => (
                    <div key={consulta.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <span>{format(parseISO(consulta.data_hora), "dd/MM/yyyy HH:mm")}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        consulta.status_consulta === "confirmada" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : consulta.status_consulta === "cancelada"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {consulta.status_consulta}
                      </span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-4 pt-2">
            <Button
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (!selectedPaciente && !showNewPatient)}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? "Agendando..." : "Cadastrar horário"}
              <Calendar className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
