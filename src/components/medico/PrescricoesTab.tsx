import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Stethoscope, 
  FileCheck, 
  Pill, 
  Loader2, 
  Save, 
  Printer, 
  Download,
  Plus,
  Clock,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrescricaoDocumento {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  dados_adicionais: any;
  created_at: string;
  medico: { nome: string } | null;
}

interface PrescricoesTabProps {
  consultaId: string;
  pacienteId: string;
  pacienteNome: string;
  onUpdate: () => void;
}

export default function PrescricoesTab({ 
  consultaId, 
  pacienteId, 
  pacienteNome,
  onUpdate 
}: PrescricoesTabProps) {
  const { currentUser } = useAuth();
  const [documentos, setDocumentos] = useState<PrescricaoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("lista");
  const [selectedDocumento, setSelectedDocumento] = useState<PrescricaoDocumento | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Forms state
  const [exameForm, setExameForm] = useState({
    titulo: "Pedido de Exame",
    exames: "",
    indicacao_clinica: "",
    observacoes: "",
  });

  const [atestadoForm, setAtestadoForm] = useState({
    titulo: "Atestado Médico",
    dias_afastamento: "",
    cid: "",
    motivo: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
  });

  const [receitaForm, setReceitaForm] = useState({
    titulo: "Receita Médica",
    medicamentos: "",
    posologia: "",
    observacoes: "",
  });

  useEffect(() => {
    fetchDocumentos();
  }, [consultaId, pacienteId]);

  async function fetchDocumentos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("prescricoes_documentos")
      .select(`
        id,
        tipo,
        titulo,
        conteudo,
        dados_adicionais,
        created_at,
        medico:medicos(nome)
      `)
      .eq("consulta_id", consultaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar documentos:", error);
    } else {
      setDocumentos(data || []);
    }
    setLoading(false);
  }

  async function handleSaveExame() {
    if (!currentUser?.medicoId) {
      toast.error("Erro ao identificar médico");
      return;
    }

    if (!exameForm.exames) {
      toast.error("Preencha os exames solicitados");
      return;
    }

    setSaving(true);
    const conteudo = `PEDIDO DE EXAME\n\nPaciente: ${pacienteNome}\n\nExames Solicitados:\n${exameForm.exames}\n\nIndicação Clínica:\n${exameForm.indicacao_clinica}\n\nObservações:\n${exameForm.observacoes}`;

    const { error } = await supabase
      .from("prescricoes_documentos")
      .insert({
        consulta_id: consultaId,
        paciente_id: pacienteId,
        medico_id: currentUser.medicoId,
        tipo: "exame",
        titulo: exameForm.titulo,
        conteudo,
        dados_adicionais: exameForm,
      });

    if (error) {
      toast.error("Erro ao salvar pedido de exame");
    } else {
      toast.success("Pedido de exame salvo com sucesso");
      setExameForm({ titulo: "Pedido de Exame", exames: "", indicacao_clinica: "", observacoes: "" });
      fetchDocumentos();
      onUpdate();
      setActiveTab("lista");
    }
    setSaving(false);
  }

  async function handleSaveAtestado() {
    if (!currentUser?.medicoId) {
      toast.error("Erro ao identificar médico");
      return;
    }

    if (!atestadoForm.dias_afastamento || !atestadoForm.motivo) {
      toast.error("Preencha os dias de afastamento e motivo");
      return;
    }

    setSaving(true);
    const conteudo = `ATESTADO MÉDICO\n\nAtesto para os devidos fins que o(a) paciente ${pacienteNome} esteve sob meus cuidados profissionais, necessitando de afastamento de suas atividades por ${atestadoForm.dias_afastamento} dia(s), a partir de ${format(new Date(atestadoForm.data_inicio), "dd/MM/yyyy")}.\n\n${atestadoForm.cid ? `CID-10: ${atestadoForm.cid}\n\n` : ""}Motivo: ${atestadoForm.motivo}`;

    const { error } = await supabase
      .from("prescricoes_documentos")
      .insert({
        consulta_id: consultaId,
        paciente_id: pacienteId,
        medico_id: currentUser.medicoId,
        tipo: "atestado",
        titulo: atestadoForm.titulo,
        conteudo,
        dados_adicionais: atestadoForm,
      });

    if (error) {
      toast.error("Erro ao salvar atestado");
    } else {
      toast.success("Atestado salvo com sucesso");
      setAtestadoForm({ titulo: "Atestado Médico", dias_afastamento: "", cid: "", motivo: "", data_inicio: format(new Date(), "yyyy-MM-dd") });
      fetchDocumentos();
      onUpdate();
      setActiveTab("lista");
    }
    setSaving(false);
  }

  async function handleSaveReceita() {
    if (!currentUser?.medicoId) {
      toast.error("Erro ao identificar médico");
      return;
    }

    if (!receitaForm.medicamentos) {
      toast.error("Preencha os medicamentos");
      return;
    }

    setSaving(true);
    const conteudo = `RECEITA MÉDICA\n\nPaciente: ${pacienteNome}\n\nMedicamentos:\n${receitaForm.medicamentos}\n\nPosologia:\n${receitaForm.posologia}\n\nObservações:\n${receitaForm.observacoes}`;

    const { error } = await supabase
      .from("prescricoes_documentos")
      .insert({
        consulta_id: consultaId,
        paciente_id: pacienteId,
        medico_id: currentUser.medicoId,
        tipo: "receita",
        titulo: receitaForm.titulo,
        conteudo,
        dados_adicionais: receitaForm,
      });

    if (error) {
      toast.error("Erro ao salvar receita");
    } else {
      toast.success("Receita salva com sucesso");
      setReceitaForm({ titulo: "Receita Médica", medicamentos: "", posologia: "", observacoes: "" });
      fetchDocumentos();
      onUpdate();
      setActiveTab("lista");
    }
    setSaving(false);
  }

  function handlePrint(documento: PrescricaoDocumento) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Permita pop-ups para imprimir");
      return;
    }

    const formattedDate = format(new Date(documento.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documento.titulo}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .titulo {
            font-size: 24px;
            font-weight: bold;
            color: #1a56db;
          }
          .conteudo {
            white-space: pre-wrap;
            margin-bottom: 40px;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            border-top: 1px solid #ccc;
            padding-top: 20px;
          }
          .assinatura {
            margin-top: 40px;
            text-align: center;
          }
          .assinatura-linha {
            width: 300px;
            border-top: 1px solid #333;
            margin: 0 auto 10px;
          }
          .data {
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="titulo">${documento.titulo}</div>
          <div class="data">Emitido em: ${formattedDate}</div>
        </div>
        <div class="conteudo">${documento.conteudo}</div>
        <div class="assinatura">
          <div class="assinatura-linha"></div>
          <div>Médico(a): ${documento.medico?.nome || "N/A"}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function handleDownload(documento: PrescricaoDocumento) {
    const formattedDate = format(new Date(documento.created_at), "dd-MM-yyyy", { locale: ptBR });
    const blob = new Blob([documento.conteudo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documento.titulo.replace(/\s+/g, "_")}_${formattedDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function openViewModal(documento: PrescricaoDocumento) {
    setSelectedDocumento(documento);
    setIsViewModalOpen(true);
  }

  function getTipoIcon(tipo: string) {
    switch (tipo) {
      case "exame":
        return <Stethoscope className="w-4 h-4" />;
      case "atestado":
        return <FileCheck className="w-4 h-4" />;
      case "receita":
        return <Pill className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  }

  function getTipoBadgeColor(tipo: string) {
    switch (tipo) {
      case "exame":
        return "bg-blue-500/20 text-blue-700 border-blue-500/30";
      case "atestado":
        return "bg-green-500/20 text-green-700 border-green-500/30";
      case "receita":
        return "bg-purple-500/20 text-purple-700 border-purple-500/30";
      default:
        return "";
    }
  }

  function getTipoLabel(tipo: string) {
    switch (tipo) {
      case "exame":
        return "Pedido de Exame";
      case "atestado":
        return "Atestado";
      case "receita":
        return "Receita";
      default:
        return tipo;
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="lista" className="flex-1 min-w-[80px]">
            <FileText className="w-4 h-4 mr-1" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="exame" className="flex-1 min-w-[80px]">
            <Stethoscope className="w-4 h-4 mr-1" />
            Exame
          </TabsTrigger>
          <TabsTrigger value="atestado" className="flex-1 min-w-[80px]">
            <FileCheck className="w-4 h-4 mr-1" />
            Atestado
          </TabsTrigger>
          <TabsTrigger value="receita" className="flex-1 min-w-[80px]">
            <Pill className="w-4 h-4 mr-1" />
            Receita
          </TabsTrigger>
        </TabsList>

        {/* Lista de documentos */}
        <TabsContent value="lista" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : documentos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum documento emitido nesta consulta</p>
              <p className="text-sm text-muted-foreground mt-2">Clique nas abas acima para criar um novo documento</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {documentos.map((doc) => (
                <Card 
                  key={doc.id} 
                  className="border-l-4 hover:shadow-md transition-all cursor-pointer"
                  style={{ borderLeftColor: doc.tipo === "exame" ? "#3b82f6" : doc.tipo === "atestado" ? "#22c55e" : "#a855f7" }}
                  onClick={() => openViewModal(doc)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getTipoBadgeColor(doc.tipo)} border`}>
                            {getTipoIcon(doc.tipo)}
                            <span className="ml-1">{getTipoLabel(doc.tipo)}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="font-medium text-foreground">{doc.titulo}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {doc.medico?.nome || "Médico"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handlePrint(doc); }}
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Formulário de Pedido de Exame */}
        <TabsContent value="exame" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-500" />
                Novo Pedido de Exame
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título do Documento</Label>
                <Input
                  value={exameForm.titulo}
                  onChange={(e) => setExameForm({ ...exameForm, titulo: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Exames Solicitados *</Label>
                <Textarea
                  value={exameForm.exames}
                  onChange={(e) => setExameForm({ ...exameForm, exames: e.target.value })}
                  placeholder="Liste os exames solicitados, um por linha..."
                  className="mt-1 min-h-[120px]"
                />
              </div>
              <div>
                <Label>Indicação Clínica</Label>
                <Textarea
                  value={exameForm.indicacao_clinica}
                  onChange={(e) => setExameForm({ ...exameForm, indicacao_clinica: e.target.value })}
                  placeholder="Justificativa clínica para os exames..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={exameForm.observacoes}
                  onChange={(e) => setExameForm({ ...exameForm, observacoes: e.target.value })}
                  placeholder="Observações adicionais..."
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSaveExame} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Pedido de Exame
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formulário de Atestado */}
        <TabsContent value="atestado" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-500" />
                Novo Atestado Médico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título do Documento</Label>
                <Input
                  value={atestadoForm.titulo}
                  onChange={(e) => setAtestadoForm({ ...atestadoForm, titulo: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dias de Afastamento *</Label>
                  <Input
                    type="number"
                    value={atestadoForm.dias_afastamento}
                    onChange={(e) => setAtestadoForm({ ...atestadoForm, dias_afastamento: e.target.value })}
                    placeholder="Ex: 3"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={atestadoForm.data_inicio}
                    onChange={(e) => setAtestadoForm({ ...atestadoForm, data_inicio: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>CID-10 (opcional)</Label>
                <Input
                  value={atestadoForm.cid}
                  onChange={(e) => setAtestadoForm({ ...atestadoForm, cid: e.target.value })}
                  placeholder="Ex: J06.9"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Motivo / Observações *</Label>
                <Textarea
                  value={atestadoForm.motivo}
                  onChange={(e) => setAtestadoForm({ ...atestadoForm, motivo: e.target.value })}
                  placeholder="Descreva o motivo do afastamento..."
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSaveAtestado} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Atestado
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formulário de Receita */}
        <TabsContent value="receita" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="w-5 h-5 text-purple-500" />
                Nova Receita Médica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium">Integração Memed disponível em breve</p>
                  <p className="text-xs mt-1">Por enquanto, preencha a receita manualmente.</p>
                </div>
              </div>
              <div>
                <Label>Título do Documento</Label>
                <Input
                  value={receitaForm.titulo}
                  onChange={(e) => setReceitaForm({ ...receitaForm, titulo: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Medicamentos *</Label>
                <Textarea
                  value={receitaForm.medicamentos}
                  onChange={(e) => setReceitaForm({ ...receitaForm, medicamentos: e.target.value })}
                  placeholder="Liste os medicamentos prescritos, um por linha..."
                  className="mt-1 min-h-[120px]"
                />
              </div>
              <div>
                <Label>Posologia</Label>
                <Textarea
                  value={receitaForm.posologia}
                  onChange={(e) => setReceitaForm({ ...receitaForm, posologia: e.target.value })}
                  placeholder="Instruções de uso..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={receitaForm.observacoes}
                  onChange={(e) => setReceitaForm({ ...receitaForm, observacoes: e.target.value })}
                  placeholder="Observações adicionais..."
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSaveReceita} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Receita
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de visualização */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocumento && getTipoIcon(selectedDocumento.tipo)}
              {selectedDocumento?.titulo}
            </DialogTitle>
          </DialogHeader>
          {selectedDocumento && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <Badge className={`${getTipoBadgeColor(selectedDocumento.tipo)} border`}>
                    {getTipoLabel(selectedDocumento.tipo)}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(selectedDocumento.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {selectedDocumento.conteudo}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handlePrint(selectedDocumento)} className="gap-2">
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload(selectedDocumento)} className="gap-2">
                    <Download className="w-4 h-4" />
                    Baixar
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
