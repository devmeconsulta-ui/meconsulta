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
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  hipotese_diagnostica: string | null;
  conduta: string | null;
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

    // Fetch previous anamneses for this patient
    const { data: anamnesesData } = await supabase
      .from("anamneses")
      .select(`
        id,
        created_at,
        queixa_principal,
        historia_doenca_atual,
        hipotese_diagnostica,
        conduta,
        medico:medicos(nome)
      `)
      .eq("paciente_id", pacienteId)
      .order("created_at", { ascending: false });

    setAnamneses(anamnesesData || []);
    setLoading(false);
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
            <TabsTrigger value="paciente" className="flex-1 min-w-[100px]">Paciente</TabsTrigger>
            <TabsTrigger value="historico" className="flex-1 min-w-[100px]">Histórico</TabsTrigger>
            <TabsTrigger value="anamneses" className="flex-1 min-w-[100px]">Anamneses</TabsTrigger>
            <TabsTrigger value="nova-anamnese" className="flex-1 min-w-[120px]">Nova Anamnese</TabsTrigger>
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
                      <Label className="text-muted-foreground text-xs">CPF</Label>
                      <p className="font-medium">{formatCPF(consulta.paciente?.cpf)}</p>
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
            <TabsContent value="anamneses" className="space-y-4">
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
                anamneses.map((anamnese) => (
                  <Card key={anamnese.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {format(new Date(anamnese.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </CardTitle>
                        <Badge variant="outline">{anamnese.medico?.nome || "Médico"}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {anamnese.queixa_principal && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Queixa Principal</Label>
                          <p className="text-sm">{anamnese.queixa_principal}</p>
                        </div>
                      )}
                      {anamnese.historia_doenca_atual && (
                        <div>
                          <Label className="text-muted-foreground text-xs">História da Doença Atual</Label>
                          <p className="text-sm">{anamnese.historia_doenca_atual}</p>
                        </div>
                      )}
                      {anamnese.hipotese_diagnostica && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Hipótese Diagnóstica</Label>
                          <p className="text-sm">{anamnese.hipotese_diagnostica}</p>
                        </div>
                      )}
                      {anamnese.conduta && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Conduta</Label>
                          <p className="text-sm">{anamnese.conduta}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

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
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}