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
import {
  CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building2,
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

interface ClinicaContext {
  clinicaData: any;
}

interface Slot {
  id: string;
  local_id: string;
  data_hora: string;
  disponivel: boolean;
  medico_id: string;
  locais_atendimento?: { nome_local: string };
  medicos?: { nome: string };
  consultas?: Array<{
    id: string;
    nome_paciente_consulta: string | null;
    origem: string;
    status_consulta: string;
    pacientes?: { nome: string };
  }>;
}

export default function ClinicaAgenda() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [medicos, setMedicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [filterMedico, setFilterMedico] = useState("todos");

  useEffect(() => {
    if (clinicaData?.id) {
      fetchData();
    }
  }, [clinicaData, currentDate]);

  async function fetchData() {
    setLoading(true);

    // Busca médicos vinculados
    const { data: vinculosData } = await supabase
      .from("clinicas_medicos")
      .select("medico_id, medicos(id, nome)")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    const medicosVinculados = vinculosData?.map((v: any) => v.medicos) || [];
    setMedicos(medicosVinculados);

    if (medicosVinculados.length === 0) {
      setSlots([]);
      setLoading(false);
      return;
    }

    const medicoIds = medicosVinculados.map((m: any) => m.id);
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });

    // Busca slots dos médicos vinculados
    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        locais_atendimento(nome_local),
        medicos(nome)
      `)
      .in("medico_id", medicoIds)
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
    setCurrentDate(subWeeks(currentDate, 1));
  }

  function handleNext() {
    setCurrentDate(addWeeks(currentDate, 1));
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

  function getSlotsForDay(day: Date) {
    return slots.filter((slot) => {
      const matchDay = isSameDay(parseISO(slot.data_hora), day);
      const matchMedico = filterMedico === "todos" || slot.medico_id === filterMedico;
      return matchDay && matchMedico;
    });
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });

  function renderSlot(slot: Slot) {
    const slotInfo = getSlotStatus(slot);
    const isLivre = slotInfo.status === "livre";
    const isOnline = slotInfo.origem === "online";
    const isInterna = slotInfo.origem === "interna";

    return (
      <div
        key={slot.id}
        className={`w-full p-2 rounded-lg text-left text-xs ${
          isLivre
            ? "bg-primary/10 border border-primary/20"
            : isOnline
            ? "bg-blue-600/90 text-white border-l-4 border-l-blue-400"
            : isInterna
            ? "bg-emerald-600/90 text-white border-l-4 border-l-emerald-400"
            : "bg-muted/50"
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className={`w-3 h-3 shrink-0 ${isLivre ? "" : "text-white/80"}`} />
          <span className="font-semibold">
            {format(parseISO(slot.data_hora), "HH:mm")}
          </span>
        </div>
        {slot.medicos && (
          <p className={`text-xs mt-1 ${isLivre ? "text-muted-foreground" : "text-white/70"}`}>
            Dr(a). {slot.medicos.nome}
          </p>
        )}
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
        ) : (
          <p className="mt-1 text-primary/70 font-medium">Disponível</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agenda</h2>
          <p className="text-muted-foreground">Visualize a agenda dos médicos vinculados</p>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border">
        <Button variant="outline" size="sm" onClick={handlePrev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <span className="font-medium capitalize">
            {format(weekStart, "dd/MM", { locale: ptBR })} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "dd/MM/yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="sm" onClick={handleToday}>
            Hoje
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Week View */}
      {medicos.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum médico vinculado à clínica</p>
          </CardContent>
        </Card>
      ) : (
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
                  <div className={`text-center mb-3 pb-2 border-b ${dayIsToday ? "border-primary" : "border-border"}`}>
                    <p className={`text-xs uppercase font-medium ${dayIsToday ? "text-primary" : "text-muted-foreground"}`}>
                      {format(day, "EEE", { locale: ptBR })}
                    </p>
                    <p className={`text-lg font-bold ${dayIsToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "dd")}
                    </p>
                  </div>

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
      )}
    </div>
  );
}
