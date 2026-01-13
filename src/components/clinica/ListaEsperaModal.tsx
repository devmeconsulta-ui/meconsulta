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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Users,
  Plus,
  Phone,
  User,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle,
  Calendar,
  Search,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { maskPhone, maskCPF } from "@/lib/maskUtils";

interface ListaEsperaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  medicos: Array<{ id: string; nome: string }>;
  onAgendarPaciente?: (paciente: ListaEsperaItem) => void;
}

interface ListaEsperaItem {
  id: string;
  medico_id: string;
  clinica_id: string | null;
  paciente_id: string | null;
  paciente_nome: string;
  paciente_telefone: string | null;
  paciente_cpf: string | null;
  motivo: string | null;
  prioridade: number;
  posicao: number;
  status: string;
  data_entrada: string;
  data_chamada: string | null;
  observacoes: string | null;
  medico?: { nome: string };
}

export function ListaEsperaModal({
  open,
  onOpenChange,
  clinicaId,
  medicos,
  onAgendarPaciente,
}: ListaEsperaModalProps) {
  const [listaEspera, setListaEspera] = useState<ListaEsperaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [filterMedico, setFilterMedico] = useState("todos");
  const [searchPaciente, setSearchPaciente] = useState("");
  const [pacientesBusca, setPacientesBusca] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [form, setForm] = useState({
    medicoId: "",
    pacienteId: "",
    pacienteNome: "",
    pacienteTelefone: "",
    pacienteCpf: "",
    motivo: "",
    prioridade: 0,
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      fetchListaEspera();
    }
  }, [open, clinicaId]);

  async function fetchListaEspera() {
    setLoading(true);
    const { data, error } = await supabase
      .from("lista_espera")
      .select(`*, medico:medicos(nome)`)
      .eq("clinica_id", clinicaId)
      .in("status", ["aguardando", "chamado"])
      .order("posicao", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar lista de espera");
    } else {
      setListaEspera((data as unknown as ListaEsperaItem[]) || []);
    }
    setLoading(false);
  }

  async function searchPacientes(query: string) {
    if (query.length < 2) {
      setPacientesBusca([]);
      return;
    }

    setSearchLoading(true);
    const { data } = await supabase
      .from("pacientes")
      .select("id, nome, telefone, cpf")
      .or(`nome.ilike.%${query}%,cpf.ilike.%${query}%`)
      .limit(5);

    setPacientesBusca(data || []);
    setSearchLoading(false);
  }

  function selectPaciente(paciente: any) {
    setForm({
      ...form,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      pacienteTelefone: paciente.telefone || "",
      pacienteCpf: paciente.cpf || "",
    });
    setPacientesBusca([]);
    setSearchPaciente("");
  }

  async function handleAddToList() {
    if (!form.medicoId) {
      toast.error("Selecione um médico");
      return;
    }
    if (!form.pacienteNome.trim()) {
      toast.error("Informe o nome do paciente");
      return;
    }

    // Get next position
    const { data: maxPosData } = await supabase
      .from("lista_espera")
      .select("posicao")
      .eq("medico_id", form.medicoId)
      .eq("clinica_id", clinicaId)
      .in("status", ["aguardando", "chamado"])
      .order("posicao", { ascending: false })
      .limit(1);

    const nextPos = (maxPosData?.[0]?.posicao || 0) + 1;

    const { error } = await supabase.from("lista_espera").insert({
      medico_id: form.medicoId,
      clinica_id: clinicaId,
      paciente_id: form.pacienteId || null,
      paciente_nome: form.pacienteNome,
      paciente_telefone: form.pacienteTelefone || null,
      paciente_cpf: form.pacienteCpf || null,
      motivo: form.motivo || null,
      prioridade: form.prioridade,
      posicao: nextPos,
      status: "aguardando",
      observacoes: form.observacoes || null,
    });

    if (error) {
      console.error(error);
      toast.error("Erro ao adicionar à lista");
      return;
    }

    toast.success("Paciente adicionado à lista de espera!");
    resetForm();
    setAddMode(false);
    fetchListaEspera();
  }

  async function handleChamar(item: ListaEsperaItem) {
    const { error } = await supabase
      .from("lista_espera")
      .update({ 
        status: "chamado",
        data_chamada: new Date().toISOString()
      })
      .eq("id", item.id);

    if (error) {
      toast.error("Erro ao chamar paciente");
      return;
    }

    toast.success(`${item.paciente_nome} foi chamado!`);
    fetchListaEspera();
  }

  async function handleAgendar(item: ListaEsperaItem) {
    if (onAgendarPaciente) {
      onAgendarPaciente(item);
      onOpenChange(false);
    }
  }

  async function handleRemover(item: ListaEsperaItem) {
    const { error } = await supabase
      .from("lista_espera")
      .update({ status: "cancelado" })
      .eq("id", item.id);

    if (error) {
      toast.error("Erro ao remover paciente");
      return;
    }

    toast.success("Paciente removido da lista");
    fetchListaEspera();
  }

  async function handleMovePosition(item: ListaEsperaItem, direction: "up" | "down") {
    const currentIndex = listaEspera.findIndex(i => i.id === item.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= listaEspera.length) return;

    const targetItem = listaEspera[targetIndex];
    
    // Swap positions
    const updates = [
      supabase.from("lista_espera").update({ posicao: targetItem.posicao }).eq("id", item.id),
      supabase.from("lista_espera").update({ posicao: item.posicao }).eq("id", targetItem.id),
    ];

    await Promise.all(updates);
    fetchListaEspera();
  }

  function resetForm() {
    setForm({
      medicoId: "",
      pacienteId: "",
      pacienteNome: "",
      pacienteTelefone: "",
      pacienteCpf: "",
      motivo: "",
      prioridade: 0,
      observacoes: "",
    });
  }

  const filteredLista = filterMedico === "todos" 
    ? listaEspera 
    : listaEspera.filter(i => i.medico_id === filterMedico);

  const statusColors: Record<string, string> = {
    aguardando: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    chamado: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Espera
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters and Add Button */}
          <div className="flex flex-wrap items-center gap-3">
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

            <Button
              size="sm"
              onClick={() => setAddMode(!addMode)}
              className="ml-auto gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>

          {/* Add Form */}
          {addMode && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Médico *</Label>
                    <Select value={form.medicoId} onValueChange={(v) => setForm({ ...form, medicoId: v })}>
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
                    <Label>Prioridade</Label>
                    <Select value={String(form.prioridade)} onValueChange={(v) => setForm({ ...form, prioridade: parseInt(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Normal</SelectItem>
                        <SelectItem value="1">Alta</SelectItem>
                        <SelectItem value="2">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Buscar paciente existente */}
                <div className="relative">
                  <Label>Buscar paciente existente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite nome ou CPF..."
                      value={searchPaciente}
                      onChange={(e) => {
                        setSearchPaciente(e.target.value);
                        searchPacientes(e.target.value);
                      }}
                      className="pl-10"
                    />
                  </div>
                  {pacientesBusca.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-card border rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {pacientesBusca.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectPaciente(p)}
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                        >
                          {p.nome} {p.cpf && `- ${maskCPF(p.cpf)}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nome do paciente *</Label>
                    <Input
                      value={form.pacienteNome}
                      onChange={(e) => setForm({ ...form, pacienteNome: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={form.pacienteTelefone}
                      onChange={(e) => setForm({ ...form, pacienteTelefone: maskPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={form.pacienteCpf}
                      onChange={(e) => setForm({ ...form, pacienteCpf: maskCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div>
                  <Label>Motivo da consulta</Label>
                  <Input
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    placeholder="Ex: Consulta de rotina, retorno..."
                  />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setAddMode(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddToList}>
                    Adicionar à Lista
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredLista.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Lista de espera vazia</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLista.map((item, index) => (
                <Card key={item.id} className={`${item.status === "chamado" ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20" : ""}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Position */}
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleMovePosition(item, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <span className="text-lg font-bold text-primary">{item.posicao}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleMovePosition(item, "down")}
                          disabled={index === filteredLista.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{item.paciente_nome}</span>
                          {item.prioridade === 1 && (
                            <Badge className="bg-amber-500 text-white text-[10px]">Alta</Badge>
                          )}
                          {item.prioridade === 2 && (
                            <Badge className="bg-red-500 text-white text-[10px]">Urgente</Badge>
                          )}
                          <Badge className={`text-[10px] ${statusColors[item.status] || ""}`}>
                            {item.status === "aguardando" ? "Aguardando" : "Chamado"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {item.medico?.nome && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Dr(a). {item.medico.nome}
                            </span>
                          )}
                          {item.paciente_telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {item.paciente_telefone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(item.data_entrada), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {item.motivo && (
                          <p className="text-xs mt-1 text-muted-foreground">{item.motivo}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {item.status === "aguardando" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChamar(item)}
                            className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Phone className="w-3 h-3" />
                            Chamar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleAgendar(item)}
                          className="gap-1"
                        >
                          <Calendar className="w-3 h-3" />
                          Agendar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemover(item)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
