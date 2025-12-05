import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  CalendarIcon,
  Plus,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Globe,
  Building2,
  User,
  Filter,
} from "lucide-react";
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgendaInternaModal } from "@/components/medico/AgendaInternaModal";
import { GerarSlotsModal } from "@/components/medico/GerarSlotsModal";

interface MedicoContext {
  medicoData: any;
}

interface Local {
  id: string;
  nome_local: string;
  tipo_atendimento: string;
}

interface Consulta {
  id: string;
  paciente_id: string;
  nome_paciente_consulta: string | null;
  origem: string;
  status_consulta: string;
  pacientes?: {
    nome: string;
  };
}

interface Slot {
  id: string;
  local_id: string;
  data_hora: string;
  disponivel: boolean;
  locais_atendimento?: Local;
  consultas?: Consulta[];
}

interface UsuarioClinica {
  id: string;
  nome: string;
  papel: string;
}

export default function MedicoAgenda() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [locais, setLocais] = useState<Local[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [usuariosClinica, setUsuariosClinica] = useState<UsuarioClinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Filters
  const [filterOrigem, setFilterOrigem] = useState("todos");

  // Modals
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [gerarSlotsModalOpen, setGerarSlotsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  useEffect(() => {
    if (medicoData?.id) {
      fetchData();
    }
  }, [medicoData, currentWeekStart]);

  async function fetchData() {
    setLoading(true);

    // Fetch locations
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local, tipo_atendimento")
      .eq("medico_id", medicoData.id)
      .eq("ativo", true);

    setLocais(locaisData || []);

    // Fetch slots for the week
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        locais_atendimento(id, nome_local, tipo_atendimento)
      `)
      .eq("medico_id", medicoData.id)
      .gte("data_hora", currentWeekStart.toISOString())
      .lte("data_hora", weekEnd.toISOString())
      .order("data_hora", { ascending: true });

    // Fetch consultations for these slots
    if (slotsData && slotsData.length > 0) {
      const slotIds = slotsData.map((s) => s.id);
      const { data: consultasData } = await supabase
        .from("consultas")
        .select(`
          id,
          paciente_id,
          nome_paciente_consulta,
          origem,
          status_consulta,
          agenda_slot_id,
          pacientes(nome)
        `)
        .in("agenda_slot_id", slotIds)
        .neq("status_consulta", "cancelada");

      // Map consultations to slots
      const slotsWithConsultas = slotsData.map((slot) => ({
        ...slot,
        consultas: consultasData?.filter((c) => c.agenda_slot_id === slot.id) || [],
      }));

      setSlots(slotsWithConsultas);
    } else {
      setSlots(slotsData || []);
    }

    // Fetch clinic users
    const { data: usuariosData } = await supabase
      .from("usuarios_clinica")
      .select("id, nome, papel")
      .eq("medico_id", medicoData.id)
      .eq("ativo", true);

    setUsuariosClinica(usuariosData || []);
    setLoading(false);
  }

  function handlePrevWeek() {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  }

  function handleNextWeek() {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  }

  function handleThisWeek() {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }

  function handleSlotClick(slot: Slot) {
    if (slot.disponivel && (!slot.consultas || slot.consultas.length === 0)) {
      setSelectedSlot(slot);
      setAgendaModalOpen(true);
    }
  }

  function getSlotStatus(slot: Slot) {
    if (!slot.disponivel || (slot.consultas && slot.consultas.length > 0)) {
      const consulta = slot.consultas?.[0];
      if (consulta) {
        return {
          status: "reservado",
          origem: consulta.origem || "online",
          pacienteNome: consulta.nome_paciente_consulta || consulta.pacientes?.nome || "Paciente",
          statusConsulta: consulta.status_consulta,
        };
      }
      return { status: "indisponivel", origem: null, pacienteNome: null, statusConsulta: null };
    }
    return { status: "livre", origem: null, pacienteNome: null, statusConsulta: null };
  }

  function getSlotsForDay(day: Date) {
    return slots
      .filter((slot) => isSameDay(parseISO(slot.data_hora), day))
      .filter((slot) => {
        if (filterOrigem === "todos") return true;
        if (filterOrigem === "livres") {
          const info = getSlotStatus(slot);
          return info.status === "livre";
        }
        const info = getSlotStatus(slot);
        return info.origem === filterOrigem;
      });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Agenda Semanal</h2>
          <p className="text-sm text-muted-foreground">Visualize e gerencie seus horários da semana</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setGerarSlotsModalOpen(true)}
            className="gap-2"
            disabled={locais.length === 0}
          >
            <CalendarRange className="w-4 h-4" />
            <span className="hidden sm:inline">Gerar Horários</span>
            <span className="sm:hidden">Gerar</span>
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <Card className="card-shadow">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex-1 text-center">
              <Button
                variant="ghost"
                onClick={handleThisWeek}
                className="text-xs text-muted-foreground mb-1"
              >
                Esta semana
              </Button>
              <p className="text-sm md:text-base font-semibold">
                {format(currentWeekStart, "dd/MM", { locale: ptBR })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterOrigem} onValueChange={setFilterOrigem}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2 shrink-0" />
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="livres">Livres</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="interna">Interna</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* No locations message */}
      {locais.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Cadastre um local de atendimento primeiro
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Weekly view */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const daySlots = getSlotsForDay(day);
            const dayIsToday = isToday(day);

            return (
              <Card
                key={day.toISOString()}
                className={`card-shadow ${dayIsToday ? "ring-2 ring-primary" : ""}`}
              >
                <CardContent className="p-3">
                  {/* Day header */}
                  <div className={`text-center mb-3 pb-2 border-b ${dayIsToday ? "border-primary" : "border-border"}`}>
                    <p className={`text-xs uppercase font-medium ${dayIsToday ? "text-primary" : "text-muted-foreground"}`}>
                      {format(day, "EEE", { locale: ptBR })}
                    </p>
                    <p className={`text-lg font-bold ${dayIsToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "dd")}
                    </p>
                  </div>

                  {/* Slots for this day */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-4">
                        Sem horários
                      </p>
                    ) : (
                      daySlots.map((slot) => {
                        const slotInfo = getSlotStatus(slot);
                        const isLivre = slotInfo.status === "livre";
                        const isOnline = slotInfo.origem === "online";
                        const isInterna = slotInfo.origem === "interna";

                        return (
                          <button
                            key={slot.id}
                            onClick={() => handleSlotClick(slot)}
                            disabled={!isLivre}
                            className={`w-full p-2 rounded-lg text-left transition-all text-xs ${
                              isLivre
                                ? "bg-muted hover:bg-muted/80 cursor-pointer border border-transparent hover:border-primary/30"
                                : isOnline
                                ? "bg-blue-100 dark:bg-blue-900/30 border-l-2 border-l-blue-500 cursor-default"
                                : isInterna
                                ? "bg-green-100 dark:bg-green-900/30 border-l-2 border-l-green-500 cursor-default"
                                : "bg-muted/50 cursor-default"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span className="font-medium">
                                {format(parseISO(slot.data_hora), "HH:mm")}
                              </span>
                            </div>

                            {slotInfo.pacienteNome ? (
                              <div className="mt-1 flex items-center gap-1">
                                {isOnline ? (
                                  <Globe className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <Building2 className="w-3 h-3 text-green-600" />
                                )}
                                <span className="truncate text-muted-foreground">
                                  {slotInfo.pacienteNome}
                                </span>
                              </div>
                            ) : (
                              <p className="mt-1 text-muted-foreground">Livre</p>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted rounded"></div>
          <span>Livre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Interna</span>
        </div>
      </div>

      {/* Internal booking modal */}
      {selectedSlot && (
        <AgendaInternaModal
          open={agendaModalOpen}
          onOpenChange={setAgendaModalOpen}
          slotId={selectedSlot.id}
          slotDataHora={selectedSlot.data_hora}
          localNome={selectedSlot.locais_atendimento?.nome_local || ""}
          medicoId={medicoData.id}
          valorConsulta={medicoData.valor_consulta || 0}
          percentualRepasse={medicoData.percentual_repasse || 70}
          usuariosClinica={usuariosClinica}
          onSuccess={fetchData}
        />
      )}

      {/* Bulk slot generation modal */}
      <GerarSlotsModal
        open={gerarSlotsModalOpen}
        onOpenChange={setGerarSlotsModalOpen}
        locais={locais}
        medicoId={medicoData.id}
        onSuccess={(firstDate) => {
          if (firstDate) {
            setCurrentWeekStart(startOfWeek(firstDate, { weekStartsOn: 1 }));
          }
          fetchData();
        }}
      />
    </div>
  );
}
