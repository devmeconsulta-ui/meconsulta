import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Plus, Clock, Trash2, MapPin } from "lucide-react";
import { format, addDays, setHours, setMinutes, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicoContext {
  medicoData: any;
}

interface Local {
  id: string;
  nome_local: string;
  tipo_atendimento: string;
}

interface Slot {
  id: string;
  local_id: string;
  data_hora: string;
  disponivel: boolean;
  locais_atendimento?: Local;
}

export default function MedicoAgenda() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [locais, setLocais] = useState<Local[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocal, setSelectedLocal] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");

  useEffect(() => {
    fetchData();
  }, [medicoData]);

  async function fetchData() {
    if (!medicoData?.id) return;

    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local, tipo_atendimento")
      .eq("medico_id", medicoData.id)
      .eq("ativo", true);

    setLocais(locaisData || []);

    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        locais_atendimento(id, nome_local, tipo_atendimento)
      `)
      .eq("medico_id", medicoData.id)
      .gte("data_hora", new Date().toISOString())
      .order("data_hora", { ascending: true });

    setSlots(slotsData || []);
    setLoading(false);
  }

  async function handleAddSlot() {
    if (!selectedLocal || !selectedDate || !selectedTime || !medicoData?.id) {
      toast.error("Preencha todos os campos");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const dataHora = setMinutes(setHours(selectedDate, hours), minutes);

    // Check if slot already exists
    const existingSlot = slots.find(
      (slot) =>
        slot.local_id === selectedLocal &&
        format(parseISO(slot.data_hora), "yyyy-MM-dd HH:mm") === format(dataHora, "yyyy-MM-dd HH:mm")
    );

    if (existingSlot) {
      toast.error("Este horário já está cadastrado");
      return;
    }

    const { error } = await supabase.from("agenda_slots").insert({
      medico_id: medicoData.id,
      local_id: selectedLocal,
      data_hora: dataHora.toISOString(),
      disponivel: true,
    });

    if (error) {
      toast.error("Erro ao adicionar slot");
      return;
    }

    toast.success("Horário adicionado com sucesso!");
    fetchData();
  }

  async function handleToggleSlot(slot: Slot) {
    const { error } = await supabase
      .from("agenda_slots")
      .update({ disponivel: !slot.disponivel })
      .eq("id", slot.id);

    if (error) {
      toast.error("Erro ao atualizar slot");
      return;
    }

    fetchData();
  }

  async function handleDeleteSlot(slotId: string) {
    const { error } = await supabase.from("agenda_slots").delete().eq("id", slotId);

    if (error) {
      toast.error("Erro ao remover slot");
      return;
    }

    toast.success("Horário removido");
    fetchData();
  }

  const timeOptions = [];
  for (let h = 6; h <= 22; h++) {
    timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
    timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
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
      <div>
        <h2 className="text-2xl font-bold text-foreground">Agenda</h2>
        <p className="text-muted-foreground">Gerencie seus horários de atendimento</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Adicionar Slot */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Adicionar Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {locais.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Cadastre um local de atendimento primeiro
              </p>
            ) : (
              <>
                <div>
                  <Label>Local de Atendimento</Label>
                  <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um local" />
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

                <div>
                  <Label>Data</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    locale={ptBR}
                    className="rounded-md border"
                  />
                </div>

                <div>
                  <Label>Horário</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAddSlot} className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Horário
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lista de Slots */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Próximos Horários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum horário cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      slot.disponivel
                        ? "bg-green-50 border-green-200 dark:bg-green-900/10"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          slot.disponivel ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(parseISO(slot.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {slot.locais_atendimento?.nome_local}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={slot.disponivel ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleSlot(slot)}
                      >
                        {slot.disponivel ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
