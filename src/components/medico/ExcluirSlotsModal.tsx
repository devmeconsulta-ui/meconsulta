import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, eachDayOfInterval, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, AlertTriangle } from "lucide-react";

interface Local {
  id: string;
  nome_local: string;
}

interface ExcluirSlotsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locais: Local[];
  medicoId: string;
  onSuccess: () => void;
}

export function ExcluirSlotsModal({
  open,
  onOpenChange,
  locais,
  medicoId,
  onSuccess,
}: ExcluirSlotsModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState("todos");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [apenasLivres, setApenasLivres] = useState(true);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [consultasCount, setConsultasCount] = useState(0);

  async function handlePreview() {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Selecione o período");
      return;
    }

    setLoading(true);
    try {
      // Build query to count slots
      let query = supabase
        .from("agenda_slots")
        .select("id, disponivel", { count: "exact" })
        .eq("medico_id", medicoId)
        .gte("data_hora", startOfDay(dateRange.from).toISOString())
        .lte("data_hora", dateRange.to.toISOString());

      if (selectedLocal !== "todos") {
        query = query.eq("local_id", selectedLocal);
      }

      if (apenasLivres) {
        query = query.eq("disponivel", true);
      }

      const { count, data, error } = await query;
      if (error) throw error;

      // Check if any of these slots have consultations
      if (data && data.length > 0) {
        const slotIds = data.map(s => s.id);
        const { count: cCount } = await supabase
          .from("consultas")
          .select("id", { count: "exact", head: true })
          .in("agenda_slot_id", slotIds)
          .neq("status_consulta", "cancelada");

        setConsultasCount(cCount || 0);
      } else {
        setConsultasCount(0);
      }

      setPreviewCount(count || 0);
      if ((count || 0) > 0) {
        setShowConfirm(true);
      } else {
        toast.info("Nenhum slot encontrado com os filtros selecionados");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao verificar slots");
    } finally {
      setLoading(false);
    }
  }

  async function handleExcluir() {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    setShowConfirm(false);
    try {
      // First, get slot IDs that have active consultations (to skip them)
      let slotsQuery = supabase
        .from("agenda_slots")
        .select("id")
        .eq("medico_id", medicoId)
        .gte("data_hora", startOfDay(dateRange.from).toISOString())
        .lte("data_hora", dateRange.to.toISOString());

      if (selectedLocal !== "todos") {
        slotsQuery = slotsQuery.eq("local_id", selectedLocal);
      }

      if (apenasLivres) {
        slotsQuery = slotsQuery.eq("disponivel", true);
      }

      const { data: allSlots, error: slotsError } = await slotsQuery;
      if (slotsError) throw slotsError;

      if (!allSlots || allSlots.length === 0) {
        toast.info("Nenhum slot para excluir");
        setLoading(false);
        return;
      }

      const allSlotIds = allSlots.map(s => s.id);

      // Find slots that have active consultations
      const { data: slotsComConsulta } = await supabase
        .from("consultas")
        .select("agenda_slot_id")
        .in("agenda_slot_id", allSlotIds)
        .neq("status_consulta", "cancelada");

      const protectedIds = new Set(slotsComConsulta?.map(c => c.agenda_slot_id).filter(Boolean) || []);
      const idsToDelete = allSlotIds.filter(id => !protectedIds.has(id));

      if (idsToDelete.length === 0) {
        toast.info("Todos os slots neste período têm consultas agendadas e não podem ser excluídos");
        setLoading(false);
        return;
      }

      // Delete in batches
      const batchSize = 100;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase
          .from("agenda_slots")
          .delete()
          .in("id", batch);
        if (error) throw error;
      }

      const skipped = protectedIds.size;
      toast.success(
        `${idsToDelete.length} horário(s) excluído(s)${skipped > 0 ? `. ${skipped} horário(s) com consulta preservado(s).` : "!"}`
      );
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir horários");
    } finally {
      setLoading(false);
    }
  }

  const periodLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}`
    : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Excluir Horários em Massa
            </DialogTitle>
            <DialogDescription>
              Selecione o período e local para excluir horários. Slots com consultas agendadas serão preservados automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label>Local de Atendimento</Label>
              <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os locais</SelectItem>
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
                onSelect={(range) => {
                  setDateRange(range as { from: Date; to: Date });
                  setPreviewCount(null);
                }}
                locale={ptBR}
                numberOfMonths={1}
                className="rounded-md border pointer-events-auto"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="apenasLivres"
                checked={apenasLivres}
                onCheckedChange={(checked) => {
                  setApenasLivres(checked as boolean);
                  setPreviewCount(null);
                }}
              />
              <label htmlFor="apenasLivres" className="text-sm font-medium leading-none cursor-pointer">
                Excluir apenas horários livres (sem consulta e não bloqueados)
              </label>
            </div>

            <Button
              onClick={handlePreview}
              variant="destructive"
              className="w-full gap-2"
              disabled={loading || !dateRange?.from || !dateRange?.to}
            >
              <Trash2 className="w-4 h-4" />
              {loading ? "Verificando..." : "Verificar e Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar exclusão em massa
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a excluir <strong className="text-foreground">{previewCount} horário(s)</strong> no período de <strong className="text-foreground">{periodLabel}</strong>.
                </p>
                {consultasCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {consultasCount} horário(s) com consulta agendada serão <strong>preservados</strong> automaticamente.
                    </p>
                  </div>
                )}
                <p className="text-sm text-destructive font-medium">Esta ação não pode ser desfeita.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Excluindo..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
