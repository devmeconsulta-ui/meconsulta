import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserCheck, Clock, Users, CheckCircle2, AlertCircle, RefreshCw, Play, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Medico {
  id: string;
  nome: string;
}

interface Local {
  id: string;
  nome_local: string;
  medico_id: string;
}

interface ConsultaComChegada {
  id: string;
  data_hora: string;
  status_consulta: string;
  agenda_slot_id: string | null;
  paciente: {
    id: string;
    nome: string;
    telefone: string | null;
  } | null;
  nome_paciente_consulta: string | null;
  slot?: {
    ordem_chegada: number | null;
    hora_chegada: string | null;
  };
}

interface OrdemChegadaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  medicos: Array<{ id: string; nome: string; valor_consulta?: number; percentual_repasse?: number }>;
  locais: Array<{ id: string; nome_local: string; medico_id: string }>;
  onSuccess: () => void;
}

export function OrdemChegadaModal({
  open,
  onOpenChange,
  clinicaId,
  medicos,
  locais,
  onSuccess
}: OrdemChegadaModalProps) {
  const [medicoId, setMedicoId] = useState("");
  const [localId, setLocalId] = useState("");
  const [consultas, setConsultas] = useState<ConsultaComChegada[]>([]);
  const [loading, setLoading] = useState(false);
  const [atualizando, setAtualizando] = useState<string | null>(null);

  const locaisFiltrados = locais.filter(l => l.medico_id === medicoId);
  const hoje = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (medicoId && localId && open) {
      fetchConsultasDoDia();
    }
  }, [medicoId, localId, open]);

  const fetchConsultasDoDia = async () => {
    setLoading(true);
    try {
      const inicioDia = `${hoje}T00:00:00`;
      const fimDia = `${hoje}T23:59:59`;

      const { data: consultasData, error: consultasError } = await supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          agenda_slot_id,
          nome_paciente_consulta,
          paciente:pacientes(id, nome, telefone)
        `)
        .eq("medico_id", medicoId)
        .eq("local_id", localId)
        .gte("data_hora", inicioDia)
        .lte("data_hora", fimDia)
        .in("status_consulta", ["confirmada", "aguardando_confirmacao", "em_atendimento", "aguardando", "atendendo", "concluida", "atendida_medico"])
        .order("data_hora", { ascending: true });

      if (consultasError) throw consultasError;

      const consultasComSlot = await Promise.all(
        (consultasData || []).map(async (consulta) => {
          if (consulta.agenda_slot_id) {
            const { data: slotData } = await supabase
              .from("agenda_slots")
              .select("ordem_chegada, hora_chegada")
              .eq("id", consulta.agenda_slot_id)
              .single();
            
            return {
              ...consulta,
              paciente: Array.isArray(consulta.paciente) ? consulta.paciente[0] : consulta.paciente,
              slot: slotData || undefined
            };
          }
          return {
            ...consulta,
            paciente: Array.isArray(consulta.paciente) ? consulta.paciente[0] : consulta.paciente
          };
        })
      );

      setConsultas(consultasComSlot);
    } catch (error) {
      console.error("Erro ao buscar consultas:", error);
      toast.error("Erro ao carregar consultas do dia");
    } finally {
      setLoading(false);
    }
  };

  const registrarChegada = async (consulta: ConsultaComChegada) => {
    if (!consulta.agenda_slot_id) {
      toast.error("Consulta sem slot de agenda associado");
      return;
    }

    setAtualizando(consulta.id);
    try {
      const { data: ultimaOrdem } = await supabase
        .from("agenda_slots")
        .select("ordem_chegada")
        .eq("medico_id", medicoId)
        .eq("local_id", localId)
        .gte("data_hora", `${hoje}T00:00:00`)
        .lte("data_hora", `${hoje}T23:59:59`)
        .not("ordem_chegada", "is", null)
        .order("ordem_chegada", { ascending: false })
        .limit(1);

      const proximaOrdem = (ultimaOrdem && ultimaOrdem[0]?.ordem_chegada) 
        ? ultimaOrdem[0].ordem_chegada + 1 
        : 1;

      const { error: updateError } = await supabase
        .from("agenda_slots")
        .update({
          hora_chegada: new Date().toISOString(),
          ordem_chegada: proximaOrdem,
          tipo_slot: "ordem_chegada"
        })
        .eq("id", consulta.agenda_slot_id);

      if (updateError) throw updateError;

      // Atualizar status da consulta para "aguardando"
      await supabase
        .from("consultas")
        .update({ status_consulta: "aguardando" })
        .eq("id", consulta.id);

      toast.success(`Chegada registrada! Ordem: ${proximaOrdem}`);
      await fetchConsultasDoDia();
    } catch (error) {
      console.error("Erro ao registrar chegada:", error);
      toast.error("Erro ao registrar chegada");
    } finally {
      setAtualizando(null);
    }
  };

  const iniciarAtendimento = async (consulta: ConsultaComChegada) => {
    setAtualizando(consulta.id);
    try {
      const { error } = await supabase
        .from("consultas")
        .update({ status_consulta: "atendendo" })
        .eq("id", consulta.id);

      if (error) throw error;

      toast.success("Atendimento iniciado!");
      await fetchConsultasDoDia();
    } catch (error) {
      console.error("Erro ao iniciar atendimento:", error);
      toast.error("Erro ao iniciar atendimento");
    } finally {
      setAtualizando(null);
    }
  };

  const finalizarAtendimento = async (consulta: ConsultaComChegada) => {
    setAtualizando(consulta.id);
    try {
      const { error } = await supabase
        .from("consultas")
        .update({ status_consulta: "atendida_medico" })
        .eq("id", consulta.id);

      if (error) throw error;

      toast.success("Atendimento finalizado!");
      await fetchConsultasDoDia();
    } catch (error) {
      console.error("Erro ao finalizar atendimento:", error);
      toast.error("Erro ao finalizar atendimento");
    } finally {
      setAtualizando(null);
    }
  };

  const getNomePaciente = (consulta: ConsultaComChegada) => {
    return consulta.paciente?.nome || consulta.nome_paciente_consulta || "Paciente não identificado";
  };

  const getStatusInfo = (consulta: ConsultaComChegada) => {
    const chegou = consulta.slot?.ordem_chegada != null;
    const status = consulta.status_consulta;

    if (status === "atendida_medico" || status === "concluida") {
      return {
        label: "Atendido",
        color: "bg-purple-600",
        bgClass: "bg-purple-100 border-purple-400 border-2",
        badgeClass: "bg-purple-600 text-white"
      };
    }
    if (status === "atendendo") {
      return {
        label: "Atendendo",
        color: "bg-blue-600",
        bgClass: "bg-blue-100 border-blue-400 border-2",
        badgeClass: "bg-blue-600 text-white"
      };
    }
    if (chegou || status === "aguardando") {
      return {
        label: "Aguardando",
        color: "bg-green-600",
        bgClass: "bg-green-100 border-green-400 border-2",
        badgeClass: "bg-green-600 text-white"
      };
    }
    return {
      label: "Não chegou",
      color: "bg-gray-400",
      bgClass: "bg-gray-50 border-gray-200 border",
      badgeClass: "bg-gray-400 text-white"
    };
  };

  // Ordenar: atendendo primeiro, depois aguardando (por ordem), depois não chegou (por horário), atendidos por último
  const consultasOrdenadas = [...consultas].sort((a, b) => {
    const statusOrder = (status: string, chegou: boolean) => {
      if (status === "atendendo") return 0;
      if (chegou || status === "aguardando") return 1;
      if (status === "atendida_medico" || status === "concluida") return 3;
      return 2;
    };

    const aChegou = a.slot?.ordem_chegada != null;
    const bChegou = b.slot?.ordem_chegada != null;
    const aOrder = statusOrder(a.status_consulta, aChegou);
    const bOrder = statusOrder(b.status_consulta, bChegou);

    if (aOrder !== bOrder) return aOrder - bOrder;

    // Se ambos aguardando, ordenar por ordem de chegada
    if (aChegou && bChegou) {
      return (a.slot!.ordem_chegada || 0) - (b.slot!.ordem_chegada || 0);
    }

    return new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime();
  });

  const totalChegaram = consultas.filter(c => c.slot?.ordem_chegada != null).length;
  const totalAtendendo = consultas.filter(c => c.status_consulta === "atendendo").length;
  const totalAtendidos = consultas.filter(c => c.status_consulta === "atendida_medico" || c.status_consulta === "concluida").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ordem de Chegada - {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de Médico e Local */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Médico</Label>
              <Select value={medicoId} onValueChange={(v) => { setMedicoId(v); setLocalId(""); setConsultas([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Local</Label>
              <Select value={localId} onValueChange={setLocalId} disabled={!medicoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {locaisFiltrados.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome_local}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumo com cores */}
          {medicoId && localId && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                  <span className="text-sm">Aguardando chegada: <strong>{consultas.length - totalChegaram}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-sm">Chegaram: <strong>{totalChegaram - totalAtendendo - totalAtendidos}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-sm">Atendendo: <strong>{totalAtendendo}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                  <span className="text-sm">Atendidos: <strong>{totalAtendidos}</strong></span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchConsultasDoDia} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}

          {/* Lista de Consultas */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !medicoId || !localId ? (
            <div className="text-center py-8 text-muted-foreground">
              Selecione o médico e local para ver as consultas do dia
            </div>
          ) : consultas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma consulta agendada para hoje
            </div>
          ) : (
            <div className="space-y-2">
              {consultasOrdenadas.map((consulta) => {
                const chegou = consulta.slot?.ordem_chegada != null;
                const horaAgendada = format(new Date(consulta.data_hora), "HH:mm");
                const horaChegada = consulta.slot?.hora_chegada 
                  ? format(new Date(consulta.slot.hora_chegada), "HH:mm")
                  : null;
                const statusInfo = getStatusInfo(consulta);
                const isAtendendo = consulta.status_consulta === "atendendo";
                const isAtendido = consulta.status_consulta === "atendida_medico" || consulta.status_consulta === "concluida";

                return (
                  <div
                    key={consulta.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${statusInfo.bgClass}`}
                  >
                    <div className="flex items-center gap-3">
                      {chegou ? (
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg ${statusInfo.color}`}>
                          {consulta.slot!.ordem_chegada}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground">
                          <Clock className="h-5 w-5" />
                        </div>
                      )}
                      
                      <div>
                        <p className="font-medium">{getNomePaciente(consulta)}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Agendado: {horaAgendada}</span>
                          {horaChegada && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 font-medium">Chegou: {horaChegada}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAtendido ? (
                        <Badge className={statusInfo.badgeClass}>
                          <Check className="h-3 w-3 mr-1" />
                          Atendido
                        </Badge>
                      ) : isAtendendo ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-600 animate-pulse">
                            <Play className="h-3 w-3 mr-1" />
                            Atendendo
                          </Badge>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => finalizarAtendimento(consulta)}
                            disabled={atualizando === consulta.id}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {atualizando === consulta.id ? "..." : "Finalizar"}
                          </Button>
                        </div>
                      ) : chegou ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            #{consulta.slot!.ordem_chegada}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => iniciarAtendimento(consulta)}
                            disabled={atualizando === consulta.id}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            {atualizando === consulta.id ? "..." : "Atender"}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => registrarChegada(consulta)}
                          disabled={atualizando === consulta.id}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          {atualizando === consulta.id ? "..." : "Chegou"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
