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
import { Badge } from "@/components/ui/badge";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  User, 
  Search, 
  ChevronDown, 
  Calendar,
  CalendarIcon,
  Lock,
  Plus,
  Percent,
  DollarSign,
  RotateCcw
} from "lucide-react";
import { maskPhone } from "@/lib/maskUtils";

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

interface OmniContato {
  id: string;
  nome: string;
  telefone: string;
  documento: string | null;
  email: string | null;
}

interface LocalAtendimento {
  id: string;
  nome_local: string;
  clinica_id?: string | null;
}

interface Convenio {
  id: string;
  nome: string;
}

interface Medico {
  id: string;
  nome: string;
  especialidade: string | null;
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
  medicos?: Medico[];
  clinicaId?: string;
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
  medicos = [],
  clinicaId,
  onSuccess,
}: AgendaInternaModalProps) {
  const isManualBooking = slotId.startsWith('manual-');
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [omniContatos, setOmniContatos] = useState<OmniContato[]>([]);
  const [historicoConsultas, setHistoricoConsultas] = useState<any[]>([]);
  const [useCpf, setUseCpf] = useState(true);
  const [hasDesconto, setHasDesconto] = useState(false);
  const [descontoTipo, setDescontoTipo] = useState<"valor" | "porcentagem">("valor");
  const [descontoValor, setDescontoValor] = useState(0);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [showNovoConvenio, setShowNovoConvenio] = useState(false);
  const [novoConvenioNome, setNovoConvenioNome] = useState("");
  
  // Duração da consulta em minutos
  const [duracaoMinutos, setDuracaoMinutos] = useState(30);
  
  // Estado para retorno 30 dias
  const [isRetornoElegivel, setIsRetornoElegivel] = useState(false);
  const [diasDesdeUltimaConsulta, setDiasDesdeUltimaConsulta] = useState<number | null>(null);
  
  // For manual booking date/time selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    slotDataHora ? new Date(slotDataHora) : new Date()
  );
  const [selectedTime, setSelectedTime] = useState(
    slotDataHora ? format(new Date(slotDataHora), "HH:mm") : "08:00"
  );

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    localSelecionado: localId || (locais.length > 0 ? locais[0].id : ""),
    tipoAtendimento: "particular",
    convenioId: "",
    medicoSelecionado: medicoId,
    status: "agendado",
    procedimento: "consulta",
    usuarioClinicaId: "",
    valor: valorConsulta,
    observacoes: "",
  });

  // Calculate final value with discount or return (retorno 30d = R$ 0)
  const calcularValorFinal = () => {
    // Se é retorno elegível (30 dias), valor é zero
    if (isRetornoElegivel && formData.procedimento === "retorno") {
      return 0;
    }
    
    if (!hasDesconto || descontoValor <= 0) return formData.valor;
    
    if (descontoTipo === "valor") {
      return Math.max(0, formData.valor - descontoValor);
    } else {
      const desconto = (formData.valor * descontoValor) / 100;
      return Math.max(0, formData.valor - desconto);
    }
  };

  const valorFinal = calcularValorFinal();
  const valorDesconto = formData.valor - valorFinal;

  useEffect(() => {
    if (open) {
      searchPacientes("");
      setFormData((prev) => ({
        ...prev,
        localSelecionado: localId || (locais.length > 0 ? locais[0].id : ""),
        valor: valorConsulta,
      }));
      // Always use the slotDataHora passed from parent (which contains the clicked date)
      if (slotDataHora) {
        const dateFromSlot = new Date(slotDataHora);
        setSelectedDate(dateFromSlot);
        setSelectedTime(format(dateFromSlot, "HH:mm"));
      } else {
        setSelectedDate(new Date());
        setSelectedTime("08:00");
      }
      fetchConvenios();
    }
  }, [open, localId, valorConsulta, locais, slotDataHora]);

  useEffect(() => {
    if (selectedPaciente) {
      fetchHistorico(selectedPaciente.id);
      checkRetornoEligibility(selectedPaciente.id);
    } else {
      setIsRetornoElegivel(false);
      setDiasDesdeUltimaConsulta(null);
    }
  }, [selectedPaciente, medicoId]);

  async function checkRetornoEligibility(pacienteId: string) {
    const trintaDiasAtras = subDays(new Date(), 30);
    
    // Buscar o clinica_id do local selecionado
    const localSelecionado = locais.find(l => l.id === formData.localSelecionado);
    const clinicaIdLocal = localSelecionado?.clinica_id || clinicaId;
    
    let query = supabase
      .from("consultas")
      .select("data_hora")
      .eq("paciente_id", pacienteId)
      .eq("medico_id", medicoId)
      .in("status_consulta", ["concluida", "atendida_medico"])
      .gte("data_hora", trintaDiasAtras.toISOString())
      .order("data_hora", { ascending: false })
      .limit(1);

    // Filtrar pela mesma clínica se disponível
    if (clinicaIdLocal) {
      query = query.eq("clinica_id", clinicaIdLocal);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      setIsRetornoElegivel(false);
      setDiasDesdeUltimaConsulta(null);
      return;
    }

    const ultimaConsultaDate = new Date(data[0].data_hora);
    const hoje = new Date();
    const dias = Math.floor(
      (hoje.getTime() - ultimaConsultaDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    setIsRetornoElegivel(true);
    setDiasDesdeUltimaConsulta(dias);
    
    // Auto-selecionar retorno se elegível
    setFormData(prev => ({ ...prev, procedimento: "retorno" }));
  }

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

  async function fetchConvenios() {
    if (!clinicaId) return;
    const { data } = await supabase
      .from("convenios" as any)
      .select("id, nome")
      .eq("clinica_id", clinicaId)
      .eq("ativo", true)
      .order("nome");
    setConvenios((data as unknown as Convenio[]) || []);
  }

  async function handleSaveConvenio() {
    if (!novoConvenioNome.trim() || !clinicaId) {
      toast.error("Nome do convênio é obrigatório");
      return;
    }

    const { data, error } = await supabase
      .from("convenios" as any)
      .insert({
        nome: novoConvenioNome.trim(),
        clinica_id: clinicaId,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao cadastrar convênio");
      return;
    }

    const newConvenio = data as unknown as Convenio;
    toast.success("Convênio cadastrado!");
    setConvenios([...convenios, newConvenio]);
    setFormData({ ...formData, convenioId: newConvenio.id });
    setNovoConvenioNome("");
    setShowNovoConvenio(false);
  }

  async function searchPacientes(term: string) {
    // Search patients
    const query = supabase
      .from("pacientes")
      .select("id, nome, telefone, cpf")
      .order("nome");

    if (term) {
      query.or(`nome.ilike.%${term}%,telefone.ilike.%${term}%,cpf.ilike.%${term}%`);
    }

    const { data } = await query.limit(10);
    setPacientes(data || []);

    // Also search omni_contatos if clinicaId is available
    if (clinicaId && term && term.length >= 2) {
      const phoneQuery = term.replace(/\D/g, "");
      let contatosQuery = supabase
        .from("omni_contatos")
        .select("id, nome, telefone, documento, email")
        .eq("clinica_id", clinicaId);

      if (phoneQuery.length >= 4) {
        contatosQuery = contatosQuery.ilike("telefone", `%${phoneQuery}%`);
      } else {
        contatosQuery = contatosQuery.ilike("nome", `%${term}%`);
      }

      const { data: contatosData } = await contatosQuery.limit(5);
      setOmniContatos(contatosData || []);
    } else {
      setOmniContatos([]);
    }
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    searchPacientes(value);
  }

  function selectContato(contato: OmniContato) {
    setSelectedPaciente(null);
    setShowNewPatient(true);
    setFormData({
      ...formData,
      nome: contato.nome,
      telefone: contato.telefone || "",
      cpf: contato.documento || "",
    });
    setOmniContatos([]);
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
      localSelecionado: localId || (locais.length > 0 ? locais[0].id : ""),
      tipoAtendimento: "particular",
      convenioId: "",
      medicoSelecionado: medicoId,
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
    setDescontoValor(0);
    setIsRetornoElegivel(false);
    setDiasDesdeUltimaConsulta(null);
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

    if (!formData.localSelecionado) {
      toast.error("Selecione um local de atendimento");
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

      // Calculate values using the discounted final value
      const valorFinalConsulta = calcularValorFinal();
      const valorMedico = (valorFinalConsulta * percentualRepasse) / 100;
      const valorPlataforma = valorFinalConsulta - valorMedico;

      // Get the final date/time
      let finalDataHora: string;
      let finalSlotId: string | null = null;

      if (isManualBooking) {
        // Manual booking - create the slot first or use date directly
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const dateTime = new Date(selectedDate!);
        dateTime.setHours(hours, minutes, 0, 0);
        finalDataHora = dateTime.toISOString();

        // Check if a slot already exists for this time/location
        const { data: existingSlot } = await supabase
          .from("agenda_slots")
          .select("id, disponivel")
          .eq("medico_id", medicoId)
          .eq("local_id", formData.localSelecionado)
          .eq("data_hora", finalDataHora)
          .maybeSingle();

        if (existingSlot) {
          if (!existingSlot.disponivel) {
            throw new Error("Este horário já está ocupado");
          }
          finalSlotId = existingSlot.id;
        } else {
          // Create new slot
          const { data: newSlot, error: slotError } = await supabase
            .from("agenda_slots")
            .insert({
              medico_id: medicoId,
              local_id: formData.localSelecionado,
              data_hora: finalDataHora,
              disponivel: false,
            })
            .select()
            .single();

          if (slotError) {
            throw new Error("Erro ao criar horário");
          }
          finalSlotId = newSlot.id;
        }
      } else {
        finalDataHora = slotDataHora;
        finalSlotId = slotId;
      }

      // Get clinica_id from the selected local if not provided directly
      let finalClinicaId = clinicaId || null;
      if (!finalClinicaId && formData.localSelecionado) {
        const { data: localData } = await supabase
          .from("locais_atendimento")
          .select("clinica_id")
          .eq("id", formData.localSelecionado)
          .maybeSingle();
        finalClinicaId = localData?.clinica_id || null;
      }

      // Create consultation
      const { error: consultaError } = await supabase.from("consultas").insert({
        medico_id: formData.medicoSelecionado || medicoId,
        paciente_id: pacienteId,
        data_hora: finalDataHora,
        origem: "interna",
        status_consulta: formData.status === "agendado" ? "agendada" : formData.status,
        status_pagamento: "pendente",
        valor_consulta: valorFinalConsulta,
        valor_medico: valorMedico,
        valor_plataforma: valorPlataforma,
        agenda_slot_id: finalSlotId,
        local_id: formData.localSelecionado,
        clinica_id: finalClinicaId,
        usuario_clinica_id: formData.usuarioClinicaId || null,
        nome_paciente_consulta: formData.nome,
        tipo_servico: formData.procedimento,
        observacoes_paciente: formData.observacoes || null,
        tipo_atendimento: formData.tipoAtendimento,
        convenio_id: formData.tipoAtendimento === "convenio" && formData.convenioId ? formData.convenioId : null,
      } as any);

      if (consultaError) {
        throw new Error("Erro ao criar consulta");
      }

      // Mark slot as unavailable (if not already)
      if (finalSlotId && !isManualBooking) {
        await supabase
          .from("agenda_slots")
          .update({ disponivel: false })
          .eq("id", finalSlotId);
      }

      // Enviar notificação WhatsApp automática (fire & forget)
      if (formData.telefone && finalClinicaId) {
        const medicoSel = medicos.find(m => m.id === (formData.medicoSelecionado || medicoId));
        const localSel = locais.find(l => l.id === formData.localSelecionado);
        supabase.functions.invoke("notify-appointment-booked", {
          body: {
            clinica_id: finalClinicaId,
            paciente_nome: formData.nome,
            paciente_telefone: formData.telefone,
            data_hora: finalDataHora,
            medico_nome: medicoSel?.nome || "",
            local_nome: localSel?.nome_local || "",
          },
        }).then(res => {
          if (res.data?.success) {
            toast.info("Aviso enviado ao paciente via WhatsApp");
          }
        }).catch(() => { /* silencioso */ });
      }

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

  const dataFormatada = isManualBooking 
    ? (selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione")
    : (slotDataHora ? format(parseISO(slotDataHora), "dd/MM/yyyy", { locale: ptBR }) : "");

  const horaInicial = isManualBooking 
    ? selectedTime 
    : (slotDataHora ? format(parseISO(slotDataHora), "HH:mm", { locale: ptBR }) : "");

  // Generate time options based on selected duration
  const timeOptions = [];
  for (let h = 6; h < 22; h++) {
    for (let m = 0; m < 60; m += 5) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  // Calculate hora final based on duration
  const calcularHoraFinal = () => {
    const baseTime = isManualBooking 
      ? (() => { const [hh, mm] = selectedTime.split(':').map(Number); const d = new Date(selectedDate!); d.setHours(hh, mm, 0, 0); return d; })()
      : (slotDataHora ? new Date(slotDataHora) : null);
    if (!baseTime) return "";
    return format(new Date(baseTime.getTime() + duracaoMinutos * 60000), "HH:mm");
  };

  const horaFinal = calcularHoraFinal();

  const duracaoOptions = [5, 10, 15, 20, 30, 45, 60];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
        <DialogHeader className="bg-primary/10 -mx-6 -mt-6 px-6 py-3 sm:py-4 rounded-t-lg">
          <DialogTitle className="text-primary flex items-center gap-2 text-sm sm:text-base">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            {isManualBooking ? "Novo Agendamento" : `Novo agendamento para ${dataFormatada}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-5 pt-3 sm:pt-4">
          {/* Row 1: Patient search + Local */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
            <div className="sm:col-span-6">
              <div className="flex items-center gap-2 mb-1.5">
                <Label className="text-xs sm:text-sm">Paciente</Label>
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
                      placeholder="Nome, telefone ou CPF..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 h-9 text-sm"
                    />
                  </div>

                  {pacientes.length > 0 && searchTerm && (
                    <div className="border rounded-lg max-h-32 overflow-y-auto bg-background shadow-lg">
                      {pacientes.map((paciente) => (
                        <button
                          key={paciente.id}
                          type="button"
                          className="w-full p-2 text-left hover:bg-muted transition-colors border-b last:border-b-0 text-sm"
                          onClick={() => selectPaciente(paciente)}
                        >
                          <p className="font-medium">{paciente.nome}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {maskPhone(paciente.telefone)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Contatos do Omnichannel */}
                  {omniContatos.length > 0 && searchTerm && (
                    <div className="border rounded-lg max-h-32 overflow-y-auto bg-background shadow-lg border-primary/30">
                      <div className="px-2 py-1 bg-primary/10 text-xs font-medium text-primary">
                        Contatos Cadastrados
                      </div>
                      {omniContatos.map((contato) => (
                        <button
                          key={contato.id}
                          type="button"
                          className="w-full p-2 text-left hover:bg-muted transition-colors border-b last:border-b-0 text-sm"
                          onClick={() => selectContato(contato)}
                        >
                          <p className="font-medium">{contato.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {contato.telefone} {contato.email && `• ${contato.email}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
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
                    type="button"
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

            <div className="sm:col-span-6">
              <Label className="text-xs sm:text-sm mb-1.5 block">Local</Label>
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
          </div>

          {/* Row 2: Date + Times (for manual booking) or Professional + Times */}
          <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4">
            {isManualBooking ? (
              <>
                <div className="col-span-2 sm:col-span-5">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-9 justify-start text-left font-normal text-sm",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Hora</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Duração</Label>
                  <Select value={String(duracaoMinutos)} onValueChange={(v) => setDuracaoMinutos(Number(v))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {duracaoOptions.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1 sm:col-span-3">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Agendado por</Label>
                  <Select
                    value={formData.usuarioClinicaId}
                    onValueChange={(v) => setFormData({ ...formData, usuarioClinicaId: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosClinica.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id}>
                          {usuario.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2 sm:col-span-5">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Agendado por</Label>
                  <Select
                    value={formData.usuarioClinicaId}
                    onValueChange={(v) => setFormData({ ...formData, usuarioClinicaId: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione..." />
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

                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Hora inicial</Label>
                  <div className="bg-primary text-primary-foreground rounded-md h-9 flex items-center justify-center text-xs sm:text-sm font-medium">
                    {horaInicial}
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Hora final</Label>
                  <div className="bg-primary text-primary-foreground rounded-md h-9 flex items-center justify-center text-xs sm:text-sm font-medium">
                    {horaFinal}
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-3">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Duração</Label>
                  <Select value={String(duracaoMinutos)} onValueChange={(v) => setDuracaoMinutos(Number(v))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {duracaoOptions.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Row 3: Status + Procedure */}
          <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4">
            <div className="col-span-1 sm:col-span-5">
              <Label className="text-xs sm:text-sm mb-1.5 block">Status</Label>
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

            <div className="col-span-1 sm:col-span-7">
              <div className="flex items-center gap-2 mb-1.5">
                <Label className="text-xs sm:text-sm">Procedimento</Label>
                {isRetornoElegivel && (
                  <Badge className="bg-green-600 text-white text-[10px] gap-1 px-1.5 py-0.5">
                    <RotateCcw className="w-2.5 h-2.5" />
                    Retorno 30d (R$ 0)
                  </Badge>
                )}
              </div>
              <Select
                value={formData.procedimento}
                onValueChange={(v) => {
                  // Bloquear seleção de retorno se não for elegível
                  if (v === "retorno" && !isRetornoElegivel) {
                    toast.error("Paciente não elegível para retorno", {
                      description: "O paciente não possui consulta concluída nos últimos 30 dias com este médico nesta clínica."
                    });
                    return;
                  }
                  setFormData({ ...formData, procedimento: v });
                }}
              >
                <SelectTrigger className={cn(
                  "h-9 text-sm",
                  isRetornoElegivel && formData.procedimento === "retorno" && "border-green-500 bg-green-50 dark:bg-green-950"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem 
                    value="retorno"
                    className={!isRetornoElegivel ? "text-muted-foreground" : ""}
                  >
                    <span className="flex items-center gap-2">
                      Retorno
                      {isRetornoElegivel ? (
                        <span className="text-green-600 text-xs">(elegível - R$ 0)</span>
                      ) : (
                        <span className="text-destructive text-xs">(não elegível)</span>
                      )}
                    </span>
                  </SelectItem>
                  <SelectItem value="exame">Exame</SelectItem>
                  <SelectItem value="procedimento">Procedimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Aviso de retorno elegível */}
          {isRetornoElegivel && formData.procedimento === "retorno" && (
            <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-green-600" />
                <div className="text-sm">
                  <span className="font-medium text-green-700 dark:text-green-400">Retorno gratuito!</span>
                  <span className="text-green-600 dark:text-green-500 ml-2">
                    Última consulta há {diasDesdeUltimaConsulta} dia(s) — dentro do prazo de 30 dias
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Row 4: Service Type + Convenio + Medico */}
          <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4">
            <div className="col-span-1 sm:col-span-4">
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-xs sm:text-sm">Tipo de atend.</Label>
                <span className="text-destructive">*</span>
              </div>
              <Select
                value={formData.tipoAtendimento}
                onValueChange={(v) => {
                  setFormData({ ...formData, tipoAtendimento: v, convenioId: "" });
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="convenio">Convênio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipoAtendimento === "convenio" && (
              <div className="col-span-1 sm:col-span-4">
                <Label className="text-xs sm:text-sm mb-1.5 block">Tipo de convênio</Label>
                <div className="flex gap-1">
                  <Select
                    value={formData.convenioId}
                    onValueChange={(v) => setFormData({ ...formData, convenioId: v })}
                  >
                    <SelectTrigger className="h-9 text-sm flex-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {convenios.map((conv) => (
                        <SelectItem key={conv.id} value={conv.id}>
                          {conv.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setShowNovoConvenio(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className={cn(
              formData.tipoAtendimento === "convenio" ? "col-span-2 sm:col-span-4" : "col-span-1 sm:col-span-8"
            )}>
              <Label className="text-xs sm:text-sm mb-1.5 block">Médico</Label>
              <Select
                value={formData.medicoSelecionado}
                onValueChange={(v) => setFormData({ ...formData, medicoSelecionado: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {medicos.length > 0 ? (
                    medicos.map((med) => (
                      <SelectItem key={med.id} value={med.id}>
                        {med.nome} {med.especialidade ? `- ${med.especialidade}` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={medicoId}>Médico atual</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Value + Discount */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <div className="col-span-5 sm:col-span-4">
              <Label className="text-xs sm:text-sm mb-1.5 block">Valor</Label>
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

            <div className="col-span-3 sm:col-span-2 flex flex-col items-center justify-end">
              <Label className="text-xs sm:text-sm mb-1.5">Desconto</Label>
              <Switch 
                checked={hasDesconto} 
                onCheckedChange={(checked) => {
                  setHasDesconto(checked);
                  if (!checked) setDescontoValor(0);
                }}
              />
            </div>

            {hasDesconto && (
              <>
                <div className="col-span-4 sm:col-span-3">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Tipo</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant={descontoTipo === "valor" ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-9 px-2"
                      onClick={() => setDescontoTipo("valor")}
                    >
                      <DollarSign className="w-3 h-3" />
                      <span className="hidden sm:inline ml-1">R$</span>
                    </Button>
                    <Button
                      type="button"
                      variant={descontoTipo === "porcentagem" ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-9 px-2"
                      onClick={() => setDescontoTipo("porcentagem")}
                    >
                      <Percent className="w-3 h-3" />
                      <span className="hidden sm:inline ml-1">%</span>
                    </Button>
                  </div>
                </div>

                <div className="col-span-8 sm:col-span-3">
                  <Label className="text-xs sm:text-sm mb-1.5 block">
                    {descontoTipo === "valor" ? "Valor desc." : "% do desc."}
                  </Label>
                  <Input
                    type="number"
                    value={descontoValor || ""}
                    onChange={(e) => setDescontoValor(parseFloat(e.target.value) || 0)}
                    placeholder={descontoTipo === "valor" ? "0,00" : "0"}
                    className="h-9 text-sm"
                    min={0}
                    max={descontoTipo === "porcentagem" ? 100 : formData.valor}
                  />
                </div>
              </>
            )}
          </div>

          {/* Display final value with discount */}
          {hasDesconto && descontoValor > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Valor original:</span>
                    <span className="ml-2 line-through text-muted-foreground">
                      R$ {formData.valor.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span className="ml-2 text-destructive font-medium">
                      - R$ {valorDesconto.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
                <div className="text-sm sm:text-base font-semibold text-primary">
                  Valor final: R$ {valorFinal.toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>
          )}

          {/* Modal Novo Convênio */}
          <Dialog open={showNovoConvenio} onOpenChange={setShowNovoConvenio}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Convênio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-1.5 block">Nome do Convênio</Label>
                  <Input
                    value={novoConvenioNome}
                    onChange={(e) => setNovoConvenioNome(e.target.value)}
                    placeholder="Ex: Unimed, Bradesco Saúde..."
                    className="h-9"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNovoConvenio(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveConvenio}>
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Row 5: CPF + Phone (for new patient) */}
          {(showNewPatient || !selectedPaciente) && (selectedPaciente === null || showNewPatient) && (
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-3 sm:col-span-2 flex flex-col">
                <Label className="text-xs sm:text-sm mb-1.5">Sem CPF?</Label>
                <Switch 
                  checked={!useCpf}
                  onCheckedChange={(v) => setUseCpf(!v)}
                />
              </div>

              <div className="col-span-9 sm:col-span-4">
                <Label className="text-xs sm:text-sm mb-1.5 block">CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  disabled={!useCpf}
                  placeholder="___.___.___-__"
                  className="h-9 text-sm"
                />
              </div>

              <div className="col-span-12 sm:col-span-6">
                <Label className="text-xs sm:text-sm mb-1.5 block">Telefone Celular *</Label>
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
                    placeholder="(__) _____-____"
                    className="h-9 text-sm flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Observations */}
          <div>
            <Label className="text-xs sm:text-sm mb-1.5 block">Observações do Agendamento</Label>
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
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
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
