import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Calendar, 
  FileText, 
  Heart, 
  Pill, 
  Activity,
  Save,
  Loader2,
  AlertCircle,
  Clock,
  Pencil,
  X,
  Lock,
  MapPin,
  ClipboardList
} from "lucide-react";
import { maskCPF } from "@/lib/maskUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PrescricoesTab from "./PrescricoesTab";
import ProntuarioImagensTab from "./ProntuarioImagensTab";

interface Consulta {
  id: string;
  data_hora: string;
  status_consulta: string;
  motivo_consulta: string | null;
  nome_paciente_consulta: string | null;
  paciente: {
    id: string;
    nome: string;
    cpf: string | null;
    data_nascimento: string | null;
    cidade: string | null;
    estado: string | null;
    bairro: string | null;
  } | null;
  dependente: {
    id: string;
    nome: string;
    parentesco: string;
  } | null;
  local?: {
    id: string;
    nome_local: string;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    tipo_atendimento: string;
  } | null;
}

interface HistoricoItem {
  id: string;
  tipo: string;
  descricao: string;
  detalhes: string | null;
}

interface Anamnese {
  id: string;
  created_at: string;
  queixa_principal: string | null;
  historia_doenca_atual: string | null;
  antecedentes_pessoais: string | null;
  antecedentes_familiares: string | null;
  exame_fisico: string | null;
  hipotese_diagnostica: string | null;
  conduta: string | null;
  observacoes: string | null;
  medico: { nome: string } | null;
}

interface ConsultaDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consulta: Consulta;
  onUpdate: () => void;
}

export default function ConsultaDetalhesModal({ 
  open, 
  onOpenChange, 
  consulta,
  onUpdate
}: ConsultaDetalhesModalProps) {
  const { currentUser } = useAuth();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAnamnese, setSelectedAnamnese] = useState<Anamnese | null>(null);
  const [isAnamneseModalOpen, setIsAnamneseModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Anamnese>>({});
  
  // Prontuário Livre
  const [prontuarioLivre, setProntuarioLivre] = useState("");
  const [prontuarioLivreId, setProntuarioLivreId] = useState<string | null>(null);
  const [savingProntuario, setSavingProntuario] = useState(false);

  const [novaAnamnese, setNovaAnamnese] = useState({
    queixa_principal: "",
    historia_doenca_atual: "",
    antecedentes_pessoais: "",
    antecedentes_familiares: "",
    exame_fisico: "",
    hipotese_diagnostica: "",
    conduta: "",
    observacoes: "",
  });

  const pacienteId = consulta.paciente?.id;

  useEffect(() => {
    if (open && pacienteId) {
      fetchData();
    }
  }, [open, pacienteId]);

  async function fetchData() {
    if (!pacienteId) return;
    
    setLoading(true);
    
    // Fetch patient medical history
    const { data: historicoData } = await supabase
      .from("historico_medico_paciente")
      .select("id, tipo, descricao, detalhes")
      .eq("paciente_id", pacienteId)
      .eq("ativo", true);

    setHistorico(historicoData || []);

    // Fetch previous anamneses for this patient - ONLY from the logged-in doctor
    const { data: anamnesesData } = await supabase
      .from("anamneses")
      .select(`
        id,
        created_at,
        queixa_principal,
        historia_doenca_atual,
        antecedentes_pessoais,
        antecedentes_familiares,
        exame_fisico,
        hipotese_diagnostica,
        conduta,
        observacoes,
        medico:medicos(nome)
      `)
      .eq("paciente_id", pacienteId)
      .eq("medico_id", currentUser?.medicoId)
      .order("created_at", { ascending: false });

    setAnamneses(anamnesesData || []);

    // Fetch prontuário livre for this consultation - ONLY from the logged-in doctor
    // @ts-ignore
    const { data: prontuarioData } = await supabase
      .from("prontuario_livre")
      .select("id, conteudo")
      .eq("consulta_id", consulta.id)
      .eq("medico_id", currentUser?.medicoId)
      .maybeSingle();

    if (prontuarioData) {
      setProntuarioLivre(prontuarioData.conteudo || "");
      setProntuarioLivreId(prontuarioData.id);
    } else {
      setProntuarioLivre("");
      setProntuarioLivreId(null);
    }

    setLoading(false);
  }

  async function handleSaveProntuarioLivre() {
    if (!currentUser?.medicoId || !pacienteId) {
      toast.error("Erro ao identificar médico ou paciente");
      return;
    }
    setSavingProntuario(true);

    if (prontuarioLivreId) {
      // @ts-ignore
      const { error } = await supabase
        .from("prontuario_livre")
        .update({ conteudo: prontuarioLivre })
        .eq("id", prontuarioLivreId);

      if (error) {
        toast.error("Erro ao salvar prontuário");
      } else {
        toast.success("Prontuário salvo com sucesso");
      }
    } else {
      // @ts-ignore
      const { data, error } = await supabase
        .from("prontuario_livre")
        .insert({
          consulta_id: consulta.id,
          medico_id: currentUser.medicoId,
          paciente_id: pacienteId,
          conteudo: prontuarioLivre,
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Erro ao salvar prontuário");
      } else {
        setProntuarioLivreId(data.id);
        toast.success("Prontuário salvo com sucesso");
      }
    }
    setSavingProntuario(false);
  }

  async function handleUpdateAnamnese() {
    if (!selectedAnamnese) return;
    setSaving(true);

    const { error } = await supabase
      .from("anamneses")
      .update({
        queixa_principal: editData.queixa_principal,
        historia_doenca_atual: editData.historia_doenca_atual,
        antecedentes_pessoais: editData.antecedentes_pessoais,
        antecedentes_familiares: editData.antecedentes_familiares,
        exame_fisico: editData.exame_fisico,
        hipotese_diagnostica: editData.hipotese_diagnostica,
        conduta: editData.conduta,
        observacoes: editData.observacoes,
      })
      .eq("id", selectedAnamnese.id);

    if (error) {
      toast.error("Erro ao atualizar anamnese");
    } else {
      toast.success("Anamnese atualizada com sucesso");
      setIsEditing(false);
      setIsAnamneseModalOpen(false);
      fetchData();
      onUpdate();
    }

    setSaving(false);
  }

  function openAnamneseDetails(anamnese: Anamnese) {
    setSelectedAnamnese(anamnese);
    setIsEditing(false);
    setIsAnamneseModalOpen(true);
  }

  function startEditing() {
    if (!selectedAnamnese) return;
    setEditData({
      queixa_principal: selectedAnamnese.queixa_principal || "",
      historia_doenca_atual: selectedAnamnese.historia_doenca_atual || "",
      antecedentes_pessoais: selectedAnamnese.antecedentes_pessoais || "",
      antecedentes_familiares: selectedAnamnese.antecedentes_familiares || "",
      exame_fisico: selectedAnamnese.exame_fisico || "",
      hipotese_diagnostica: selectedAnamnese.hipotese_diagnostica || "",
      conduta: selectedAnamnese.conduta || "",
      observacoes: selectedAnamnese.observacoes || "",
    });
    setIsEditing(true);
  }

  async function handleSaveAnamnese() {
    if (!currentUser?.medicoId || !pacienteId) {
      toast.error("Erro ao identificar médico ou paciente");
      return;
    }

    if (!novaAnamnese.queixa_principal) {
      toast.error("Preencha ao menos a queixa principal");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("anamneses")
      .insert({
        consulta_id: consulta.id,
        medico_id: currentUser.medicoId,
        paciente_id: pacienteId,
        ...novaAnamnese,
      });

    if (error) {
      console.error("Error saving anamnese:", error);
      toast.error("Erro ao salvar anamnese");
    } else {
      toast.success("Anamnese salva com sucesso");
      setNovaAnamnese({
        queixa_principal: "",
        historia_doenca_atual: "",
        antecedentes_pessoais: "",
        antecedentes_familiares: "",
        exame_fisico: "",
        hipotese_diagnostica: "",
        conduta: "",
        observacoes: "",
      });
      fetchData();
      onUpdate();
    }

    setSaving(false);
  }

  const alergias = historico.filter(h => h.tipo === "alergia");
  const condicoes = historico.filter(h => h.tipo === "condicao");
  const medicamentos = historico.filter(h => h.tipo === "medicamento");

  const calcularIdade = (dataNascimento: string | null) => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "Não informado";
    // Mask CPF: show only last 3 digits
    return `***.***.*${cpf.slice(-3)}-${cpf.slice(-2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Detalhes da Consulta
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="paciente" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="paciente" className="flex-1 min-w-[80px]">Paciente</TabsTrigger>
            <TabsTrigger value="historico" className="flex-1 min-w-[80px]">Histórico</TabsTrigger>
            <TabsTrigger value="anamneses" className="flex-1 min-w-[80px]">Prontuário</TabsTrigger>
            <TabsTrigger value="nova-anamnese" className="flex-1 min-w-[100px]">Novo Prontuário</TabsTrigger>
            <TabsTrigger value="prontuario-livre" className="flex-1 min-w-[120px]">Prontuário Livre</TabsTrigger>
            <TabsTrigger value="imagens" className="flex-1 min-w-[100px]">
              <Camera className="w-4 h-4 mr-1" />
              Imagens
            </TabsTrigger>
            <TabsTrigger value="prescricoes" className="flex-1 min-w-[120px]">
              <ClipboardList className="w-4 h-4 mr-1" />
              Prescrições
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            {/* Tab: Patient Data */}
            <TabsContent value="paciente" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Dados do Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Nome</Label>
                      <p className="font-medium">
                        {consulta.nome_paciente_consulta || consulta.paciente?.nome || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        CPF <Lock className="h-3 w-3" />
                      </Label>
                      <p className="font-medium text-muted-foreground">{maskCPF(consulta.paciente?.cpf)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Data de Nascimento</Label>
                      <p className="font-medium">
                        {consulta.paciente?.data_nascimento 
                          ? `${format(new Date(consulta.paciente.data_nascimento), "dd/MM/yyyy")} (${calcularIdade(consulta.paciente.data_nascimento)} anos)`
                          : "Não informado"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Localização</Label>
                      <p className="font-medium">
                        {consulta.paciente?.cidade && consulta.paciente?.estado 
                          ? `${consulta.paciente.cidade}/${consulta.paciente.estado}${consulta.paciente.bairro ? ` - ${consulta.paciente.bairro}` : ""}`
                          : "Não informado"}
                      </p>
                    </div>
                  </div>

                  {consulta.dependente && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Dependente de:</span> {consulta.paciente?.nome} ({consulta.dependente.parentesco})
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs">Por segurança, e-mail e telefone não são exibidos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Dados da Consulta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Data e Hora</Label>
                      <p className="font-medium">
                        {format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Status</Label>
                      <Badge variant="secondary" className="mt-1">
                        {consulta.status_consulta}
                      </Badge>
                    </div>
                  </div>
                  {/* Local de atendimento */}
                  {consulta.local && (
                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Local de Atendimento
                      </Label>
                      <p className="font-medium">
                        {consulta.local.nome_local}
                        {consulta.local.cidade && ` - ${consulta.local.cidade}`}
                        {consulta.local.estado && `/${consulta.local.estado}`}
                      </p>
                      {consulta.local.endereco && (
                        <p className="text-sm text-muted-foreground">{consulta.local.endereco}</p>
                      )}
                    </div>
                  )}
                  {consulta.motivo_consulta && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Motivo da Consulta</Label>
                      <p className="font-medium">{consulta.motivo_consulta}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Medical History */}
            <TabsContent value="historico" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        Alergias
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {alergias.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nenhuma alergia cadastrada</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {alergias.map((a) => (
                            <Badge key={a.id} variant="destructive">
                              {a.descricao}
                              {a.detalhes && <span className="ml-1 opacity-70">({a.detalhes})</span>}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-yellow-500" />
                        Condições de Saúde
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {condicoes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nenhuma condição cadastrada</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {condicoes.map((c) => (
                            <Badge key={c.id} variant="secondary">
                              {c.descricao}
                              {c.detalhes && <span className="ml-1 opacity-70">({c.detalhes})</span>}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Pill className="w-5 h-5 text-blue-500" />
                        Medicamentos em Uso
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {medicamentos.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nenhum medicamento cadastrado</p>
                      ) : (
                        <div className="space-y-2">
                          {medicamentos.map((m) => (
                            <div key={m.id} className="p-3 bg-muted/50 rounded-lg">
                              <p className="font-medium">{m.descricao}</p>
                              {m.detalhes && (
                                <p className="text-sm text-muted-foreground">{m.detalhes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tab: Previous Anamneses */}
            <TabsContent value="anamneses" className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : anamneses.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma anamnese registrada para este paciente</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {anamneses.map((anamnese) => (
                    <Card 
                      key={anamnese.id} 
                      className="border-l-4 border-l-primary/60 hover:shadow-md transition-all cursor-pointer bg-gradient-to-r from-primary/5 to-transparent"
                      onClick={() => openAnamneseDetails(anamnese)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0">
                                {anamnese.medico?.nome || "Médico"}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(anamnese.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="font-medium text-foreground">
                              {anamnese.queixa_principal || "Sem queixa principal registrada"}
                            </p>
                            {anamnese.hipotese_diagnostica && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                <span className="font-medium">Diagnóstico:</span> {anamnese.hipotese_diagnostica}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                            <FileText className="w-4 h-4 mr-1" />
                            Ver Detalhes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Modal de Detalhes da Anamnese */}
            <Dialog open={isAnamneseModalOpen} onOpenChange={setIsAnamneseModalOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden z-[60]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-primary">
                    <FileText className="w-5 h-5" />
                    Detalhes da Anamnese
                  </DialogTitle>
                </DialogHeader>
                
                {selectedAnamnese && (
                  <ScrollArea className="max-h-[65vh] pr-4">
                    <div className="space-y-4">
                      {/* Header Info */}
                      <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                        <Badge className="bg-primary text-primary-foreground">
                          {selectedAnamnese.medico?.nome || "Médico"}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(selectedAnamnese.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>

                      {isEditing ? (
                        /* Modo Edição */
                        <div className="space-y-4">
                          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <Label className="text-amber-600 font-medium flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Queixa Principal
                            </Label>
                            <Textarea
                              value={editData.queixa_principal || ""}
                              onChange={(e) => setEditData({ ...editData, queixa_principal: e.target.value })}
                              className="mt-2 border-amber-500/30 focus:border-amber-500"
                            />
                          </div>
                          
                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <Label className="text-blue-600 font-medium">História da Doença Atual</Label>
                            <Textarea
                              value={editData.historia_doenca_atual || ""}
                              onChange={(e) => setEditData({ ...editData, historia_doenca_atual: e.target.value })}
                              className="mt-2 border-blue-500/30 focus:border-blue-500"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                              <Label className="text-purple-600 font-medium">Antecedentes Pessoais</Label>
                              <Textarea
                                value={editData.antecedentes_pessoais || ""}
                                onChange={(e) => setEditData({ ...editData, antecedentes_pessoais: e.target.value })}
                                className="mt-2 border-purple-500/30 focus:border-purple-500"
                              />
                            </div>
                            <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                              <Label className="text-pink-600 font-medium">Antecedentes Familiares</Label>
                              <Textarea
                                value={editData.antecedentes_familiares || ""}
                                onChange={(e) => setEditData({ ...editData, antecedentes_familiares: e.target.value })}
                                className="mt-2 border-pink-500/30 focus:border-pink-500"
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                            <Label className="text-cyan-600 font-medium">Exame Físico</Label>
                            <Textarea
                              value={editData.exame_fisico || ""}
                              onChange={(e) => setEditData({ ...editData, exame_fisico: e.target.value })}
                              className="mt-2 border-cyan-500/30 focus:border-cyan-500"
                            />
                          </div>

                          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <Label className="text-green-600 font-medium">Hipótese Diagnóstica</Label>
                            <Textarea
                              value={editData.hipotese_diagnostica || ""}
                              onChange={(e) => setEditData({ ...editData, hipotese_diagnostica: e.target.value })}
                              className="mt-2 border-green-500/30 focus:border-green-500"
                            />
                          </div>

                          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <Label className="text-orange-600 font-medium">Conduta</Label>
                            <Textarea
                              value={editData.conduta || ""}
                              onChange={(e) => setEditData({ ...editData, conduta: e.target.value })}
                              className="mt-2 border-orange-500/30 focus:border-orange-500"
                            />
                          </div>

                          <div className="p-3 bg-slate-500/10 border border-slate-500/30 rounded-lg">
                            <Label className="text-slate-600 font-medium">Observações</Label>
                            <Textarea
                              value={editData.observacoes || ""}
                              onChange={(e) => setEditData({ ...editData, observacoes: e.target.value })}
                              className="mt-2 border-slate-500/30 focus:border-slate-500"
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button onClick={handleUpdateAnamnese} disabled={saving} className="gap-2">
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Salvar Alterações
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-2">
                              <X className="w-4 h-4" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Modo Visualização */
                        <div className="space-y-3">
                          {selectedAnamnese.queixa_principal && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                              <Label className="text-amber-600 font-medium text-xs uppercase tracking-wide">Queixa Principal</Label>
                              <p className="mt-1 text-foreground">{selectedAnamnese.queixa_principal}</p>
                            </div>
                          )}

                          {selectedAnamnese.historia_doenca_atual && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                              <Label className="text-blue-600 font-medium text-xs uppercase tracking-wide">História da Doença Atual</Label>
                              <p className="mt-1 text-foreground">{selectedAnamnese.historia_doenca_atual}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedAnamnese.antecedentes_pessoais && (
                              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                <Label className="text-purple-600 font-medium text-xs uppercase tracking-wide">Antecedentes Pessoais</Label>
                                <p className="mt-1 text-foreground text-sm">{selectedAnamnese.antecedentes_pessoais}</p>
                              </div>
                            )}
                            {selectedAnamnese.antecedentes_familiares && (
                              <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                                <Label className="text-pink-600 font-medium text-xs uppercase tracking-wide">Antecedentes Familiares</Label>
                                <p className="mt-1 text-foreground text-sm">{selectedAnamnese.antecedentes_familiares}</p>
                              </div>
                            )}
                          </div>

                          {selectedAnamnese.exame_fisico && (
                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                              <Label className="text-cyan-600 font-medium text-xs uppercase tracking-wide">Exame Físico</Label>
                              <p className="mt-1 text-foreground">{selectedAnamnese.exame_fisico}</p>
                            </div>
                          )}

                          {selectedAnamnese.hipotese_diagnostica && (
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <Label className="text-green-600 font-medium text-xs uppercase tracking-wide">Hipótese Diagnóstica</Label>
                              <p className="mt-1 text-foreground">{selectedAnamnese.hipotese_diagnostica}</p>
                            </div>
                          )}

                          {selectedAnamnese.conduta && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                              <Label className="text-orange-600 font-medium text-xs uppercase tracking-wide">Conduta</Label>
                              <p className="mt-1 text-foreground">{selectedAnamnese.conduta}</p>
                            </div>
                          )}

                          {selectedAnamnese.observacoes && (
                            <div className="p-3 bg-slate-500/10 border border-slate-500/30 rounded-lg">
                              <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Observações</Label>
                              <p className="mt-1 text-foreground">{selectedAnamnese.observacoes}</p>
                            </div>
                          )}

                          <div className="pt-3 border-t">
                            <Button variant="outline" onClick={startEditing} className="gap-2">
                              <Pencil className="w-4 h-4" />
                              Editar Anamnese
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </DialogContent>
            </Dialog>

            {/* Tab: New Anamnese */}
            <TabsContent value="nova-anamnese" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Nova Anamnese
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Queixa Principal *</Label>
                    <Textarea
                      value={novaAnamnese.queixa_principal}
                      onChange={(e) => setNovaAnamnese({ ...novaAnamnese, queixa_principal: e.target.value })}
                      placeholder="Descreva a queixa principal do paciente..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>História da Doença Atual</Label>
                    <Textarea
                      value={novaAnamnese.historia_doenca_atual}
                      onChange={(e) => setNovaAnamnese({ ...novaAnamnese, historia_doenca_atual: e.target.value })}
                      placeholder="Descreva a evolução dos sintomas..."
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Antecedentes Pessoais</Label>
                      <Textarea
                        value={novaAnamnese.antecedentes_pessoais}
                        onChange={(e) => setNovaAnamnese({ ...novaAnamnese, antecedentes_pessoais: e.target.value })}
                        placeholder="Doenças prévias, cirurgias..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Antecedentes Familiares</Label>
                      <Textarea
                        value={novaAnamnese.antecedentes_familiares}
                        onChange={(e) => setNovaAnamnese({ ...novaAnamnese, antecedentes_familiares: e.target.value })}
                        placeholder="Histórico familiar relevante..."
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Exame Físico</Label>
                    <Textarea
                      value={novaAnamnese.exame_fisico}
                      onChange={(e) => setNovaAnamnese({ ...novaAnamnese, exame_fisico: e.target.value })}
                      placeholder="Achados do exame físico..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Hipótese Diagnóstica</Label>
                    <Textarea
                      value={novaAnamnese.hipotese_diagnostica}
                      onChange={(e) => setNovaAnamnese({ ...novaAnamnese, hipotese_diagnostica: e.target.value })}
                      placeholder="Diagnóstico presumido..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Conduta</Label>
                    <Textarea
                      value={novaAnamnese.conduta}
                      onChange={(e) => setNovaAnamnese({ ...novaAnamnese, conduta: e.target.value })}
                      placeholder="Tratamento prescrito, exames solicitados..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={novaAnamnese.observacoes}
                      onChange={(e) => setNovaAnamnese({ ...novaAnamnese, observacoes: e.target.value })}
                      placeholder="Observações adicionais..."
                      className="mt-1"
                    />
                  </div>

                  <Button 
                    onClick={handleSaveAnamnese} 
                    disabled={saving}
                    className="w-full gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar Anamnese
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Prontuário Livre */}
            <TabsContent value="prontuario-livre" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Prontuário Livre
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Escreva livremente suas anotações sobre esta consulta. Este campo é totalmente livre para o médico registrar o que considerar necessário.
                  </p>
                  <Textarea
                    value={prontuarioLivre}
                    onChange={(e) => setProntuarioLivre(e.target.value)}
                    placeholder="Escreva aqui suas anotações, observações clínicas, evolução do paciente, plano terapêutico..."
                    rows={16}
                    className="text-sm font-mono resize-y min-h-[200px]"
                  />
                  <Button
                    onClick={handleSaveProntuarioLivre}
                    disabled={savingProntuario}
                    className="w-full gap-2"
                  >
                    {savingProntuario ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar Prontuário Livre
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Prescrições e Pedidos */}
            <TabsContent value="prescricoes">
              {pacienteId ? (
                <PrescricoesTab
                  consultaId={consulta.id}
                  pacienteId={pacienteId}
                  pacienteNome={consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente"}
                  pacienteCpf={consulta.paciente?.cpf || undefined}
                  onUpdate={onUpdate}
                />
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Paciente não identificado</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}