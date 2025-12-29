import { useEffect, useState } from "react";
import { useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  DialogDescription,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { Search, Star, Heart, MapPin, Calendar, Clock, User, ChevronRight, UserPlus, Users, RefreshCw, Plus, Trash2, Video, Building2, Check, ExternalLink, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { brazilStates, citiesByState } from "@/data/brazilData";

interface PacienteContext {
  pacienteData: any;
}

interface Dependente {
  id: string;
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  parentesco: string;
  telefone?: string;
}

const parentescoOptions = [
  "Filho(a)",
  "Cônjuge",
  "Pai",
  "Mãe",
  "Irmão(ã)",
  "Avô(ó)",
  "Neto(a)",
  "Sobrinho(a)",
  "Tio(a)",
  "Primo(a)",
  "Outro"
];

export default function PacienteMarcar() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Verificar se é remarcação
  const consultaIdRemarcar = searchParams.get("remarcar");
  const medicoIdRemarcar = searchParams.get("medico");
  
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
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [agendando, setAgendando] = useState(false);

  // Dependentes
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [paraQuem, setParaQuem] = useState<string>("eu"); // "eu" ou id do dependente
  const [showAddDependente, setShowAddDependente] = useState(false);
  const [novoDependente, setNovoDependente] = useState({
    nome: "",
    cpf: "",
    data_nascimento: "",
    parentesco: "",
    telefone: ""
  });
  const [salvandoDependente, setSalvandoDependente] = useState(false);
  const [deleteDependenteId, setDeleteDependenteId] = useState<string | null>(null);

  // Remarcação
  const [consultaOriginal, setConsultaOriginal] = useState<any>(null);
  const [isRemarcacao, setIsRemarcacao] = useState(false);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    paymentId: string;
    invoiceUrl: string;
    dueDate: string;
    value: number;
    createdAt: number;
    consultaId: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const PAYMENT_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  useEffect(() => {
    if (pacienteData) {
      setEstado(pacienteData.estado || "");
      setCidade(pacienteData.cidade || "");
      fetchDependentes();
    }
    fetchEspecialidades();
    fetchFavoritos();
    
    // Verificar se é remarcação
    if (consultaIdRemarcar && medicoIdRemarcar) {
      setIsRemarcacao(true);
      fetchConsultaOriginal(consultaIdRemarcar, medicoIdRemarcar);
    }
  }, [pacienteData, consultaIdRemarcar, medicoIdRemarcar]);

  // Payment countdown timer
  useEffect(() => {
    if (!paymentData?.createdAt) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - paymentData.createdAt;
      const remaining = PAYMENT_TIMEOUT - elapsed;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [paymentData?.createdAt]);

  async function fetchConsultaOriginal(consultaId: string, medicoId: string) {
    const { data: consulta } = await supabase
      .from("consultas")
      .select("*")
      .eq("id", consultaId)
      .single();
    
    if (consulta) {
      setConsultaOriginal(consulta);
      // Buscar médico automaticamente
      const { data: medico } = await supabase
        .from("medicos")
        .select(`
          *,
          locais_atendimento (*),
          medico_servicos (*),
          avaliacoes_medico (nota)
        `)
        .eq("id", medicoId)
        .single();
      
      if (medico) {
        verAgenda(medico);
      }
    }
  }

  async function fetchDependentes() {
    if (!pacienteData?.id) return;
    const { data } = await supabase
      .from("paciente_dependentes")
      .select("*")
      .eq("paciente_id", pacienteData.id)
      .eq("ativo", true)
      .order("nome");
    setDependentes(data || []);
  }

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

    if (especialidade && especialidade !== "all") {
      query = query.eq("especialidade", especialidade);
    }

    const { data } = await query;

    // Filtrar por localização
    let filteredData = data || [];
    
    if (tipoAtendimento === "online") {
      filteredData = filteredData.filter(m => 
        m.locais_atendimento?.some((l: any) => l.tipo_atendimento === "online" && l.ativo)
      );
    } else if (tipoAtendimento === "presencial") {
      filteredData = filteredData.filter(m => 
        m.locais_atendimento?.some((l: any) => l.tipo_atendimento === "presencial" && l.ativo)
      );
    }
    
    if (cidade || estado) {
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

  async function fetchSlotsForMedico(medicoId: string, checkSelectedSlot: boolean = false) {
    const now = new Date().toISOString();
    
    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        *,
        locais_atendimento (*)
      `)
      .eq("medico_id", medicoId)
      .eq("disponivel", true)
      .gte("data_hora", now)
      .order("data_hora", { ascending: true });

    const newSlots = slotsData || [];
    
    // Check if selected slot is still available
    if (checkSelectedSlot && selectedSlot) {
      const slotStillAvailable = newSlots.some(slot => slot.id === selectedSlot.id);
      if (!slotStillAvailable) {
        toast.error("O horário selecionado foi ocupado por outro paciente. Por favor, escolha outro horário.", {
          duration: 5000,
        });
        setSelectedSlot(null);
      }
    }

    setSlots(newSlots);
  }

  async function verAgenda(medico: any) {
    setSelectedMedico(medico);
    setSelectedSlot(null);
    setSelectedLocal(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    await fetchSlotsForMedico(medico.id);

    // Buscar locais ativos
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("*")
      .eq("medico_id", medico.id)
      .eq("ativo", true);

    setLocais(locaisData || []);
  }

  // Auto-refresh slots every 30 seconds when viewing a doctor's schedule
  useEffect(() => {
    if (!selectedMedico?.id) return;

    const interval = setInterval(() => {
      fetchSlotsForMedico(selectedMedico.id, true); // Check if selected slot is still available
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedMedico?.id, selectedSlot]);

  async function confirmarConsulta() {
    console.log("confirmarConsulta chamada", { selectedSlot, pacienteData, selectedMedico });
    
    if (!selectedSlot || !pacienteData?.id || !selectedMedico) {
      console.error("Dados faltando:", { 
        selectedSlot: !!selectedSlot, 
        pacienteDataId: pacienteData?.id, 
        selectedMedico: !!selectedMedico 
      });
      toast.error("Dados incompletos. Tente novamente.");
      return;
    }
    setAgendando(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const valorConsulta = selectedMedico.valor_consulta || 160;
      const percentualRepasse = selectedMedico.percentual_repasse || 70;
      const valorMedico = valorConsulta * (percentualRepasse / 100);
      const valorPlataforma = valorConsulta - valorMedico;

      // Determinar para quem é a consulta
      const dependenteSelecionado = paraQuem !== "eu" 
        ? dependentes.find(d => d.id === paraQuem) 
        : null;
      
      const nomePacienteConsulta = dependenteSelecionado 
        ? dependenteSelecionado.nome 
        : pacienteData.nome;

      // Se for remarcação, cancelar consulta original
      if (isRemarcacao && consultaOriginal) {
        await supabase
          .from("consultas")
          .update({ status_consulta: "cancelada" })
          .eq("id", consultaOriginal.id);
      }

      // Criar consulta
      const { data: consultaData, error: consultaError } = await supabase
        .from("consultas")
        .insert({
          medico_id: selectedMedico.id,
          paciente_id: pacienteData.id,
          dependente_id: dependenteSelecionado?.id || null,
          nome_paciente_consulta: nomePacienteConsulta,
          data_hora: selectedSlot.data_hora,
          agenda_slot_id: selectedSlot.id,
          status_consulta: "aguardando_pagamento",
          status_pagamento: "pendente",
          status_repasse: "pendente",
          valor_consulta: valorConsulta,
          valor_medico: valorMedico,
          valor_plataforma: valorPlataforma,
          origem: "online",
        })
        .select("id")
        .single();

      if (consultaError) {
        throw consultaError;
      }

      // Marcar slot como indisponível
      await supabase
        .from("agenda_slots")
        .update({ disponivel: false })
        .eq("id", selectedSlot.id);

      // Create Asaas payment
      toast.info("Gerando cobrança...");
      
      const { data: paymentResponse, error: paymentError } = await supabase.functions.invoke(
        'create-asaas-payment',
        {
          body: { consulta_id: consultaData.id }
        }
      );

      if (paymentError || !paymentResponse?.success) {
        console.error("Payment error:", paymentError || paymentResponse);
        toast.warning("Consulta criada, mas houve erro ao gerar pagamento. Você pode pagar depois.");
        navigate("/paciente/consultas");
        return;
      }

      // Show payment screen
      setPaymentData({
        ...paymentResponse,
        createdAt: Date.now(),
        consultaId: consultaData.id,
      });
      setConfirmDialog(false);
      setShowPayment(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success("Cobrança gerada com sucesso!");

    } catch (error: any) {
      console.error("Error creating consultation:", error);
      if (error?.message?.includes("duplicate") || error?.code === "23505") {
        toast.error("Este horário já está reservado. Por favor, escolha outro.");
      } else {
        toast.error("Erro ao agendar consulta. Tente novamente.");
      }
    } finally {
      setAgendando(false);
    }
  }

  async function handleAddDependente() {
    if (!pacienteData?.id || !novoDependente.nome || !novoDependente.parentesco) {
      toast.error("Preencha nome e parentesco");
      return;
    }

    setSalvandoDependente(true);
    const { error } = await supabase
      .from("paciente_dependentes")
      .insert({
        paciente_id: pacienteData.id,
        nome: novoDependente.nome,
        cpf: novoDependente.cpf || null,
        data_nascimento: novoDependente.data_nascimento || null,
        parentesco: novoDependente.parentesco,
        telefone: novoDependente.telefone || null,
      });

    if (error) {
      toast.error("Erro ao adicionar dependente");
    } else {
      toast.success("Dependente adicionado!");
      fetchDependentes();
      setShowAddDependente(false);
      setNovoDependente({ nome: "", cpf: "", data_nascimento: "", parentesco: "", telefone: "" });
    }
    setSalvandoDependente(false);
  }

  async function handleDeleteDependente() {
    if (!deleteDependenteId) return;
    
    const { error } = await supabase
      .from("paciente_dependentes")
      .update({ ativo: false })
      .eq("id", deleteDependenteId);
    
    if (error) {
      toast.error("Erro ao remover dependente");
    } else {
      toast.success("Dependente removido");
      fetchDependentes();
      if (paraQuem === deleteDependenteId) {
        setParaQuem("eu");
      }
    }
    setDeleteDependenteId(null);
  }

  // Filtrar slots por local selecionado E excluir horários passados
  const now = new Date();
  const filteredSlots = slots.filter(slot => {
    const slotTime = parseISO(slot.data_hora);
    const isFuture = !isBefore(slotTime, now);
    const matchesLocal = selectedLocal ? slot.local_id === selectedLocal : true;
    return isFuture && matchesLocal;
  });

  // Contar slots por local
  const slotsPerLocal = locais.reduce((acc, local) => {
    acc[local.id] = slots.filter(slot => slot.local_id === local.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Agrupar slots por data (usando parseISO para evitar problemas de timezone)
  const slotsPorData = filteredSlots.reduce((acc, slot) => {
    const slotDate = parseISO(slot.data_hora);
    const date = format(slotDate, "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, any[]>);

  const dependenteSelecionado = paraQuem !== "eu" ? dependentes.find(d => d.id === paraQuem) : null;
  const selectedLocalData = selectedLocal ? locais.find(l => l.id === selectedLocal) : null;

  // Format time left for display
  const formatTimeLeft = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isTimeExpired = timeLeft !== null && timeLeft <= 0;
  const isTimeLow = timeLeft !== null && timeLeft <= 3 * 60 * 1000 && timeLeft > 0;

  // Payment Screen
  if (showPayment && paymentData) {
    return (
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            {isTimeExpired ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle className="text-xl text-destructive">Tempo Expirado</CardTitle>
                <p className="text-muted-foreground mt-2">
                  O tempo para pagamento expirou. Sua consulta será cancelada automaticamente.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Finalize o Pagamento</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Complete o pagamento para confirmar sua consulta
                </p>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {!isTimeExpired && (
              <>
                {/* Timer */}
                <div className={`p-4 rounded-lg text-center ${isTimeLow ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/50'}`}>
                  <p className={`text-sm ${isTimeLow ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Tempo restante para pagamento:
                  </p>
                  <p className={`text-3xl font-bold ${isTimeLow ? 'text-destructive' : 'text-primary'}`}>
                    {timeLeft !== null ? formatTimeLeft(timeLeft) : '15:00'}
                  </p>
                </div>

                {/* Consultation Summary */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <p><strong>Médico:</strong> Dr(a). {selectedMedico?.nome}</p>
                  <p><strong>Especialidade:</strong> {selectedMedico?.especialidade}</p>
                  {selectedSlot && (
                    <p><strong>Data/Hora:</strong> {format(new Date(selectedSlot.data_hora), "dd/MM/yyyy 'às' HH:mm")}</p>
                  )}
                  <p className="text-lg font-bold text-primary">
                    <strong>Valor:</strong> R$ {paymentData.value?.toFixed(2) || (selectedMedico?.valor_consulta || 160).toFixed(2)}
                  </p>
                </div>

                {/* Payment Options */}
                <div className="space-y-3">
                  <Button 
                    className="w-full gap-2 h-12 text-sm sm:text-base px-3 sm:px-4" 
                    onClick={() => navigate(`/pagamento/${paymentData.consultaId}`)}
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">Pagar com PIX ou Cartão</span>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Você será redirecionado para a página de pagamento seguro
                  </p>
                </div>
              </>
            )}

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                setShowPayment(false);
                setPaymentData(null);
                setSelectedMedico(null);
                setSelectedSlot(null);
                setIsRemarcacao(false);
                setConsultaOriginal(null);
                navigate("/paciente/consultas");
              }}
            >
              {isTimeExpired ? 'Voltar para Consultas' : 'Pagar Depois'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {isRemarcacao ? (
              <>
                <RefreshCw className="w-6 h-6" />
                Remarcar Consulta
              </>
            ) : (
              "Marcar Consulta"
            )}
          </h1>
          {isRemarcacao && consultaOriginal && (
            <p className="text-sm text-muted-foreground mt-1">
              Remarcando consulta de {format(new Date(consultaOriginal.data_hora), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          )}
        </div>
      </div>

      {/* Para quem é a consulta */}
      <Card className="card-shadow border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Para quem é esta consulta?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={paraQuem} onValueChange={setParaQuem} className="space-y-2">
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="eu" id="para-mim" />
              <Label htmlFor="para-mim" className="flex-1 cursor-pointer">
                <span className="font-medium">Para mim</span>
                <span className="text-sm text-muted-foreground block">{pacienteData?.nome}</span>
              </Label>
            </div>
            
            {dependentes.map(dep => (
              <div key={dep.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={dep.id} id={`dep-${dep.id}`} />
                <Label htmlFor={`dep-${dep.id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">{dep.nome}</span>
                  <span className="text-sm text-muted-foreground block">{dep.parentesco}</span>
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteDependenteId(dep.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </RadioGroup>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setShowAddDependente(true)}
          >
            <UserPlus className="w-4 h-4" />
            Marcar para outra pessoa
          </Button>
        </CardContent>
      </Card>

      {/* Filtros */}
      {!isRemarcacao && (
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
                    <SelectItem value="all">Todas</SelectItem>
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
                    <SelectItem value="all">Todos</SelectItem>
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
      )}

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

        {medicos.length === 0 && !loading && !isRemarcacao && (
          <p className="text-center text-muted-foreground py-8">
            Use os filtros acima para buscar médicos disponíveis
          </p>
        )}
      </div>

      {/* Modal Ver Agenda */}
      <Dialog open={!!selectedMedico && !confirmDialog} onOpenChange={() => setSelectedMedico(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
            {isRemarcacao && (
              <DialogDescription className="flex items-center gap-2 text-primary">
                <RefreshCw className="w-4 h-4" />
                Remarcação de consulta
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {/* Paciente da consulta */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Consulta para:</p>
              <p className="font-medium">
                {dependenteSelecionado ? (
                  <>
                    {dependenteSelecionado.nome}
                    <span className="text-sm text-muted-foreground ml-2">({dependenteSelecionado.parentesco})</span>
                  </>
                ) : (
                  pacienteData?.nome
                )}
              </p>
            </div>

            {/* Locais - Clicáveis */}
            {locais.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Selecione o local de atendimento:</p>
                <div className="space-y-2">
                  {/* Opção todos os locais */}
                  <button
                    onClick={() => {
                      setSelectedLocal(null);
                      setSelectedSlot(null);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                      selectedLocal === null
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                    }`}
                  >
                    <Building2 className={`w-4 h-4 ${selectedLocal === null ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${selectedLocal === null ? "text-primary" : "text-foreground"}`}>
                        Todos os locais
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {slots.length} horário(s)
                      </p>
                    </div>
                    {selectedLocal === null && <Check className="w-4 h-4 text-primary" />}
                  </button>

                  {locais.map(local => (
                    <button
                      key={local.id}
                      onClick={() => {
                        setSelectedLocal(local.id);
                        setSelectedSlot(null);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                        selectedLocal === local.id
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                      }`}
                    >
                      {local.tipo_atendimento === "online" ? (
                        <Video className={`w-4 h-4 ${selectedLocal === local.id ? "text-primary" : "text-muted-foreground"}`} />
                      ) : (
                        <MapPin className={`w-4 h-4 ${selectedLocal === local.id ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${selectedLocal === local.id ? "text-primary" : "text-foreground"}`}>
                          {local.nome_local}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {local.tipo_atendimento === "online" 
                            ? "Atendimento Online"
                            : `${local.cidade || ""}, ${local.estado || ""}`
                          }
                          {" · "}{slotsPerLocal[local.id] || 0} horário(s)
                        </p>
                      </div>
                      {selectedLocal === local.id && <Check className="w-4 h-4 text-primary" />}
                    </button>
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
                      {format(parseISO(date + "T00:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(daySlots as any[]).map(slot => (
                        <Button
                          key={slot.id}
                          variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {format(parseISO(slot.data_hora), "HH:mm")}
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
            <DialogTitle>{isRemarcacao ? "Confirmar Remarcação" : "Confirmar Consulta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p><strong>Paciente:</strong> {dependenteSelecionado?.nome || pacienteData?.nome}</p>
              {dependenteSelecionado && (
                <p className="text-sm text-muted-foreground">
                  (Dependente: {dependenteSelecionado.parentesco})
                </p>
              )}
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

            {isRemarcacao && (
              <p className="text-sm text-muted-foreground">
                A consulta anterior será automaticamente cancelada.
              </p>
            )}

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

      {/* Modal Adicionar Dependente */}
      <Dialog open={showAddDependente} onOpenChange={setShowAddDependente}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Adicionar Dependente
            </DialogTitle>
            <DialogDescription>
              Cadastre um familiar ou dependente para agendar consultas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input
                value={novoDependente.nome}
                onChange={(e) => setNovoDependente(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do dependente"
              />
            </div>
            <div>
              <Label>Parentesco *</Label>
              <Select 
                value={novoDependente.parentesco} 
                onValueChange={(v) => setNovoDependente(prev => ({ ...prev, parentesco: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o parentesco" />
                </SelectTrigger>
                <SelectContent>
                  {parentescoOptions.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CPF (opcional)</Label>
              <Input
                value={novoDependente.cpf}
                onChange={(e) => setNovoDependente(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label>Data de nascimento (opcional)</Label>
              <Input
                type="date"
                value={novoDependente.data_nascimento}
                onChange={(e) => setNovoDependente(prev => ({ ...prev, data_nascimento: e.target.value }))}
              />
            </div>
            <div>
              <Label>Telefone (opcional)</Label>
              <Input
                value={novoDependente.telefone}
                onChange={(e) => setNovoDependente(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddDependente(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddDependente}
                disabled={salvandoDependente}
              >
                {salvandoDependente ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão de dependente */}
      <AlertDialog open={!!deleteDependenteId} onOpenChange={() => setDeleteDependenteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover dependente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este dependente? As consultas já agendadas não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDependente}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
