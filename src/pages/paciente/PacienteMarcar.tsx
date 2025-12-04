import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { Search, Star, Heart, MapPin, Calendar, Clock, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { brazilStates, citiesByState } from "@/data/brazilData";

interface PacienteContext {
  pacienteData: any;
}

export default function PacienteMarcar() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const navigate = useNavigate();
  
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [tipoAtendimento, setTipoAtendimento] = useState("");
  
  const [medicos, setMedicos] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedMedico, setSelectedMedico] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [locais, setLocais] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [agendando, setAgendando] = useState(false);

  useEffect(() => {
    if (pacienteData) {
      setEstado(pacienteData.estado || "");
      setCidade(pacienteData.cidade || "");
    }
    fetchEspecialidades();
    fetchFavoritos();
  }, [pacienteData]);

  async function fetchEspecialidades() {
    const { data } = await supabase
      .from("medicos")
      .select("especialidade")
      .eq("ativo", true)
      .not("especialidade", "is", null);
    
    const unique = [...new Set(data?.map(m => m.especialidade).filter(Boolean))] as string[];
    setEspecialidades(unique);
  }

  async function fetchFavoritos() {
    if (!pacienteData?.id) return;
    const { data } = await supabase
      .from("paciente_favoritos")
      .select("medico_id")
      .eq("paciente_id", pacienteData.id);
    setFavoritos(data?.map(f => f.medico_id) || []);
  }

  async function buscarMedicos() {
    setLoading(true);
    
    let query = supabase
      .from("medicos")
      .select(`
        *,
        locais_atendimento (*),
        medico_servicos (*),
        avaliacoes_medico (nota)
      `)
      .eq("ativo", true);

    if (especialidade) {
      query = query.eq("especialidade", especialidade);
    }

    const { data } = await query;

    // Filtrar por localização
    let filteredData = data || [];
    
    if (tipoAtendimento === "online") {
      filteredData = filteredData.filter(m => 
        m.locais_atendimento?.some((l: any) => l.tipo_atendimento === "online" && l.ativo)
      );
    } else if (cidade || estado) {
      filteredData = filteredData.filter(m => 
        m.locais_atendimento?.some((l: any) => {
          if (!l.ativo) return false;
          if (l.tipo_atendimento === "online") return true;
          if (cidade && l.cidade?.toLowerCase() !== cidade.toLowerCase()) return false;
          if (estado && l.estado?.toLowerCase() !== estado.toLowerCase()) return false;
          return true;
        })
      );
    }

    // Calcular média de avaliações
    const medicosComMedia = filteredData.map(m => ({
      ...m,
      mediaAvaliacao: m.avaliacoes_medico?.length 
        ? m.avaliacoes_medico.reduce((acc: number, av: any) => acc + av.nota, 0) / m.avaliacoes_medico.length
        : 0
    }));

    setMedicos(medicosComMedia);
    setLoading(false);
  }

  async function toggleFavorito(medicoId: string) {
    if (!pacienteData?.id) return;

    if (favoritos.includes(medicoId)) {
      await supabase
        .from("paciente_favoritos")
        .delete()
        .eq("paciente_id", pacienteData.id)
        .eq("medico_id", medicoId);
      setFavoritos(prev => prev.filter(id => id !== medicoId));
      toast.success("Removido dos favoritos");
    } else {
      await supabase
        .from("paciente_favoritos")
        .insert({ paciente_id: pacienteData.id, medico_id: medicoId });
      setFavoritos(prev => [...prev, medicoId]);
      toast.success("Adicionado aos favoritos");
    }
  }

  async function verAgenda(medico: any) {
    setSelectedMedico(medico);
    
    const now = new Date().toISOString();
    
    // Buscar slots disponíveis
    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        locais_atendimento (*)
      `)
      .eq("medico_id", medico.id)
      .eq("disponivel", true)
      .gte("data_hora", now)
      .order("data_hora", { ascending: true });

    // Buscar locais ativos
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("*")
      .eq("medico_id", medico.id)
      .eq("ativo", true);

    setSlots(slotsData || []);
    setLocais(locaisData || []);
  }

  async function confirmarConsulta() {
    if (!selectedSlot || !pacienteData?.id || !selectedMedico) return;

    setAgendando(true);

    const valorConsulta = selectedMedico.valor_consulta || 160;
    const percentualRepasse = selectedMedico.percentual_repasse || 70;
    const valorMedico = valorConsulta * (percentualRepasse / 100);
    const valorPlataforma = valorConsulta - valorMedico;

    // Criar consulta
    const { error: consultaError } = await supabase
      .from("consultas")
      .insert({
        medico_id: selectedMedico.id,
        paciente_id: pacienteData.id,
        data_hora: selectedSlot.data_hora,
        status_consulta: "aguardando_pagamento",
        status_pagamento: "pendente",
        status_repasse: "pendente",
        valor_consulta: valorConsulta,
        valor_medico: valorMedico,
        valor_plataforma: valorPlataforma,
      });

    if (consultaError) {
      toast.error("Erro ao agendar consulta");
      setAgendando(false);
      return;
    }

    // Marcar slot como indisponível
    await supabase
      .from("agenda_slots")
      .update({ disponivel: false })
      .eq("id", selectedSlot.id);

    toast.success("Consulta agendada com sucesso!");
    setConfirmDialog(false);
    setSelectedMedico(null);
    setSelectedSlot(null);
    setAgendando(false);
    navigate("/paciente/consultas");
  }

  // Agrupar slots por data
  const slotsPorData = slots.reduce((acc, slot) => {
    const date = format(new Date(slot.data_hora), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Marcar Consulta</h1>

      {/* Filtros */}
      <Card className="card-shadow">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => { setEstado(v); setCidade(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {brazilStates.map(s => (
                    <SelectItem key={s.sigla} value={s.sigla}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cidade</Label>
              <Select value={cidade} onValueChange={setCidade} disabled={!estado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cidade" />
                </SelectTrigger>
                <SelectContent>
                  {(citiesByState[estado] || []).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Especialidade</Label>
              <Select value={especialidade} onValueChange={setEspecialidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as especialidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {especialidades.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de atendimento</Label>
              <Select value={tipoAtendimento} onValueChange={setTipoAtendimento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={buscarMedicos} className="w-full gap-2" disabled={loading}>
            <Search className="w-4 h-4" />
            {loading ? "Buscando..." : "Buscar médicos"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Médicos */}
      <div className="space-y-4">
        {medicos.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {medicos.length} médico(s) encontrado(s)
          </p>
        )}
        
        {medicos.map(medico => (
          <Card key={medico.id} className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  {medico.foto_url ? (
                    <img src={medico.foto_url} alt={medico.nome} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">Dr(a). {medico.nome}</p>
                      <p className="text-sm text-muted-foreground">{medico.especialidade}</p>
                    </div>
                    <button
                      onClick={() => toggleFavorito(medico.id)}
                      className="p-1"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          favoritos.includes(medico.id)
                            ? "text-red-500 fill-red-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </div>
                  
                  {medico.mediaAvaliacao > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{medico.mediaAvaliacao.toFixed(1)}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {medico.medico_servicos?.slice(0, 3).map((s: any) => (
                      <Badge key={s.id} variant="secondary" className="text-xs">
                        {s.nome_servico}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-bold text-primary">
                      R$ {(medico.valor_consulta || 160).toFixed(2)}
                    </p>
                    <Button size="sm" onClick={() => verAgenda(medico)} className="gap-1">
                      Ver agenda
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {medicos.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Use os filtros acima para buscar médicos disponíveis
          </p>
        )}
      </div>

      {/* Modal Ver Agenda */}
      <Dialog open={!!selectedMedico && !confirmDialog} onOpenChange={() => setSelectedMedico(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                {selectedMedico?.foto_url ? (
                  <img src={selectedMedico.foto_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <p>Dr(a). {selectedMedico?.nome}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {selectedMedico?.especialidade}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Locais */}
            {locais.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Locais de atendimento:</p>
                <div className="space-y-2">
                  {locais.map(local => (
                    <div key={local.id} className="p-2 bg-muted/50 rounded-lg text-sm">
                      <p className="font-medium">{local.nome_local}</p>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {local.tipo_atendimento === "online" 
                          ? "Atendimento Online"
                          : `${local.cidade}, ${local.estado}`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slots */}
            {Object.keys(slotsPorData).length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm font-medium">Horários disponíveis:</p>
                {Object.entries(slotsPorData).map(([date, daySlots]) => (
                  <div key={date}>
                    <p className="text-sm font-medium text-primary mb-2">
                      {format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(daySlots as any[]).map(slot => (
                        <Button
                          key={slot.id}
                          variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {format(new Date(slot.data_hora), "HH:mm")}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhum horário disponível
              </p>
            )}

            {selectedSlot && (
              <Button className="w-full" onClick={() => setConfirmDialog(true)}>
                Confirmar horário
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p><strong>Médico:</strong> Dr(a). {selectedMedico?.nome}</p>
              <p><strong>Especialidade:</strong> {selectedMedico?.especialidade}</p>
              <p>
                <strong>Data/Hora:</strong>{" "}
                {selectedSlot && format(new Date(selectedSlot.data_hora), "dd/MM/yyyy 'às' HH:mm")}
              </p>
              {selectedSlot?.locais_atendimento && (
                <p>
                  <strong>Local:</strong> {selectedSlot.locais_atendimento.nome_local}
                </p>
              )}
              <p className="text-lg font-bold text-primary">
                <strong>Valor:</strong> R$ {(selectedMedico?.valor_consulta || 160).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDialog(false)}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={confirmarConsulta}
                disabled={agendando}
              >
                {agendando ? "Agendando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
