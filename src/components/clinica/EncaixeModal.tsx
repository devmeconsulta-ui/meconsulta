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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, UserPlus, Search, RotateCcw } from "lucide-react";
import { format, parseISO, setHours, setMinutes, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { maskPhone, maskCPF } from "@/lib/maskUtils";

interface EncaixeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  medicos: Array<{ id: string; nome: string; valor_consulta: number; percentual_repasse: number }>;
  locais: Array<{ id: string; nome_local: string; medico_id: string }>;
  onSuccess: () => void;
}

export function EncaixeModal({
  open,
  onOpenChange,
  clinicaId,
  medicos,
  locais,
  onSuccess,
}: EncaixeModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchPaciente, setSearchPaciente] = useState("");
  const [pacientesBusca, setPacientesBusca] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isNewPaciente, setIsNewPaciente] = useState(false);
  
  // Estado para retorno 30 dias
  const [isRetornoElegivel, setIsRetornoElegivel] = useState(false);
  const [diasDesdeUltimaConsulta, setDiasDesdeUltimaConsulta] = useState<number | null>(null);

  const [form, setForm] = useState({
    medicoId: "",
    localId: "",
    data: undefined as Date | undefined,
    hora: "",
    minuto: "",
    pacienteId: "",
    pacienteNome: "",
    pacienteTelefone: "",
    pacienteCpf: "",
    motivo: "",
    procedimento: "consulta" as "consulta" | "retorno" | "exame" | "procedimento",
  });

  // Generate time options
  const horaOptions = Array.from({ length: 17 }, (_, i) => (i + 6).toString().padStart(2, "0"));
  const minutoOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  // Filter locais by selected medico
  const filteredLocais = form.medicoId 
    ? locais.filter(l => l.medico_id === form.medicoId)
    : [];

  async function searchPacientes(query: string) {
    if (query.length < 2) {
      setPacientesBusca([]);
      return;
    }

    setSearchLoading(true);
    const { data } = await supabase
      .from("pacientes")
      .select("id, nome, telefone, cpf")
      .or(`nome.ilike.%${query}%,cpf.ilike.%${query}%`)
      .limit(5);

    setPacientesBusca(data || []);
    setSearchLoading(false);
  }

  function selectPaciente(paciente: any) {
    setForm({
      ...form,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      pacienteTelefone: paciente.telefone || "",
      pacienteCpf: paciente.cpf || "",
    });
    setIsNewPaciente(false);
    setPacientesBusca([]);
    setSearchPaciente("");
    
    // Verificar elegibilidade de retorno se tiver médico selecionado
    if (form.medicoId) {
      checkRetornoEligibility(paciente.id, form.medicoId);
    }
  }

  async function checkRetornoEligibility(pacienteId: string, medicoId: string) {
    const trintaDiasAtras = subDays(new Date(), 30);
    
    let query = supabase
      .from("consultas")
      .select("data_hora")
      .eq("paciente_id", pacienteId)
      .eq("medico_id", medicoId)
      .eq("clinica_id", clinicaId) // Retorno só vale na mesma clínica
      .in("status_consulta", ["concluida", "atendida_medico"])
      .gte("data_hora", trintaDiasAtras.toISOString())
      .order("data_hora", { ascending: false })
      .limit(1);

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
    setForm(prev => ({ ...prev, procedimento: "retorno" }));
  }

  // Re-verificar elegibilidade quando o médico mudar
  useEffect(() => {
    if (form.medicoId && form.pacienteId) {
      checkRetornoEligibility(form.pacienteId, form.medicoId);
    } else {
      setIsRetornoElegivel(false);
      setDiasDesdeUltimaConsulta(null);
    }
  }, [form.medicoId, form.pacienteId]);

  async function handleSubmit() {
    if (!form.medicoId) {
      toast.error("Selecione um médico");
      return;
    }
    if (!form.localId) {
      toast.error("Selecione um local");
      return;
    }
    if (!form.data || !form.hora || !form.minuto) {
      toast.error("Selecione data e horário");
      return;
    }
    if (!form.pacienteNome.trim()) {
      toast.error("Informe o nome do paciente");
      return;
    }

    setLoading(true);

    try {
      const medico = medicos.find(m => m.id === form.medicoId);
      if (!medico) throw new Error("Médico não encontrado");

      // Build date time
      let dataHora = form.data;
      dataHora = setHours(dataHora, parseInt(form.hora));
      dataHora = setMinutes(dataHora, parseInt(form.minuto));

      // Check if slot already exists at this time
      const { data: existingSlot } = await supabase
        .from("agenda_slots")
        .select("id")
        .eq("medico_id", form.medicoId)
        .eq("local_id", form.localId)
        .eq("data_hora", dataHora.toISOString())
        .maybeSingle();

      if (existingSlot) {
        toast.error("Já existe um horário neste momento. Escolha outro horário.");
        setLoading(false);
        return;
      }

      // Create paciente if new
      let pacienteId = form.pacienteId || null;
      if (isNewPaciente && !pacienteId) {
        const { data: newPaciente, error: pacError } = await supabase
          .from("pacientes")
          .insert({
            nome: form.pacienteNome,
            telefone: form.pacienteTelefone || null,
            cpf: form.pacienteCpf || null,
          })
          .select("id")
          .single();

        if (pacError) throw pacError;
        pacienteId = newPaciente.id;
      }

      // Create the encaixe slot (marked as tipo_slot = 'encaixe')
      const { data: newSlot, error: slotError } = await supabase
        .from("agenda_slots")
        .insert({
          medico_id: form.medicoId,
          local_id: form.localId,
          data_hora: dataHora.toISOString(),
          disponivel: false,
          tipo_slot: "encaixe",
        })
        .select("id")
        .single();

      if (slotError) throw slotError;

      // Calculate values - se é retorno elegível, valor é zero
      const isRetornoGratuito = isRetornoElegivel && form.procedimento === "retorno";
      const valorConsulta = isRetornoGratuito ? 0 : (medico.valor_consulta || 0);
      const percentualRepasse = medico.percentual_repasse || 70;
      const valorMedico = (valorConsulta * percentualRepasse) / 100;
      const valorPlataforma = valorConsulta - valorMedico;

      // Create consulta
      const { error: consultaError } = await supabase.from("consultas").insert({
        medico_id: form.medicoId,
        local_id: form.localId,
        clinica_id: clinicaId,
        paciente_id: pacienteId,
        agenda_slot_id: newSlot.id,
        data_hora: dataHora.toISOString(),
        nome_paciente_consulta: form.pacienteNome,
        origem: "interna",
        status_consulta: "confirmada",
        status_pagamento: isRetornoGratuito ? "pago" : "pendente",
        valor_consulta: valorConsulta,
        valor_medico: valorMedico,
        valor_plataforma: valorPlataforma,
        motivo_consulta: form.motivo || null,
        tipo_atendimento: "particular",
        tipo_servico: form.procedimento,
      });

      if (consultaError) throw consultaError;

      // Enviar notificação WhatsApp automática (fire & forget)
      const telefoneNotif = form.pacienteTelefone || "";
      if (telefoneNotif && clinicaId) {
        const localSel = locais.find(l => l.id === form.localId);
        supabase.functions.invoke("notify-appointment-booked", {
          body: {
            clinica_id: clinicaId,
            paciente_nome: form.pacienteNome,
            paciente_telefone: telefoneNotif,
            data_hora: dataHora.toISOString(),
            medico_nome: medico.nome || "",
            local_nome: localSel?.nome_local || "",
          },
        }).then(res => {
          if (res.data?.success) {
            toast.info("Aviso enviado ao paciente via WhatsApp");
          }
        }).catch(() => { /* silencioso */ });
      }

      toast.success("Encaixe criado com sucesso!");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar encaixe");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      medicoId: "",
      localId: "",
      data: undefined,
      hora: "",
      minuto: "",
      pacienteId: "",
      pacienteNome: "",
      pacienteTelefone: "",
      pacienteCpf: "",
      motivo: "",
      procedimento: "consulta",
    });
    setIsNewPaciente(false);
    setSearchPaciente("");
    setPacientesBusca([]);
    setIsRetornoElegivel(false);
    setDiasDesdeUltimaConsulta(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Encaixar Paciente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Médico e Local */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Médico *</Label>
              <Select 
                value={form.medicoId} 
                onValueChange={(v) => setForm({ ...form, medicoId: v, localId: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      Dr(a). {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Local *</Label>
              <Select 
                value={form.localId} 
                onValueChange={(v) => setForm({ ...form, localId: v })}
                disabled={!form.medicoId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.medicoId ? "Selecione o local" : "Selecione o médico primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocais.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome_local}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.data && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {form.data ? format(form.data, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={form.data}
                    onSelect={(d) => setForm({ ...form, data: d })}
                    locale={ptBR}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Hora *</Label>
              <Select value={form.hora} onValueChange={(v) => setForm({ ...form, hora: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {horaOptions.map((h) => (
                    <SelectItem key={h} value={h}>{h}h</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Minuto *</Label>
              <Select value={form.minuto} onValueChange={(v) => setForm({ ...form, minuto: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minutoOptions.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Buscar paciente */}
          <div className="relative">
            <Label>Buscar paciente existente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Digite nome ou CPF..."
                value={searchPaciente}
                onChange={(e) => {
                  setSearchPaciente(e.target.value);
                  searchPacientes(e.target.value);
                }}
                className="pl-10"
              />
            </div>
            {pacientesBusca.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-card border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {pacientesBusca.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPaciente(p)}
                    className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                  >
                    {p.nome} {p.cpf && `- ${maskCPF(p.cpf)}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Novo paciente toggle */}
          {!form.pacienteId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewPaciente(!isNewPaciente)}
              className="text-xs"
            >
              {isNewPaciente ? "Cancelar novo paciente" : "Cadastrar novo paciente"}
            </Button>
          )}

          {/* Dados do paciente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Label>Nome do paciente *</Label>
              <Input
                value={form.pacienteNome}
                onChange={(e) => setForm({ ...form, pacienteNome: e.target.value })}
                placeholder="Nome completo"
                disabled={!!form.pacienteId}
              />
            </div>
            {isNewPaciente && (
              <>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.pacienteTelefone}
                    onChange={(e) => setForm({ ...form, pacienteTelefone: maskPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={form.pacienteCpf}
                    onChange={(e) => setForm({ ...form, pacienteCpf: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </>
            )}
          </div>

          {/* Procedimento */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label>Tipo de Procedimento</Label>
              {isRetornoElegivel && (
                <Badge className="bg-green-600 text-white text-[10px] gap-1 px-1.5 py-0.5">
                  <RotateCcw className="w-2.5 h-2.5" />
                  Retorno 30d (R$ 0)
                </Badge>
              )}
            </div>
            <Select
              value={form.procedimento}
              onValueChange={(v) => {
                // Bloquear seleção de retorno se não for elegível
                if (v === "retorno" && !isRetornoElegivel) {
                  toast.error("Paciente não elegível para retorno", {
                    description: "O paciente não possui consulta concluída nos últimos 30 dias com este médico nesta clínica."
                  });
                  return;
                }
                setForm({ ...form, procedimento: v as typeof form.procedimento });
              }}
            >
              <SelectTrigger className={cn(
                isRetornoElegivel && form.procedimento === "retorno" && "border-green-500 bg-green-50 dark:bg-green-950"
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

          {/* Aviso de retorno elegível */}
          {isRetornoElegivel && form.procedimento === "retorno" && (
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

          <div>
            <Label>Motivo da consulta</Label>
            <Input
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              placeholder="Ex: Consulta de rotina, retorno..."
            />
          </div>

          {/* Info badge */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <Clock className="w-4 h-4" />
              <span>
                O encaixe criará um horário intermediário que ficará visível na agenda.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Criando..." : "Criar Encaixe"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
