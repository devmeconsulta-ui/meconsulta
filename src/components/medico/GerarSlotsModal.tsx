import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { format, addDays, setHours, setMinutes, isWeekend, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange } from "lucide-react";

interface Local {
  id: string;
  nome_local: string;
}

interface GerarSlotsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locais: Local[];
  medicoId: string;
  onSuccess: (firstDate?: Date) => void;
}

const intervalOptions = [
  { value: "15", label: "15 minutos" },
  { value: "20", label: "20 minutos" },
  { value: "30", label: "30 minutos" },
  { value: "45", label: "45 minutos" },
  { value: "60", label: "1 hora" },
];

export function GerarSlotsModal({
  open,
  onOpenChange,
  locais,
  medicoId,
  onSuccess,
}: GerarSlotsModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [horaInicial, setHoraInicial] = useState("08:00");
  const [horaFinal, setHoraFinal] = useState("18:00");
  const [intervalo, setIntervalo] = useState("30");
  const [excluirFimSemana, setExcluirFimSemana] = useState(true);

  const timeOptions = [];
  for (let h = 6; h <= 22; h++) {
    timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
    timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
  }

  async function handleGerar() {
    if (!selectedLocal) {
      toast.error("Selecione um local");
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Selecione o período");
      return;
    }

    setLoading(true);

    try {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const slotsToCreate: any[] = [];
      const intervalMinutes = parseInt(intervalo);
      const [horaInicialH, horaInicialM] = horaInicial.split(":").map(Number);
      const [horaFinalH, horaFinalM] = horaFinal.split(":").map(Number);

      for (const day of days) {
        // Skip weekends if option is checked
        if (excluirFimSemana && isWeekend(day)) {
          continue;
        }

        // Generate time slots for this day
        let currentTime = setMinutes(setHours(day, horaInicialH), horaInicialM);
        const endTime = setMinutes(setHours(day, horaFinalH), horaFinalM);

        while (currentTime < endTime) {
          slotsToCreate.push({
            medico_id: medicoId,
            local_id: selectedLocal,
            data_hora: currentTime.toISOString(),
            disponivel: true,
          });

          currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
        }
      }

      if (slotsToCreate.length === 0) {
        toast.error("Nenhum horário para gerar com os parâmetros selecionados");
        setLoading(false);
        return;
      }

      // Check for existing slots to avoid duplicates
      const { data: existingSlots } = await supabase
        .from("agenda_slots")
        .select("data_hora")
        .eq("medico_id", medicoId)
        .eq("local_id", selectedLocal)
        .gte("data_hora", dateRange.from.toISOString())
        .lte("data_hora", dateRange.to.toISOString());

      const existingTimes = new Set(
        existingSlots?.map((s) => s.data_hora) || []
      );

      const newSlots = slotsToCreate.filter(
        (slot) => !existingTimes.has(slot.data_hora)
      );

      if (newSlots.length === 0) {
        toast.info("Todos os horários já existem para este período");
        setLoading(false);
        return;
      }

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < newSlots.length; i += batchSize) {
        const batch = newSlots.slice(i, i + batchSize);
        const { error } = await supabase.from("agenda_slots").insert(batch);
        if (error) {
          throw error;
        }
      }

      toast.success(`${newSlots.length} horários criados com sucesso!`);
      onOpenChange(false);
      onSuccess(dateRange.from);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar horários");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5" />
            Gerar Horários em Lote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <Label>Local de Atendimento *</Label>
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
            <Label>Período *</Label>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => setDateRange(range as { from: Date; to: Date })}
              disabled={(date) => date < new Date()}
              locale={ptBR}
              numberOfMonths={1}
              className="rounded-md border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Horário Inicial</Label>
              <Select value={horaInicial} onValueChange={setHoraInicial}>
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

            <div>
              <Label>Horário Final</Label>
              <Select value={horaFinal} onValueChange={setHoraFinal}>
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
          </div>

          <div>
            <Label>Intervalo entre Consultas</Label>
            <Select value={intervalo} onValueChange={setIntervalo}>
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
              checked={excluirFimSemana}
              onCheckedChange={(checked) => setExcluirFimSemana(checked as boolean)}
            />
            <label
              htmlFor="excluirFimSemana"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Excluir finais de semana (sábado e domingo)
            </label>
          </div>

          <Button
            onClick={handleGerar}
            className="w-full"
            disabled={loading || !selectedLocal || !dateRange?.from || !dateRange?.to}
          >
            {loading ? "Gerando..." : "Gerar Horários"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
