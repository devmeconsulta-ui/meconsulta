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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, User, Loader2, Check, X, Link2 } from "lucide-react";

interface Paciente {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
}

interface VincularPacienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  contatoId: string;
  contatoNome: string;
  currentPacienteId: string | null;
  onSuccess: () => void;
}

export function VincularPacienteModal({
  isOpen,
  onClose,
  contatoId,
  contatoNome,
  currentPacienteId,
  onSuccess,
}: VincularPacienteModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [currentPaciente, setCurrentPaciente] = useState<Paciente | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setPacientes([]);
      setSelectedPaciente(null);
      
      // Fetch current linked patient if exists
      if (currentPacienteId) {
        fetchCurrentPaciente();
      } else {
        setCurrentPaciente(null);
      }
    }
  }, [isOpen, currentPacienteId]);

  async function fetchCurrentPaciente() {
    const { data } = await supabase
      .from("pacientes")
      .select("id, nome, telefone, cpf")
      .eq("id", currentPacienteId)
      .single();
    
    if (data) {
      setCurrentPaciente(data as Paciente);
    }
  }

  async function searchPacientes(term: string) {
    if (term.length < 2) {
      setPacientes([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome, telefone, cpf")
        .or(`nome.ilike.%${term}%,telefone.ilike.%${term}%,cpf.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;
      setPacientes((data || []) as Paciente[]);
    } catch (error) {
      console.error("Error searching pacientes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVincular() {
    if (!selectedPaciente) {
      toast.error("Selecione um paciente");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("omni_contatos")
        .update({ paciente_id: selectedPaciente.id })
        .eq("id", contatoId);

      if (error) throw error;

      toast.success(`Contato vinculado a ${selectedPaciente.nome}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error linking patient:", error);
      toast.error("Erro ao vincular paciente");
    } finally {
      setSaving(false);
    }
  }

  async function handleDesvincular() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("omni_contatos")
        .update({ paciente_id: null })
        .eq("id", contatoId);

      if (error) throw error;

      toast.success("Paciente desvinculado");
      setCurrentPaciente(null);
      onSuccess();
    } catch (error) {
      console.error("Error unlinking patient:", error);
      toast.error("Erro ao desvincular paciente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular Paciente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Contato:</p>
            <p className="font-medium">{contatoNome}</p>
          </div>

          {currentPaciente && (
            <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Paciente vinculado:</p>
                  <p className="font-medium text-green-700 dark:text-green-300">
                    {currentPaciente.nome}
                  </p>
                  {currentPaciente.cpf && (
                    <p className="text-xs text-muted-foreground">CPF: {currentPaciente.cpf}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDesvincular}
                  disabled={saving}
                  className="text-destructive hover:text-destructive"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Desvincular
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Buscar paciente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome, CPF ou telefone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  searchPacientes(e.target.value);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {pacientes.length > 0 && (
            <ScrollArea className="max-h-48 border rounded-lg">
              <div className="divide-y">
                {pacientes.map((paciente) => (
                  <button
                    key={paciente.id}
                    type="button"
                    className={`w-full p-3 text-left hover:bg-muted transition-colors flex items-center justify-between ${
                      selectedPaciente?.id === paciente.id ? "bg-primary/10" : ""
                    }`}
                    onClick={() => setSelectedPaciente(paciente)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{paciente.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {paciente.cpf || paciente.telefone || "-"}
                        </p>
                      </div>
                    </div>
                    {selectedPaciente?.id === paciente.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {searchTerm.length >= 2 && pacientes.length === 0 && !loading && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhum paciente encontrado
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleVincular}
              disabled={!selectedPaciente || saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vincular
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
