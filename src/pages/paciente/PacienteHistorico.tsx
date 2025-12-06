import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Calendar, 
  Download,
  Plus,
  Pill,
  Heart,
  Activity,
  Stethoscope,
  Trash2,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface HistoricoItem {
  id: string;
  tipo: string;
  descricao: string;
  detalhes: string | null;
  ativo: boolean;
}

interface ConsultaAnterior {
  id: string;
  data_hora: string;
  medico: { nome: string; especialidade: string | null } | null;
  motivo_consulta: string | null;
  status_consulta: string;
}

export default function PacienteHistorico() {
  const { currentUser } = useAuth();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [consultas, setConsultas] = useState<ConsultaAnterior[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [novoItem, setNovoItem] = useState({
    tipo: "alergia",
    descricao: "",
    detalhes: "",
  });

  useEffect(() => {
    if (currentUser?.pacienteId) {
      fetchData();
    }
  }, [currentUser?.pacienteId]);

  async function fetchData() {
    if (!currentUser?.pacienteId) return;
    
    setLoading(true);
    
    // Fetch historical medical data
    const { data: historicoData } = await supabase
      .from("historico_medico_paciente")
      .select("*")
      .eq("paciente_id", currentUser.pacienteId)
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    setHistorico(historicoData || []);

    // Fetch past consultations
    const { data: consultasData } = await supabase
      .from("consultas")
      .select(`
        id,
        data_hora,
        motivo_consulta,
        status_consulta,
        medico:medicos!consultas_medico_id_fkey(nome, especialidade)
      `)
      .eq("paciente_id", currentUser.pacienteId)
      .eq("status_consulta", "realizada")
      .order("data_hora", { ascending: false })
      .limit(10);

    setConsultas(consultasData || []);
    setLoading(false);
  }

  async function handleAddItem() {
    if (!novoItem.descricao || !currentUser?.pacienteId) {
      toast.error("Preencha a descrição");
      return;
    }

    setSaving(true);
    
    const { error } = await supabase
      .from("historico_medico_paciente")
      .insert({
        paciente_id: currentUser.pacienteId,
        tipo: novoItem.tipo,
        descricao: novoItem.descricao,
        detalhes: novoItem.detalhes || null,
      });

    if (error) {
      toast.error("Erro ao adicionar item");
    } else {
      toast.success("Item adicionado com sucesso");
      setNovoItem({ tipo: "alergia", descricao: "", detalhes: "" });
      setDialogOpen(false);
      fetchData();
    }
    
    setSaving(false);
  }

  async function handleDeleteItem(id: string) {
    const { error } = await supabase
      .from("historico_medico_paciente")
      .update({ ativo: false })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover item");
    } else {
      toast.success("Item removido");
      fetchData();
    }
  }

  const alergias = historico.filter(h => h.tipo === "alergia");
  const condicoes = historico.filter(h => h.tipo === "condicao");
  const medicamentos = historico.filter(h => h.tipo === "medicamento");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Histórico Médico</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seu histórico de saúde e consultas
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar histórico
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alergias.length}</p>
                <p className="text-xs text-muted-foreground">Alergias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{condicoes.length}</p>
                <p className="text-xs text-muted-foreground">Condições</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Pill className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{medicamentos.length}</p>
                <p className="text-xs text-muted-foreground">Medicamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{consultas.length}</p>
                <p className="text-xs text-muted-foreground">Consultas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações de Saúde */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Informações de Saúde
            </CardTitle>
            <CardDescription>
              Mantenha suas informações médicas atualizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Alergias */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Alergias</h4>
                <Dialog open={dialogOpen && novoItem.tipo === "alergia"} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (open) setNovoItem({ ...novoItem, tipo: "alergia" });
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Alergia</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome da substância *</Label>
                        <Input 
                          value={novoItem.descricao}
                          onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                          placeholder="Ex: Dipirona, Penicilina..."
                        />
                      </div>
                      <div>
                        <Label>Detalhes (opcional)</Label>
                        <Input 
                          value={novoItem.detalhes}
                          onChange={(e) => setNovoItem({ ...novoItem, detalhes: e.target.value })}
                          placeholder="Ex: Causa inchaço, erupção cutânea..."
                        />
                      </div>
                      <Button onClick={handleAddItem} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-wrap gap-2">
                {alergias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma alergia cadastrada</p>
                ) : (
                  alergias.map((alergia) => (
                    <Badge key={alergia.id} variant="destructive" className="px-3 py-1 gap-2">
                      {alergia.descricao}
                      <button onClick={() => handleDeleteItem(alergia.id)} className="hover:text-destructive-foreground/70">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Condições */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Condições de Saúde</h4>
                <Dialog open={dialogOpen && novoItem.tipo === "condicao"} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (open) setNovoItem({ tipo: "condicao", descricao: "", detalhes: "" });
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Condição de Saúde</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome da condição *</Label>
                        <Input 
                          value={novoItem.descricao}
                          onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                          placeholder="Ex: Hipertensão, Diabetes..."
                        />
                      </div>
                      <div>
                        <Label>Detalhes (opcional)</Label>
                        <Input 
                          value={novoItem.detalhes}
                          onChange={(e) => setNovoItem({ ...novoItem, detalhes: e.target.value })}
                          placeholder="Ex: Diagnosticado em 2020..."
                        />
                      </div>
                      <Button onClick={handleAddItem} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-wrap gap-2">
                {condicoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma condição cadastrada</p>
                ) : (
                  condicoes.map((condicao) => (
                    <Badge key={condicao.id} variant="secondary" className="px-3 py-1 gap-2">
                      {condicao.descricao}
                      <button onClick={() => handleDeleteItem(condicao.id)} className="hover:text-foreground/70">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Medicamentos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Medicamentos em Uso</h4>
                <Dialog open={dialogOpen && novoItem.tipo === "medicamento"} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (open) setNovoItem({ tipo: "medicamento", descricao: "", detalhes: "" });
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Medicamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do medicamento *</Label>
                        <Input 
                          value={novoItem.descricao}
                          onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                          placeholder="Ex: Losartana 50mg..."
                        />
                      </div>
                      <div>
                        <Label>Frequência (opcional)</Label>
                        <Input 
                          value={novoItem.detalhes}
                          onChange={(e) => setNovoItem({ ...novoItem, detalhes: e.target.value })}
                          placeholder="Ex: 1x ao dia pela manhã..."
                        />
                      </div>
                      <Button onClick={handleAddItem} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                {medicamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum medicamento cadastrado</p>
                ) : (
                  medicamentos.map((med) => (
                    <div
                      key={med.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Pill className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{med.descricao}</p>
                          {med.detalhes && (
                            <p className="text-xs text-muted-foreground">{med.detalhes}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteItem(med.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consultas Anteriores */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Consultas Realizadas
            </CardTitle>
            <CardDescription>
              Histórico das suas consultas realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consultas.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma consulta realizada ainda
                </p>
              ) : (
                consultas.map((consulta) => (
                  <div
                    key={consulta.id}
                    className="p-4 bg-muted/50 rounded-xl border border-border/50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{consulta.medico?.nome || "Médico"}</p>
                        <p className="text-sm text-muted-foreground">
                          {consulta.medico?.especialidade}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(consulta.data_hora), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    {consulta.motivo_consulta && (
                      <div className="mt-3 p-2 bg-background rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Motivo:</span>{" "}
                          {consulta.motivo_consulta}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="card-shadow border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Mantenha seu histórico atualizado</h3>
              <p className="text-muted-foreground mt-1">
                Um histórico médico completo ajuda os profissionais de saúde a oferecer
                um atendimento mais preciso e personalizado. Adicione informações sobre
                alergias, condições de saúde e medicamentos em uso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}