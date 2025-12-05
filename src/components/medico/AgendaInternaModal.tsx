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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Phone, FileText, Search } from "lucide-react";

interface UsuarioClinica {
  id: string;
  nome: string;
  papel: string;
}

interface Paciente {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
}

interface AgendaInternaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotId: string;
  slotDataHora: string;
  localNome: string;
  medicoId: string;
  valorConsulta: number;
  percentualRepasse: number;
  usuariosClinica: UsuarioClinica[];
  onSuccess: () => void;
}

export function AgendaInternaModal({
  open,
  onOpenChange,
  slotId,
  slotDataHora,
  localNome,
  medicoId,
  valorConsulta,
  percentualRepasse,
  usuariosClinica,
  onSuccess,
}: AgendaInternaModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    tipoAtendimento: "presencial",
    usuarioClinicaId: "",
  });

  useEffect(() => {
    if (open) {
      searchPacientes("");
    }
  }, [open]);

  async function searchPacientes(term: string) {
    const query = supabase
      .from("pacientes")
      .select("id, nome, telefone, cpf")
      .order("nome");

    if (term) {
      query.or(`nome.ilike.%${term}%,telefone.ilike.%${term}%,cpf.ilike.%${term}%`);
    }

    const { data } = await query.limit(10);
    setPacientes(data || []);
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    searchPacientes(value);
  }

  function selectPaciente(paciente: Paciente) {
    setSelectedPaciente(paciente);
    setShowNewPatient(false);
    setFormData({
      ...formData,
      nome: paciente.nome,
      telefone: paciente.telefone || "",
      cpf: paciente.cpf || "",
    });
  }

  function handleNewPatient() {
    setSelectedPaciente(null);
    setShowNewPatient(true);
    setFormData({
      ...formData,
      nome: searchTerm,
      telefone: "",
      cpf: "",
    });
  }

  async function handleSubmit() {
    if (!formData.nome.trim()) {
      toast.error("Nome do paciente é obrigatório");
      return;
    }

    if (!formData.telefone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }

    setLoading(true);

    try {
      let pacienteId = selectedPaciente?.id;

      // Create new patient if needed
      if (!pacienteId) {
        const { data: newPaciente, error: pacienteError } = await supabase
          .from("pacientes")
          .insert({
            nome: formData.nome,
            telefone: formData.telefone,
            cpf: formData.cpf || null,
          })
          .select()
          .single();

        if (pacienteError) {
          throw new Error("Erro ao criar paciente");
        }

        pacienteId = newPaciente.id;
      }

      // Calculate values
      const valorMedico = (valorConsulta * percentualRepasse) / 100;
      const valorPlataforma = valorConsulta - valorMedico;

      // Create consultation
      const { error: consultaError } = await supabase.from("consultas").insert({
        medico_id: medicoId,
        paciente_id: pacienteId,
        data_hora: slotDataHora,
        origem: "interna",
        status_consulta: "confirmada",
        status_pagamento: "pendente",
        valor_consulta: valorConsulta,
        valor_medico: valorMedico,
        valor_plataforma: valorPlataforma,
        agenda_slot_id: slotId,
        usuario_clinica_id: formData.usuarioClinicaId || null,
        nome_paciente_consulta: formData.nome,
      });

      if (consultaError) {
        throw new Error("Erro ao criar consulta");
      }

      // Mark slot as unavailable
      await supabase
        .from("agenda_slots")
        .update({ disponivel: false })
        .eq("id", slotId);

      toast.success("Consulta agendada com sucesso!");
      onOpenChange(false);
      onSuccess();

      // Reset form
      setFormData({
        nome: "",
        telefone: "",
        cpf: "",
        tipoAtendimento: "presencial",
        usuarioClinicaId: "",
      });
      setSelectedPaciente(null);
      setShowNewPatient(false);
      setSearchTerm("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao agendar consulta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Consulta Interna</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Slot info */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">
              {format(parseISO(slotDataHora), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-muted-foreground">{localNome}</p>
          </div>

          {/* Patient search */}
          {!showNewPatient && !selectedPaciente && (
            <div className="space-y-2">
              <Label>Buscar Paciente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, telefone ou CPF..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {pacientes.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {pacientes.map((paciente) => (
                    <button
                      key={paciente.id}
                      className="w-full p-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                      onClick={() => selectPaciente(paciente)}
                    >
                      <p className="font-medium">{paciente.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {paciente.telefone || "Sem telefone"}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleNewPatient}
              >
                <User className="w-4 h-4 mr-2" />
                Novo Paciente
              </Button>
            </div>
          )}

          {/* Selected patient or new patient form */}
          {(selectedPaciente || showNewPatient) && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-base">
                  {selectedPaciente ? "Paciente Selecionado" : "Novo Paciente"}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPaciente(null);
                    setShowNewPatient(false);
                  }}
                >
                  Trocar
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    disabled={!!selectedPaciente}
                    placeholder="Nome do paciente"
                  />
                </div>

                <div>
                  <Label>Telefone *</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    disabled={!!selectedPaciente}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <Label>CPF (opcional)</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    disabled={!!selectedPaciente}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </>
          )}

          {/* Staff who is booking */}
          {usuariosClinica.length > 0 && (
            <div>
              <Label>Agendado por</Label>
              <Select
                value={formData.usuarioClinicaId}
                onValueChange={(value) => setFormData({ ...formData, usuarioClinicaId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione quem está agendando" />
                </SelectTrigger>
                <SelectContent>
                  {usuariosClinica.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome} ({usuario.papel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Value info */}
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Valor da consulta</p>
            <p className="text-lg font-bold text-primary">
              R$ {valorConsulta.toFixed(2).replace(".", ",")}
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={loading || (!selectedPaciente && !showNewPatient)}
          >
            {loading ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
