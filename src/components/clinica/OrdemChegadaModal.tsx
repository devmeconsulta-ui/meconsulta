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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  UserCheck,
  Plus,
  Clock,
  User,
  MapPin,
  Search,
  Play,
  CheckCircle,
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { maskPhone, maskCPF } from "@/lib/maskUtils";

interface OrdemChegadaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  medicos: Array<{ id: string; nome: string; valor_consulta: number; percentual_repasse: number }>;
  locais: Array<{ id: string; nome_local: string; medico_id: string }>;
  onSuccess: () => void;
}

interface SlotOrdemChegada {
  id: string;
  data_hora: string;
  disponivel: boolean;
  ordem_chegada: number | null;
  hora_chegada: string | null;
  medico_id: string;
  local_id: string;
  medico?: { nome: string };
  locais_atendimento?: { nome_local: string };
  consultas?: Array<{
    id: string;
    nome_paciente_consulta: string;
    status_consulta: string;
  }>;
}

export function OrdemChegadaModal({
  open,
  onOpenChange,
  clinicaId,
  medicos,
  locais,
  onSuccess,
}: OrdemChegadaModalProps) {
  const [slotsHoje, setSlotsHoje] = useState<SlotOrdemChegada[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [filterMedico, setFilterMedico] = useState("todos");
  const [searchPaciente, setSearchPaciente] = useState("");
  const [pacientesBusca, setPacientesBusca] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    medicoId: "",
    localId: "",
    pacienteId: "",
    pacienteNome: "",
    pacienteTelefone: "",
    pacienteCpf: "",
    motivo: "",
  });

  const filteredLocais = form.medicoId 
    ? locais.filter(l => l.medico_id === form.medicoId)
    : [];

  useEffect(() => {
    if (open) {
      fetchSlotsHoje();
    }
  }, [open, clinicaId]);

  async function fetchSlotsHoje() {
    setLoading(true);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Get local IDs for this clinic
    const localIds = locais.map(l => l.id);
    if (localIds.length === 0) {
      setSlotsHoje([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        medico:medicos(nome),
        locais_atendimento(nome_local),
        consultas(id, nome_paciente_consulta, status_consulta)
      `)
      .in("local_id", localIds)
      .eq("tipo_slot", "ordem_chegada")
      .gte("data_hora", hoje.toISOString())
      .lt("data_hora", amanha.toISOString())
      .order("ordem_chegada", { ascending: true, nullsFirst: false });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar fila de chegada");
    } else {
      // Filter out cancelled consultations
      const filteredData = (data || []).map(slot => ({
        ...slot,
        consultas: (slot.consultas || []).filter((c: any) => c.status_consulta !== "cancelada")
      }));
      setSlotsHoje(filteredData as unknown as SlotOrdemChegada[]);
    }
    setLoading(false);
  }

  async function searchPacientes(query: string) {
    if (query.length < 2) {
      setPacientesBusca([]);
      return;
    }

    const { data } = await supabase
      .from("pacientes")
      .select("id, nome, telefone, cpf")
      .or(`nome.ilike.%${query}%,cpf.ilike.%${query}%`)
      .limit(5);

    setPacientesBusca(data || []);
  }

  function selectPaciente(paciente: any) {
    setForm({
      ...form,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      pacienteTelefone: paciente.telefone || "",
      pacienteCpf: paciente.cpf || "",
    });
    setPacientesBusca([]);
    setSearchPaciente("");
  }

  async function handleRegistrarChegada() {
    if (!form.medicoId) {
      toast.error("Selecione um médico");
      return;
    }
    if (!form.localId) {
      toast.error("Selecione um local");
      return;
    }
    if (!form.pacienteNome.trim()) {
      toast.error("Informe o nome do paciente");
      return;
    }

    setSubmitting(true);

    try {
      const medico = medicos.find(m => m.id === form.medicoId);
      if (!medico) throw new Error("Médico não encontrado");

      // Get next ordem_chegada for today
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const { data: maxOrdemData } = await supabase
        .from("agenda_slots")
        .select("ordem_chegada")
        .eq("medico_id", form.medicoId)
        .eq("local_id", form.localId)
        .eq("tipo_slot", "ordem_chegada")
        .gte("data_hora", hoje.toISOString())
        .lt("data_hora", amanha.toISOString())
        .order("ordem_chegada", { ascending: false, nullsFirst: true })
        .limit(1);

      const nextOrdem = (maxOrdemData?.[0]?.ordem_chegada || 0) + 1;
      const agora = new Date();

      // Create paciente if needed
      let pacienteId = form.pacienteId || null;
      if (!pacienteId && form.pacienteNome) {
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

      // Create slot with ordem_chegada
      const { data: newSlot, error: slotError } = await supabase
        .from("agenda_slots")
        .insert({
          medico_id: form.medicoId,
          local_id: form.localId,
          data_hora: agora.toISOString(),
          disponivel: false,
          tipo_slot: "ordem_chegada",
          ordem_chegada: nextOrdem,
          hora_chegada: agora.toISOString(),
        })
        .select("id")
        .single();

      if (slotError) throw slotError;

      // Calculate values
      const valorConsulta = medico.valor_consulta || 0;
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
        data_hora: agora.toISOString(),
        nome_paciente_consulta: form.pacienteNome,
        origem: "interna",
        status_consulta: "aguardando",
        status_pagamento: "pendente",
        valor_consulta: valorConsulta,
        valor_medico: valorMedico,
        valor_plataforma: valorPlataforma,
        motivo_consulta: form.motivo || null,
        tipo_atendimento: "particular",
      });

      if (consultaError) throw consultaError;

      toast.success(`Paciente #${nextOrdem} registrado na fila!`);
      resetForm();
      setAddMode(false);
      fetchSlotsHoje();
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar chegada");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleIniciarAtendimento(slot: SlotOrdemChegada) {
    if (!slot.consultas?.[0]) return;

    const { error } = await supabase
      .from("consultas")
      .update({ status_consulta: "atendendo" })
      .eq("id", slot.consultas[0].id);

    if (error) {
      toast.error("Erro ao iniciar atendimento");
      return;
    }

    toast.success("Atendimento iniciado!");
    fetchSlotsHoje();
    onSuccess();
  }

  function resetForm() {
    setForm({
      medicoId: "",
      localId: "",
      pacienteId: "",
      pacienteNome: "",
      pacienteTelefone: "",
      pacienteCpf: "",
      motivo: "",
    });
    setSearchPaciente("");
    setPacientesBusca([]);
  }

  const filteredSlots = filterMedico === "todos"
    ? slotsHoje
    : slotsHoje.filter(s => s.medico_id === filterMedico);

  // Separate by status
  const aguardando = filteredSlots.filter(s => 
    s.consultas?.[0]?.status_consulta === "aguardando"
  );
  const atendendo = filteredSlots.filter(s => 
    s.consultas?.[0]?.status_consulta === "atendendo"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Ordem de Chegada - Hoje
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters and Add */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterMedico} onValueChange={setFilterMedico}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por médico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os médicos</SelectItem>
                {medicos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    Dr(a). {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={() => setAddMode(!addMode)}
              className="ml-auto gap-2"
            >
              <Plus className="w-4 h-4" />
              Registrar Chegada
            </Button>
          </div>

          {/* Add Form */}
          {addMode && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-4">
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
                        <SelectValue placeholder={form.medicoId ? "Selecione" : "Selecione médico primeiro"} />
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={form.pacienteNome}
                      onChange={(e) => setForm({ ...form, pacienteNome: e.target.value })}
                      placeholder="Nome do paciente"
                    />
                  </div>
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
                </div>

                <div>
                  <Label>Motivo</Label>
                  <Input
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    placeholder="Ex: Consulta de rotina..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setAddMode(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleRegistrarChegada} disabled={submitting}>
                    {submitting ? "Registrando..." : "Registrar Chegada"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Em atendimento */}
          {atendendo.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Play className="w-4 h-4 text-green-600" />
                Em Atendimento
              </h4>
              <div className="space-y-2">
                {atendendo.map((slot) => (
                  <Card key={slot.id} className="border-green-300 bg-green-50/50 dark:bg-green-950/20">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                          {slot.ordem_chegada}
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold">{slot.consultas?.[0]?.nome_paciente_consulta}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {slot.medico?.nome && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Dr(a). {slot.medico.nome}
                              </span>
                            )}
                            {slot.hora_chegada && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Chegou: {format(parseISO(slot.hora_chegada), "HH:mm")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-green-600 text-white">Atendendo</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Aguardando */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : aguardando.length === 0 && atendendo.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum paciente na fila de chegada hoje</p>
            </div>
          ) : aguardando.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Aguardando ({aguardando.length})
              </h4>
              <div className="space-y-2">
                {aguardando.map((slot) => (
                  <Card key={slot.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                          {slot.ordem_chegada}
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold">{slot.consultas?.[0]?.nome_paciente_consulta}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            {slot.medico?.nome && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Dr(a). {slot.medico.nome}
                              </span>
                            )}
                            {slot.locais_atendimento?.nome_local && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {slot.locais_atendimento.nome_local}
                              </span>
                            )}
                            {slot.hora_chegada && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Chegou: {format(parseISO(slot.hora_chegada), "HH:mm")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleIniciarAtendimento(slot)}
                          className="gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <Play className="w-3 h-3" />
                          Iniciar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
