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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar,
  CalendarDays,
  LayoutGrid,
  Ban,
  Unlock,
} from "lucide-react";
import {
  format,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  isSameDay,
  isSameMonth,
  isToday,
  getDay,
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
  clinica_id?: string | null;
  clinicas?: { nome_fantasia: string } | null;
  displayName?: string;
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

type ViewMode = "dia" | "semana" | "mes";

export default function MedicoAgenda() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [locais, setLocais] = useState<Local[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [usuariosClinica, setUsuariosClinica] = useState<UsuarioClinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("semana");

  // Filters
  const [filterLocal, setFilterLocal] = useState("todos");
  const [filterOrigem, setFilterOrigem] = useState("todos");

  // Modals
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [gerarSlotsModalOpen, setGerarSlotsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Date range helpers
  function getDateRange() {
    if (viewMode === "dia") {
      return { start: currentDate, end: currentDate };
    } else if (viewMode === "semana") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  }

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  useEffect(() => {
    if (medicoData?.id) {
      fetchData();
    }
  }, [medicoData, currentDate, viewMode]);

  async function fetchData() {
    setLoading(true);

    // Fetch locations - próprios do médico E de clínicas onde está vinculado
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local, tipo_atendimento, clinica_id, clinicas(nome_fantasia)")
      .eq("medico_id", medicoData.id)
      .eq("ativo", true);

    // Formatar locais com indicação de origem (próprio vs clínica)
    const locaisFormatados = (locaisData || []).map(local => ({
      ...local,
      displayName: local.clinica_id && local.clinicas 
        ? `${local.nome_local} (${local.clinicas.nome_fantasia})`
        : local.nome_local
    }));

    setLocais(locaisFormatados);

    // Fetch slots for the range
    const { start, end } = getDateRange();

    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        locais_atendimento(id, nome_local, tipo_atendimento)
      `)
      .eq("medico_id", medicoData.id)
      .gte("data_hora", start.toISOString())
      .lte("data_hora", end.toISOString())
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

  function handlePrev() {
    if (viewMode === "dia") {
      setCurrentDate(subDays(currentDate, 1));
    } else if (viewMode === "semana") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  }

  function handleNext() {
    if (viewMode === "dia") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === "semana") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  function handleSlotClick(slot: Slot) {
    console.log("Slot clicado:", slot);
    const slotInfo = getSlotStatus(slot);
    if (slotInfo.status === "livre") {
      setSelectedSlot(slot);
      setAgendaModalOpen(true);
    }
  }

  async function handleToggleSlotBlock(slot: Slot, e: React.MouseEvent) {
    e.stopPropagation();
    const slotInfo = getSlotStatus(slot);
    
    // Se tem consulta, não pode bloquear
    if (slot.consultas && slot.consultas.length > 0) {
      toast.error("Não é possível bloquear um horário com consulta agendada");
      return;
    }

    const newDisponivel = !slot.disponivel;
    
    const { error } = await supabase
      .from("agenda_slots")
      .update({ disponivel: newDisponivel })
      .eq("id", slot.id);

    if (error) {
      toast.error("Erro ao atualizar horário");
      console.error(error);
      return;
    }

    toast.success(newDisponivel ? "Horário liberado!" : "Horário bloqueado!");
    fetchData();
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

  function getFilteredSlots() {
    return slots.filter((slot) => {
      // Filter by location
      if (filterLocal !== "todos" && slot.local_id !== filterLocal) {
        return false;
      }

      // Filter by origin
      if (filterOrigem === "todos") return true;
      if (filterOrigem === "livres") {
        const info = getSlotStatus(slot);
        return info.status === "livre";
      }
      const info = getSlotStatus(slot);
      return info.origem === filterOrigem;
    });
  }

  function getSlotsForDay(day: Date) {
    return getFilteredSlots().filter((slot) => isSameDay(parseISO(slot.data_hora), day));
  }

  function getNavigationLabel() {
    if (viewMode === "dia") {
      return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } else if (viewMode === "semana") {
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`;
    } else {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  }

  function getTodayLabel() {
    if (viewMode === "dia") return "Hoje";
    if (viewMode === "semana") return "Esta semana";
    return "Este mês";
  }

  // Get current location name for display
  const currentLocalName = filterLocal === "todos" 
    ? "Todos os locais" 
    : locais.find(l => l.id === filterLocal)?.displayName || locais.find(l => l.id === filterLocal)?.nome_local || "Local";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Handle opening modal for booking
  function openBookingModal(slot: Slot) {
    setSelectedSlot(slot);
    setAgendaModalOpen(true);
  }

  // Render slot item
  function renderSlot(slot: Slot, compact = false) {
    const slotInfo = getSlotStatus(slot);
    const isLivre = slotInfo.status === "livre";
    const isOnline = slotInfo.origem === "online";
    const isInterna = slotInfo.origem === "interna";
    const isBloqueado = slotInfo.status === "indisponivel";
    const hasConsulta = slot.consultas && slot.consultas.length > 0;

    return (
      <div
        key={slot.id}
        className={`relative w-full p-2 rounded-lg text-left transition-all text-xs select-none ${
          isLivre
            ? "bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40"
            : isOnline
            ? "bg-blue-600/90 dark:bg-blue-700/90 text-white border-l-4 border-l-blue-400 shadow-sm"
            : isInterna
            ? "bg-emerald-600/90 dark:bg-emerald-700/90 text-white border-l-4 border-l-emerald-400 shadow-sm"
            : isBloqueado
            ? "bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700"
            : "bg-muted/50"
        }`}
      >
        <button
          type="button"
          onClick={() => isLivre && openBookingModal(slot)}
          disabled={!isLivre}
          className={`w-full text-left ${isLivre ? "cursor-pointer" : "cursor-default"}`}
        >
          <div className="flex items-center gap-2">
            {isBloqueado && <Ban className="w-3 h-3 text-red-500" />}
            <Clock className={`w-3 h-3 shrink-0 ${isLivre ? "" : isBloqueado ? "text-red-500" : "text-white/80"}`} />
            <span className={`font-semibold ${isBloqueado ? "text-red-600 dark:text-red-400" : ""}`}>
              {format(parseISO(slot.data_hora), "HH:mm")}
            </span>
          </div>

          {!compact && (
            <>
              {slotInfo.pacienteNome ? (
                <div className="mt-1 flex items-center gap-1">
                  {isOnline ? (
                    <Globe className="w-3 h-3 text-white/80" />
                  ) : (
                    <Building2 className="w-3 h-3 text-white/80" />
                  )}
                  <span className="truncate text-white/90">
                    {slotInfo.pacienteNome}
                  </span>
                </div>
              ) : isBloqueado ? (
                <p className="mt-1 text-red-500 dark:text-red-400 font-medium">Bloqueado</p>
              ) : (
                <p className="mt-1 text-primary/70 font-medium">Disponível</p>
              )}
            </>
          )}
        </button>

        {/* Botão de bloquear/desbloquear - só aparece se não tem consulta */}
        {!hasConsulta && !compact && (
          <button
            type="button"
            onClick={(e) => handleToggleSlotBlock(slot, e)}
            className={`absolute top-1 right-1 p-1 rounded transition-colors ${
              isBloqueado 
                ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30" 
                : "text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
            }`}
            title={isBloqueado ? "Liberar horário" : "Bloquear horário"}
          >
            {isBloqueado ? <Unlock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
          </button>
        )}
      </div>
    );
  }

  // Render day view
  function renderDayView() {
    const daySlots = getSlotsForDay(currentDate);
    const freeSlots = daySlots.filter(s => getSlotStatus(s).status === "livre").length;
    const bookedSlots = daySlots.filter(s => getSlotStatus(s).status === "reservado").length;
    const blockedSlots = daySlots.filter(s => getSlotStatus(s).status === "indisponivel").length;

    return (
      <Card className="card-shadow">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${isToday(currentDate) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <span className="text-2xl font-bold">{format(currentDate, "dd")}</span>
              </div>
              <div>
                <p className="text-lg font-semibold capitalize">
                  {format(currentDate, "EEEE", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            {/* Stats do dia */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                  {freeSlots} livres
                </Badge>
                <Badge variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-950">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  {bookedSlots} agendados
                </Badge>
                {blockedSlots > 0 && (
                  <Badge variant="outline" className="gap-1 bg-red-50 dark:bg-red-950">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    {blockedSlots} bloqueados
                  </Badge>
                )}
              </div>
              
              <Button
                size="sm"
                onClick={() => {
                  if (locais.length > 0) {
                    const dateTime = new Date(currentDate);
                    dateTime.setHours(8, 0, 0, 0);
                    const tempSlot: Slot = {
                      id: 'manual-' + Date.now(),
                      local_id: locais[0].id,
                      data_hora: dateTime.toISOString(),
                      disponivel: true,
                      locais_atendimento: locais[0],
                      consultas: [],
                    };
                    setSelectedSlot(tempSlot);
                    setAgendaModalOpen(true);
                  } else {
                    toast.error("Cadastre um local de atendimento primeiro");
                  }
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Agendar
              </Button>
            </div>
          </div>

          {daySlots.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum horário para este dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {daySlots.map((slot) => {
                const slotInfo = getSlotStatus(slot);
                const isLivre = slotInfo.status === "livre";
                const isOnline = slotInfo.origem === "online";
                const isInterna = slotInfo.origem === "interna";
                const isBloqueado = slotInfo.status === "indisponivel";
                const hasConsulta = slot.consultas && slot.consultas.length > 0;

                return (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isLivre
                        ? "bg-white dark:bg-card border-blue-200 dark:border-blue-800 hover:border-blue-400"
                        : isOnline
                        ? "bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700"
                        : isInterna
                        ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700"
                        : isBloqueado
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Ícone de bloqueio à esquerda do horário */}
                      {isBloqueado && (
                        <Ban className="w-5 h-5 text-red-500" />
                      )}
                      
                      {/* Horário */}
                      <div className="flex items-center gap-2">
                        <Clock className={`w-5 h-5 ${isBloqueado ? "text-red-500" : "text-muted-foreground"}`} />
                        <span className={`text-lg font-bold ${isBloqueado ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                          {format(parseISO(slot.data_hora), "HH:mm")}
                        </span>
                      </div>
                      
                      {/* Badge do Local - Cinza */}
                      {slot.locais_atendimento && (
                        <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-0 text-xs px-3 py-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {slot.locais_atendimento.nome_local}
                        </Badge>
                      )}
                      
                      {/* Badge de Status */}
                      {slotInfo.pacienteNome ? (
                        <div className="flex items-center gap-2">
                          {isOnline ? (
                            <Badge className="bg-blue-600 text-white text-xs">
                              <Globe className="w-3 h-3 mr-1" />
                              Online
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white text-xs">
                              <Building2 className="w-3 h-3 mr-1" />
                              Interno
                            </Badge>
                          )}
                          <span className="font-medium text-foreground">{slotInfo.pacienteNome}</span>
                        </div>
                      ) : isBloqueado ? (
                        <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1">Bloqueado</Badge>
                      ) : (
                        <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-0 text-xs px-3 py-1">Disponível</Badge>
                      )}
                    </div>
                    
                    {/* Ações à direita */}
                    <div className="flex items-center gap-3">
                      {isLivre && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openBookingModal(slot)}
                          className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Marcar
                        </Button>
                      )}
                      {!hasConsulta && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleToggleSlotBlock(slot, e)}
                          className={isBloqueado ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-red-500 hover:text-red-600 hover:bg-red-50"}
                          title={isBloqueado ? "Liberar horário" : "Bloquear horário"}
                        >
                          {isBloqueado ? <Unlock className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render week view
  function renderWeekView() {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 }),
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const daySlots = getSlotsForDay(day);
          const dayIsToday = isToday(day);

          return (
            <Card
              key={day.toISOString()}
              className={`card-shadow ${dayIsToday ? "ring-2 ring-primary shadow-lg" : ""}`}
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
                    daySlots.map((slot) => renderSlot(slot))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Estado para visualização expandida do dia no mês
  const [expandedMonthDay, setExpandedMonthDay] = useState<Date | null>(null);

  // Render month view
  function renderMonthView() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Se tem dia expandido, mostrar os slots desse dia
    if (expandedMonthDay) {
      const daySlots = getSlotsForDay(expandedMonthDay);
      const freeSlots = daySlots.filter(s => getSlotStatus(s).status === "livre").length;
      const bookedSlots = daySlots.filter(s => getSlotStatus(s).status === "reservado").length;
      const blockedSlots = daySlots.filter(s => getSlotStatus(s).status === "indisponivel").length;

      return (
        <Card className="card-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setExpandedMonthDay(null)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <div className={`p-3 rounded-xl ${isToday(expandedMonthDay) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <span className="text-2xl font-bold">{format(expandedMonthDay, "dd")}</span>
                </div>
                <div>
                  <p className="text-lg font-semibold capitalize">
                    {format(expandedMonthDay, "EEEE", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(expandedMonthDay, "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                    {freeSlots} livres
                  </Badge>
                  <Badge variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-950">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    {bookedSlots} agendados
                  </Badge>
                  {blockedSlots > 0 && (
                    <Badge variant="outline" className="gap-1 bg-red-50 dark:bg-red-950">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      {blockedSlots} bloqueados
                    </Badge>
                  )}
                </div>
                
                <Button
                  size="sm"
                  onClick={() => {
                    if (locais.length > 0) {
                      const dateTime = new Date(expandedMonthDay);
                      dateTime.setHours(8, 0, 0, 0);
                      const tempSlot: Slot = {
                        id: 'manual-' + Date.now(),
                        local_id: locais[0].id,
                        data_hora: dateTime.toISOString(),
                        disponivel: true,
                        locais_atendimento: locais[0],
                        consultas: [],
                      };
                      setSelectedSlot(tempSlot);
                      setAgendaModalOpen(true);
                    }
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agendar
                </Button>
              </div>
            </div>

            {daySlots.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum horário para este dia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {daySlots.map((slot) => {
                  const slotInfo = getSlotStatus(slot);
                  const isLivre = slotInfo.status === "livre";
                  const isOnline = slotInfo.origem === "online";
                  const isInterna = slotInfo.origem === "interna";
                  const isBloqueado = slotInfo.status === "indisponivel";
                  const hasConsulta = slot.consultas && slot.consultas.length > 0;

                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isLivre
                          ? "bg-white dark:bg-card border-blue-200 dark:border-blue-800 hover:border-blue-400"
                          : isOnline
                          ? "bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700"
                          : isInterna
                          ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700"
                          : isBloqueado
                          ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                          : "bg-muted/50 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Ícone de bloqueio à esquerda do horário */}
                        {isBloqueado && (
                          <Ban className="w-5 h-5 text-red-500" />
                        )}
                        
                        {/* Horário */}
                        <div className="flex items-center gap-2">
                          <Clock className={`w-5 h-5 ${isBloqueado ? "text-red-500" : "text-muted-foreground"}`} />
                          <span className={`text-lg font-bold ${isBloqueado ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                            {format(parseISO(slot.data_hora), "HH:mm")}
                          </span>
                        </div>
                        
                        {/* Badge do Local - Cinza */}
                        {slot.locais_atendimento && (
                          <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-0 text-xs px-3 py-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {slot.locais_atendimento.nome_local}
                          </Badge>
                        )}
                        
                        {/* Badge de Status */}
                        {slotInfo.pacienteNome ? (
                          <div className="flex items-center gap-2">
                            {isOnline ? (
                              <Badge className="bg-blue-600 text-white text-xs">
                                <Globe className="w-3 h-3 mr-1" />
                                Online
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-600 text-white text-xs">
                                <Building2 className="w-3 h-3 mr-1" />
                                Interno
                              </Badge>
                            )}
                            <span className="font-medium text-foreground">{slotInfo.pacienteNome}</span>
                          </div>
                        ) : isBloqueado ? (
                          <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1">Bloqueado</Badge>
                        ) : (
                          <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-0 text-xs px-3 py-1">Disponível</Badge>
                        )}
                      </div>
                      
                      {/* Ações à direita */}
                      <div className="flex items-center gap-3">
                        {isLivre && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openBookingModal(slot)}
                            className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            Marcar
                          </Button>
                        )}
                        {!hasConsulta && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => handleToggleSlotBlock(slot, e)}
                            className={isBloqueado ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-red-500 hover:text-red-600 hover:bg-red-50"}
                            title={isBloqueado ? "Liberar horário" : "Bloquear horário"}
                          >
                            {isBloqueado ? <Unlock className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="card-shadow">
        <CardContent className="p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const daySlots = getSlotsForDay(day);
              const dayIsToday = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              const freeSlots = daySlots.filter(s => getSlotStatus(s).status === "livre").length;
              const bookedSlots = daySlots.filter(s => getSlotStatus(s).status === "reservado").length;
              const blockedSlots = daySlots.filter(s => getSlotStatus(s).status === "indisponivel").length;

              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => isCurrentMonth && setExpandedMonthDay(day)}
                  disabled={!isCurrentMonth}
                  className={`min-h-[80px] md:min-h-[100px] p-1 md:p-2 rounded-lg border transition-all text-left ${
                    !isCurrentMonth 
                      ? "bg-muted/30 border-transparent cursor-default" 
                      : dayIsToday 
                      ? "bg-primary/10 border-primary cursor-pointer hover:bg-primary/20" 
                      : "bg-background border-border/50 hover:border-primary/30 cursor-pointer hover:bg-muted/50"
                  }`}
                >
                  <p className={`text-xs md:text-sm font-semibold mb-1 ${
                    !isCurrentMonth 
                      ? "text-muted-foreground/50" 
                      : dayIsToday 
                      ? "text-primary" 
                      : "text-foreground"
                  }`}>
                    {format(day, "d")}
                  </p>

                  {isCurrentMonth && daySlots.length > 0 && (
                    <div className="space-y-1">
                      {freeSlots > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                          <span className="text-[10px] text-muted-foreground">{freeSlots} livre{freeSlots > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {bookedSlots > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                          <span className="text-[10px] text-muted-foreground">{bookedSlots} agend.</span>
                        </div>
                      )}
                      {blockedSlots > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-[10px] text-muted-foreground">{blockedSlots} bloq.</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Agenda</h2>
            <p className="text-sm text-muted-foreground">Visualize e gerencie seus horários</p>
          </div>

          {/* View mode tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="dia" className="gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Dia</span>
              </TabsTrigger>
              <TabsTrigger value="semana" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Semana</span>
              </TabsTrigger>
              <TabsTrigger value="mes" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Mês</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (locais.length > 0) {
                // Create a temporary slot for manual booking
                const tempSlot: Slot = {
                  id: 'manual-' + Date.now(),
                  local_id: locais[0].id,
                  data_hora: new Date().toISOString(),
                  disponivel: true,
                  locais_atendimento: locais[0],
                  consultas: [],
                };
                setSelectedSlot(tempSlot);
                setAgendaModalOpen(true);
              } else {
                toast.error("Cadastre um local de atendimento primeiro");
              }
            }}
            className="gap-2"
            disabled={locais.length === 0}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Agendar Paciente</span>
            <span className="sm:hidden">Agendar</span>
          </Button>
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

      {/* Navigation */}
      <Card className="card-shadow">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex-1 text-center">
              <Button
                variant="ghost"
                onClick={handleToday}
                className="text-xs text-muted-foreground mb-1"
              >
                {getTodayLabel()}
              </Button>
              <p className="text-sm md:text-base font-semibold capitalize">
                {getNavigationLabel()}
              </p>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNext}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Location filter */}
        <Select value={filterLocal} onValueChange={setFilterLocal}>
          <SelectTrigger className="w-full sm:w-64">
            <MapPin className="w-4 h-4 mr-2 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Local de atendimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os locais</SelectItem>
            {locais.map((local) => (
              <SelectItem key={local.id} value={local.id}>
                <div className="flex items-center gap-2">
                  {local.tipo_atendimento === "online" ? (
                    <Globe className="w-3 h-3 text-blue-500" />
                  ) : (
                    <Building2 className="w-3 h-3 text-emerald-500" />
                  )}
                  <span>{local.displayName || local.nome_local}</span>
                  {local.clinica_id && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">Clínica</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origin filter */}
        <Select value={filterOrigem} onValueChange={setFilterOrigem}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="livres">Livres</SelectItem>
            <SelectItem value="online">Agendados Online</SelectItem>
            <SelectItem value="interna">Agendados Interna</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Current filter badge */}
      {(filterLocal !== "todos" || filterOrigem !== "todos") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {filterLocal !== "todos" && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="w-3 h-3" />
              {currentLocalName}
            </Badge>
          )}
          {filterOrigem !== "todos" && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="w-3 h-3" />
              {filterOrigem === "livres" ? "Livres" : filterOrigem === "online" ? "Online" : "Interna"}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setFilterLocal("todos"); setFilterOrigem("todos"); }}
            className="h-6 text-xs"
          >
            Limpar
          </Button>
        </div>
      )}

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
        <>
          {viewMode === "dia" && renderDayView()}
          {viewMode === "semana" && renderWeekView()}
          {viewMode === "mes" && renderMonthView()}
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary/30 rounded border border-primary/40"></div>
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded"></div>
          <span>Agendado Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-600 rounded"></div>
          <span>Agendado Interno</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-200 dark:bg-red-900/50 rounded border border-red-400"></div>
          <span>Bloqueado</span>
        </div>
      </div>

      {/* Internal booking modal */}
      {selectedSlot && (
        <AgendaInternaModal
          open={agendaModalOpen}
          onOpenChange={setAgendaModalOpen}
          slotId={selectedSlot.id}
          slotDataHora={selectedSlot.data_hora}
          localId={selectedSlot.local_id}
          localNome={selectedSlot.locais_atendimento?.nome_local || ""}
          medicoId={medicoData.id}
          valorConsulta={medicoData.valor_consulta || 0}
          percentualRepasse={medicoData.percentual_repasse || 70}
          usuariosClinica={usuariosClinica}
          locais={locais}
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
            setCurrentDate(firstDate);
          }
          fetchData();
        }}
      />
    </div>
  );
}
