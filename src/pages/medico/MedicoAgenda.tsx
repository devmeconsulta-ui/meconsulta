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
import { format, addDays, subDays, startOfDay, endOfDay, parseISO, isSameDay } from "date-fns";
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filters
  const [filterOrigem, setFilterOrigem] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  // Modals
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [gerarSlotsModalOpen, setGerarSlotsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  useEffect(() => {
    if (medicoData?.id) {
      fetchData();
    }
  }, [medicoData, selectedDate]);

  async function fetchData() {
    setLoading(true);

    // Fetch locations
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local, tipo_atendimento")
      .eq("medico_id", medicoData.id)
      .eq("ativo", true);

    setLocais(locaisData || []);

    // Fetch slots for selected date
    const dayStart = startOfDay(selectedDate).toISOString();
    const dayEnd = endOfDay(selectedDate).toISOString();

    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        locais_atendimento(id, nome_local, tipo_atendimento)
      `)
      .eq("medico_id", medicoData.id)
      .gte("data_hora", dayStart)
      .lte("data_hora", dayEnd)
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

  function handlePrevDay() {
    setSelectedDate(subDays(selectedDate, 1));
  }

  function handleNextDay() {
    setSelectedDate(addDays(selectedDate, 1));
  }

  function handleToday() {
    setSelectedDate(new Date());
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

  function filterSlots(slot: Slot) {
    const slotInfo = getSlotStatus(slot);

    // Filter by origin
    if (filterOrigem !== "todos") {
      if (slotInfo.status === "livre" && filterOrigem !== "livres") return false;
      if (slotInfo.status === "reservado" && slotInfo.origem !== filterOrigem) return false;
    }

    // Filter by status
    if (filterStatus !== "todos") {
      if (filterStatus === "livres" && slotInfo.status !== "livre") return false;
      if (filterStatus === "agendados" && slotInfo.status !== "reservado") return false;
    }

    return true;
  }

  const filteredSlots = slots.filter(filterSlots);

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
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Agenda</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus horários de atendimento</p>
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

      {/* Date navigation - Mobile optimized */}
      <Card className="card-shadow">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex-1 text-center">
              <Button
                variant="ghost"
                onClick={handleToday}
                className="text-xs text-muted-foreground mb-1"
              >
                Hoje
              </Button>
              <p className="text-base md:text-lg font-semibold capitalize">
                {format(selectedDate, "EEEE", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextDay}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters - Mobile optimized */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex-1">
          <Select value={filterOrigem} onValueChange={setFilterOrigem}>
            <SelectTrigger className="w-full">
              <Filter className="w-4 h-4 mr-2 shrink-0" />
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as origens</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="interna">Interna</SelectItem>
              <SelectItem value="livres">Apenas livres</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full">
              <Filter className="w-4 h-4 mr-2 shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="livres">Livres</SelectItem>
              <SelectItem value="agendados">Agendados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Slots list - Mobile optimized cards */}
      <div className="space-y-3">
        {locais.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Cadastre um local de atendimento primeiro
              </p>
            </CardContent>
          </Card>
        ) : filteredSlots.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Nenhum horário encontrado para esta data
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setGerarSlotsModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Gerar Horários
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredSlots.map((slot) => {
            const slotInfo = getSlotStatus(slot);
            const isLivre = slotInfo.status === "livre";
            const isOnline = slotInfo.origem === "online";
            const isInterna = slotInfo.origem === "interna";

            return (
              <Card
                key={slot.id}
                className={`card-shadow transition-all cursor-pointer ${
                  isLivre
                    ? "hover:border-primary/50 hover:shadow-md"
                    : "cursor-default"
                } ${
                  isOnline
                    ? "border-l-4 border-l-blue-500"
                    : isInterna
                    ? "border-l-4 border-l-green-500"
                    : ""
                }`}
                onClick={() => handleSlotClick(slot)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Time and location */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          isLivre
                            ? "bg-muted text-muted-foreground"
                            : isOnline
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                            : "bg-green-100 text-green-600 dark:bg-green-900/30"
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold">
                          {format(parseISO(slot.data_hora), "HH:mm")}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {slot.locais_atendimento?.nome_local}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-col items-end gap-1">
                      {isLivre ? (
                        <Badge variant="outline" className="bg-muted">
                          Livre
                        </Badge>
                      ) : (
                        <>
                          <Badge
                            variant="default"
                            className={
                              isOnline
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-green-500 hover:bg-green-600"
                            }
                          >
                            {isOnline ? (
                              <Globe className="w-3 h-3 mr-1" />
                            ) : (
                              <Building2 className="w-3 h-3 mr-1" />
                            )}
                            {isOnline ? "Online" : "Interna"}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Patient info for reserved slots */}
                  {slotInfo.pacienteNome && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{slotInfo.pacienteNome}</span>
                      </div>
                    </div>
                  )}

                  {/* Tap to book hint for free slots */}
                  {isLivre && (
                    <p className="mt-3 text-xs text-center text-muted-foreground">
                      Toque para agendar consulta interna
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
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
            setSelectedDate(firstDate);
          }
          fetchData();
        }}
      />
    </div>
  );
}
