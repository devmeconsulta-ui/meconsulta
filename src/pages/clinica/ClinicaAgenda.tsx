import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building2,
  Plus,
  CalendarRange,
  MapPin,
  Filter,
  Calendar as CalendarDays,
  LayoutGrid,
  User,
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
  isWeekend,
  setHours,
  setMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgendaInternaModal } from "@/components/medico/AgendaInternaModal";
import { cn } from "@/lib/utils";

interface ClinicaContext {
  clinicaData: any;
}

interface Local {
  id: string;
  nome_local: string;
  tipo_atendimento: string;
  medico_id: string;
}

interface Slot {
  id: string;
  local_id: string;
  data_hora: string;
  disponivel: boolean;
  medico_id: string;
  locais_atendimento?: { nome_local: string; tipo_atendimento: string };
  medicos?: { nome: string };
  consultas?: Array<{
    id: string;
    nome_paciente_consulta: string | null;
    origem: string;
    status_consulta: string;
    pacientes?: { nome: string };
  }>;
}

interface UsuarioClinica {
  id: string;
  nome: string;
  papel: string;
}

type ViewMode = "dia" | "semana" | "mes";

const intervalOptions = [
  { value: "15", label: "15 minutos" },
  { value: "20", label: "20 minutos" },
  { value: "30", label: "30 minutos" },
  { value: "45", label: "45 minutos" },
  { value: "60", label: "1 hora" },
];

export default function ClinicaAgenda() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [medicos, setMedicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [medicosCompletos, setMedicosCompletos] = useState<Array<{ id: string; nome: string; valor_consulta: number; percentual_repasse: number }>>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [usuariosClinica, setUsuariosClinica] = useState<UsuarioClinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("semana");
  
  // Filters
  const [filterMedico, setFilterMedico] = useState("todos");
  const [filterLocal, setFilterLocal] = useState("todos");
  const [filterOrigem, setFilterOrigem] = useState("todos");

  // Modals
  const [gerarSlotsModalOpen, setGerarSlotsModalOpen] = useState(false);
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Gerar Slots form state
  const [gerarForm, setGerarForm] = useState({
    medicoId: "",
    localId: "",
    dateRange: undefined as { from: Date; to: Date } | undefined,
    horaInicial: "08:00",
    horaFinal: "18:00",
    intervalo: "30",
    excluirFimSemana: true,
  });
  const [gerarLoading, setGerarLoading] = useState(false);

  const timeOptions: string[] = [];
  for (let h = 6; h <= 22; h++) {
    timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
    timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
  }

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

  useEffect(() => {
    if (clinicaData?.id) {
      fetchData();
    }
  }, [clinicaData, currentDate, viewMode]);

  // Fetch locais when medicoId changes in form
  useEffect(() => {
    if (gerarForm.medicoId) {
      fetchLocaisForMedico(gerarForm.medicoId);
    }
  }, [gerarForm.medicoId]);

  async function fetchLocaisForMedico(medicoId: string) {
    // Busca apenas locais que pertencem a esta clínica
    const { data } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local, tipo_atendimento, medico_id")
      .eq("medico_id", medicoId)
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);
    setLocais(data || []);
    setGerarForm(prev => ({ ...prev, localId: "" }));
  }

  async function fetchData() {
    setLoading(true);

    // Busca médicos vinculados
    const { data: vinculosData } = await supabase
      .from("clinicas_medicos")
      .select("medico_id, medicos(id, nome, valor_consulta, percentual_repasse)")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    const medicosVinculados = vinculosData?.map((v: any) => v.medicos).filter(Boolean) || [];
    setMedicos(medicosVinculados.map((m: any) => ({ id: m.id, nome: m.nome })));
    setMedicosCompletos(medicosVinculados);

    if (medicosVinculados.length === 0) {
      setSlots([]);
      setLoading(false);
      return;
    }

    const medicoIds = medicosVinculados.map((m: any) => m.id);
    const { start, end } = getDateRange();

    // Busca apenas locais desta clínica
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local, tipo_atendimento, medico_id")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);
    
    setLocais(locaisData || []);

    // Busca usuarios_clinica desta clínica
    const { data: usuariosData } = await supabase
      .from("usuarios_clinica")
      .select("id, nome, papel")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);
    
    setUsuariosClinica(usuariosData || []);

    // Busca slots apenas dos locais desta clínica
    if (!locaisData || locaisData.length === 0) {
      setSlots([]);
      setLoading(false);
      return;
    }

    const localIds = locaisData.map(l => l.id);

    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        locais_atendimento(nome_local, tipo_atendimento),
        medicos(nome)
      `)
      .in("local_id", localIds)
      .gte("data_hora", start.toISOString())
      .lte("data_hora", end.toISOString())
      .order("data_hora", { ascending: true });

    // Busca consultas associadas aos slots
    if (slotsData && slotsData.length > 0) {
      const slotIds = slotsData.map((s) => s.id);
      const { data: consultasData } = await supabase
        .from("consultas")
        .select(`
          id,
          nome_paciente_consulta,
          origem,
          status_consulta,
          agenda_slot_id,
          pacientes(nome)
        `)
        .in("agenda_slot_id", slotIds)
        .neq("status_consulta", "cancelada");

      const slotsWithConsultas = slotsData.map((slot) => ({
        ...slot,
        consultas: consultasData?.filter((c) => c.agenda_slot_id === slot.id) || [],
      }));

      setSlots(slotsWithConsultas);
    } else {
      setSlots(slotsData || []);
    }

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

  function getSlotStatus(slot: Slot) {
    if (!slot.disponivel || (slot.consultas && slot.consultas.length > 0)) {
      const consulta = slot.consultas?.[0];
      if (consulta) {
        return {
          status: "reservado",
          origem: consulta.origem || "online",
          pacienteNome: consulta.nome_paciente_consulta || consulta.pacientes?.nome || "Paciente",
        };
      }
      return { status: "indisponivel", origem: null, pacienteNome: null };
    }
    return { status: "livre", origem: null, pacienteNome: null };
  }

  function getFilteredSlots() {
    return slots.filter((slot) => {
      if (filterMedico !== "todos" && slot.medico_id !== filterMedico) return false;
      if (filterLocal !== "todos" && slot.local_id !== filterLocal) return false;
      
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

  function handleSlotClick(slot: Slot) {
    const slotInfo = getSlotStatus(slot);
    if (slotInfo.status === "livre") {
      setSelectedSlot(slot);
      setAgendaModalOpen(true);
    }
  }

  async function handleGerarSlots() {
    if (!gerarForm.medicoId || !gerarForm.localId || !gerarForm.dateRange?.from || !gerarForm.dateRange?.to) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setGerarLoading(true);

    try {
      const days = eachDayOfInterval({ start: gerarForm.dateRange.from, end: gerarForm.dateRange.to });
      const slotsToCreate: any[] = [];
      const intervalMinutes = parseInt(gerarForm.intervalo);
      const [horaInicialH, horaInicialM] = gerarForm.horaInicial.split(":").map(Number);
      const [horaFinalH, horaFinalM] = gerarForm.horaFinal.split(":").map(Number);

      for (const day of days) {
        if (gerarForm.excluirFimSemana && isWeekend(day)) continue;

        let currentTime = setMinutes(setHours(day, horaInicialH), horaInicialM);
        const endTime = setMinutes(setHours(day, horaFinalH), horaFinalM);

        while (currentTime < endTime) {
          slotsToCreate.push({
            medico_id: gerarForm.medicoId,
            local_id: gerarForm.localId,
            data_hora: currentTime.toISOString(),
            disponivel: true,
          });
          currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
        }
      }

      if (slotsToCreate.length === 0) {
        toast.error("Nenhum horário para gerar com os parâmetros selecionados");
        setGerarLoading(false);
        return;
      }

      // Check existing slots
      const { data: existingSlots } = await supabase
        .from("agenda_slots")
        .select("data_hora")
        .eq("medico_id", gerarForm.medicoId)
        .eq("local_id", gerarForm.localId)
        .gte("data_hora", gerarForm.dateRange.from.toISOString())
        .lte("data_hora", gerarForm.dateRange.to.toISOString());

      const existingTimes = new Set(existingSlots?.map((s) => s.data_hora) || []);
      const newSlots = slotsToCreate.filter((slot) => !existingTimes.has(slot.data_hora));

      if (newSlots.length === 0) {
        toast.info("Todos os horários já existem para este período");
        setGerarLoading(false);
        return;
      }

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < newSlots.length; i += batchSize) {
        const batch = newSlots.slice(i, i + batchSize);
        const { error } = await supabase.from("agenda_slots").insert(batch);
        if (error) throw error;
      }

      toast.success(`${newSlots.length} horários criados com sucesso!`);
      setGerarSlotsModalOpen(false);
      setGerarForm({
        medicoId: "",
        localId: "",
        dateRange: undefined,
        horaInicial: "08:00",
        horaFinal: "18:00",
        intervalo: "30",
        excluirFimSemana: true,
      });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar horários");
    } finally {
      setGerarLoading(false);
    }
  }

  function renderSlot(slot: Slot, compact = false) {
    const slotInfo = getSlotStatus(slot);
    const isLivre = slotInfo.status === "livre";
    const isOnline = slotInfo.origem === "online";
    const isInterna = slotInfo.origem === "interna";

    return (
      <button
        type="button"
        key={slot.id}
        onClick={() => isLivre && handleSlotClick(slot)}
        disabled={!isLivre}
        className={`w-full p-2 rounded-lg text-left transition-all text-xs select-none ${
          isLivre
            ? "bg-primary/10 hover:bg-primary/20 cursor-pointer border border-primary/20 hover:border-primary/40"
            : isOnline
            ? "bg-blue-600/90 text-white border-l-4 border-l-blue-400 cursor-default"
            : isInterna
            ? "bg-emerald-600/90 text-white border-l-4 border-l-emerald-400 cursor-default"
            : "bg-muted/50 cursor-default"
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className={`w-3 h-3 shrink-0 ${isLivre ? "" : "text-white/80"}`} />
          <span className="font-semibold">
            {format(parseISO(slot.data_hora), "HH:mm")}
          </span>
        </div>
        {!compact && slot.medicos && (
          <p className={`text-xs mt-1 ${isLivre ? "text-muted-foreground" : "text-white/70"}`}>
            Dr(a). {slot.medicos.nome}
          </p>
        )}
        {!compact && (
          slotInfo.pacienteNome ? (
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
          ) : (
            <p className="mt-1 text-primary/70 font-medium">Disponível</p>
          )
        )}
      </button>
    );
  }

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
                <button
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`w-full text-center mb-3 pb-2 border-b transition-colors rounded-t hover:bg-muted/50 ${dayIsToday ? "border-primary" : "border-border"}`}
                >
                  <p className={`text-xs uppercase font-medium ${dayIsToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`text-lg font-bold ${dayIsToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "dd")}
                  </p>
                </button>

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

  function renderDayView() {
    const daySlots = getSlotsForDay(currentDate);

    return (
      <Card className="card-shadow">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b">
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

          {daySlots.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum horário para este dia</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {daySlots.map((slot) => renderSlot(slot))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function handleDayClick(day: Date) {
    if (medicos.length === 0 || locais.length === 0) {
      toast.error("Configure médicos e locais antes de agendar");
      return;
    }
    
    // Create a temporary slot for this day
    const dateTime = new Date(day);
    dateTime.setHours(8, 0, 0, 0);
    
    const medicoId = filterMedico !== "todos" ? filterMedico : medicos[0].id;
    const medicoLocais = locais.filter(l => l.medico_id === medicoId);
    const localId = filterLocal !== "todos" ? filterLocal : medicoLocais[0]?.id || locais[0].id;
    const local = locais.find(l => l.id === localId);
    
    const tempSlot: Slot = {
      id: 'manual-' + Date.now(),
      local_id: localId,
      data_hora: dateTime.toISOString(),
      disponivel: true,
      medico_id: medicoId,
      locais_atendimento: local ? { nome_local: local.nome_local, tipo_atendimento: local.tipo_atendimento } : undefined,
      medicos: medicos.find(m => m.id === medicoId) ? { nome: medicos.find(m => m.id === medicoId)!.nome } : undefined,
      consultas: [],
    };
    setSelectedSlot(tempSlot);
    setAgendaModalOpen(true);
  }

  function renderMonthView() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const daySlots = getSlotsForDay(day);
              const dayIsToday = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const freeSlots = daySlots.filter(s => getSlotStatus(s).status === "livre").length;
              const bookedSlots = daySlots.filter(s => getSlotStatus(s).status === "reservado").length;

              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => isCurrentMonth && handleDayClick(day)}
                  disabled={!isCurrentMonth}
                  className={`min-h-[80px] p-2 border rounded-lg text-left transition-all ${
                    dayIsToday ? "border-primary bg-primary/5" : "border-border"
                  } ${!isCurrentMonth ? "opacity-40" : "hover:bg-muted/50 cursor-pointer"}`}
                >
                  <p className={`text-sm font-medium ${dayIsToday ? "text-primary" : ""}`}>
                    {format(day, "dd")}
                  </p>
                  {daySlots.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {freeSlots > 0 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {freeSlots} livres
                        </Badge>
                      )}
                      {bookedSlots > 0 && (
                        <Badge className="text-xs px-1 py-0 bg-blue-600">
                          {bookedSlots} agend.
                        </Badge>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredLocaisForMedico = gerarForm.medicoId 
    ? locais.filter(l => l.medico_id === gerarForm.medicoId)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agenda</h2>
          <p className="text-muted-foreground">Gerencie a agenda dos médicos vinculados</p>
        </div>

        <Button onClick={() => setGerarSlotsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Gerar Horários
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={filterMedico} onValueChange={setFilterMedico}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Médico" />
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

            <Select value={filterLocal} onValueChange={setFilterLocal}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os locais</SelectItem>
                {locais.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome_local}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterOrigem} onValueChange={setFilterOrigem}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="livres">Livres</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="interna">Interna</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="ml-auto">
              <TabsList>
                <TabsTrigger value="dia" className="gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Dia</span>
                </TabsTrigger>
                <TabsTrigger value="semana" className="gap-1">
                  <CalendarRange className="h-4 w-4" />
                  <span className="hidden sm:inline">Semana</span>
                </TabsTrigger>
                <TabsTrigger value="mes" className="gap-1">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Mês</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border">
        <Button variant="outline" size="sm" onClick={handlePrev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <span className="font-medium capitalize text-center">
            {getNavigationLabel()}
          </span>
          <Button variant="ghost" size="sm" onClick={handleToday}>
            Hoje
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Views */}
      {medicos.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum médico vinculado à clínica</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "dia" && renderDayView()}
          {viewMode === "semana" && renderWeekView()}
          {viewMode === "mes" && renderMonthView()}
        </>
      )}

      {/* Modal Gerar Slots */}
      <Dialog open={gerarSlotsModalOpen} onOpenChange={setGerarSlotsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5" />
              Gerar Horários em Lote
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label>Médico *</Label>
              <Select value={gerarForm.medicoId} onValueChange={(v) => setGerarForm(prev => ({ ...prev, medicoId: v }))}>
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
              <Label>Local de Atendimento *</Label>
              <Select 
                value={gerarForm.localId} 
                onValueChange={(v) => setGerarForm(prev => ({ ...prev, localId: v }))}
                disabled={!gerarForm.medicoId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={gerarForm.medicoId ? "Selecione o local" : "Selecione um médico primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocaisForMedico.map((local) => (
                    <SelectItem key={local.id} value={local.id}>
                      {local.nome_local}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {gerarForm.medicoId && filteredLocaisForMedico.length === 0 && (
                <p className="text-xs text-destructive mt-1">Este médico não possui locais cadastrados</p>
              )}
            </div>

            <div>
              <Label>Período *</Label>
              <Calendar
                mode="range"
                selected={gerarForm.dateRange}
                onSelect={(range) => setGerarForm(prev => ({ ...prev, dateRange: range as { from: Date; to: Date } }))}
                disabled={(date) => date < new Date()}
                locale={ptBR}
                numberOfMonths={1}
                className={cn("rounded-md border pointer-events-auto")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Horário Inicial</Label>
                <Select value={gerarForm.horaInicial} onValueChange={(v) => setGerarForm(prev => ({ ...prev, horaInicial: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário Final</Label>
                <Select value={gerarForm.horaFinal} onValueChange={(v) => setGerarForm(prev => ({ ...prev, horaFinal: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Intervalo entre Consultas</Label>
              <Select value={gerarForm.intervalo} onValueChange={(v) => setGerarForm(prev => ({ ...prev, intervalo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intervalOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="excluirFimSemana"
                checked={gerarForm.excluirFimSemana}
                onCheckedChange={(checked) => setGerarForm(prev => ({ ...prev, excluirFimSemana: checked as boolean }))}
              />
              <label htmlFor="excluirFimSemana" className="text-sm font-medium cursor-pointer">
                Excluir finais de semana
              </label>
            </div>

            <Button
              onClick={handleGerarSlots}
              className="w-full"
              disabled={gerarLoading || !gerarForm.medicoId || !gerarForm.localId || !gerarForm.dateRange?.from}
            >
              {gerarLoading ? "Gerando..." : "Gerar Horários"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Agendamento Interno */}
      {selectedSlot && (() => {
        const medicoInfo = medicosCompletos.find(m => m.id === selectedSlot.medico_id);
        const slotLocais = locais.filter(l => l.medico_id === selectedSlot.medico_id).map(l => ({
          id: l.id,
          nome_local: l.nome_local
        }));
        return (
          <AgendaInternaModal
            open={agendaModalOpen}
            onOpenChange={setAgendaModalOpen}
            slotId={selectedSlot.id}
            slotDataHora={selectedSlot.data_hora}
            localId={selectedSlot.local_id}
            localNome={selectedSlot.locais_atendimento?.nome_local || ""}
            medicoId={selectedSlot.medico_id}
            valorConsulta={medicoInfo?.valor_consulta || 0}
            percentualRepasse={medicoInfo?.percentual_repasse || 70}
            usuariosClinica={usuariosClinica}
            locais={slotLocais}
            onSuccess={() => {
              fetchData();
              setAgendaModalOpen(false);
            }}
          />
        );
      })()}
    </div>
  );
}
