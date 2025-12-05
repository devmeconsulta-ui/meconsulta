import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Calendar, 
  MapPin, 
  User, 
  Star, 
  CreditCard, 
  Clock, 
  Phone,
  Video,
  Building2,
  X,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PacienteContext {
  pacienteData: any;
}

const statusIcons = {
  aguardando_pagamento: <Clock className="w-4 h-4" />,
  confirmada: <CheckCircle className="w-4 h-4" />,
  realizada: <CheckCircle className="w-4 h-4" />,
  cancelada: <XCircle className="w-4 h-4" />,
};

const statusColors = {
  aguardando_pagamento: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  confirmada: "bg-green-500/10 text-green-600 border-green-500/20",
  realizada: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cancelada: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusLabels = {
  aguardando_pagamento: "Aguardando Pagamento",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export default function PacienteConsultas() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const navigate = useNavigate();
  const [proximas, setProximas] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [avaliarModal, setAvaliarModal] = useState<any>(null);
  const [cancelarModal, setCancelarModal] = useState<any>(null);
  const [detalhesModal, setDetalhesModal] = useState<any>(null);
const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [processandoPagamento, setProcessandoPagamento] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultas();
  }, [pacienteData]);

  async function fetchConsultas() {
    if (!pacienteData?.id) return;

    const now = new Date().toISOString();

    const [proxResult, histResult, avsResult] = await Promise.all([
      supabase
        .from("consultas")
        .select(`
          *,
          medicos (id, nome, especialidade, foto_url, crm)
        `)
        .eq("paciente_id", pacienteData.id)
        .gte("data_hora", now)
        .neq("status_consulta", "cancelada")
        .order("data_hora", { ascending: true }),

      supabase
        .from("consultas")
        .select(`
          *,
          medicos (id, nome, especialidade, foto_url, crm)
        `)
        .eq("paciente_id", pacienteData.id)
        .or(`data_hora.lt.${now},status_consulta.eq.cancelada`)
        .order("data_hora", { ascending: false }),

      supabase
        .from("avaliacoes_medico")
        .select("*")
        .eq("paciente_id", pacienteData.id)
    ]);

    const avsMap: Record<string, any> = {};
    avsResult.data?.forEach((av) => {
      avsMap[av.medico_id] = av;
    });

    setProximas(proxResult.data || []);
    setHistorico(histResult.data || []);
    setAvaliacoes(avsMap);
    setLoading(false);
  }

  async function handleEnviarAvaliacao() {
    if (!avaliarModal || !pacienteData?.id) return;

    setEnviando(true);
    const { error } = await supabase.from("avaliacoes_medico").insert({
      medico_id: avaliarModal.medicos.id,
      paciente_id: pacienteData.id,
      nota,
      comentario: comentario.trim() || null,
    });

    if (error) {
      toast.error("Erro ao enviar avaliação");
    } else {
      toast.success("Avaliação enviada com sucesso!");
      setAvaliacoes((prev) => ({
        ...prev,
        [avaliarModal.medicos.id]: { nota, comentario },
      }));
      setAvaliarModal(null);
      setNota(5);
      setComentario("");
    }
    setEnviando(false);
  }

  async function handleCancelarConsulta() {
    if (!cancelarModal) return;

    setEnviando(true);
    
    try {
      // Usar edge function para cancelar no sistema e no Asaas
      const { data, error } = await supabase.functions.invoke('cancel-asaas-payment', {
        body: { consulta_id: cancelarModal.id }
      });

      if (error) {
        console.error('Erro na edge function:', error);
        toast.error("Erro ao cancelar consulta");
        return;
      }

      if (!data.success) {
        toast.error(data.error || "Erro ao cancelar consulta");
        return;
      }

      toast.success("Consulta cancelada com sucesso");
      fetchConsultas();
    } catch (err) {
      console.error('Erro ao cancelar:', err);
      toast.error("Erro ao cancelar consulta");
    } finally {
      setCancelarModal(null);
      setEnviando(false);
    }
  }

  async function handleFinalizarPagamento(consulta: any) {
    // Se já tem URL do Asaas, abrir direto
    if (consulta.asaas_invoice_url) {
      window.open(consulta.asaas_invoice_url, '_blank');
      return;
    }

    // Se não tem, criar o pagamento
    setProcessandoPagamento(consulta.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: { consulta_id: consulta.id }
      });

      if (error) {
        console.error('Erro na edge function:', error);
        toast.error('Erro ao gerar pagamento. Tente novamente.');
        return;
      }

      if (!data.success) {
        console.error('Erro do Asaas:', data.error);
        toast.error(data.error || 'Erro ao gerar pagamento');
        return;
      }

      // Abrir URL de pagamento
      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
        toast.success('Pagamento gerado! Complete o pagamento na nova aba.');
        fetchConsultas(); // Atualizar lista para mostrar nova URL
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      toast.error('Erro ao conectar com o serviço de pagamento');
    } finally {
      setProcessandoPagamento(null);
    }
  }

  const renderConsultaCard = (consulta: any, isHistorico: boolean) => {
    const avaliacao = avaliacoes[consulta.medicos?.id];
    const status = consulta.status_consulta as keyof typeof statusLabels;

    return (
      <Card key={consulta.id} className="card-shadow overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* Doctor Info */}
            <div className="flex items-start gap-4 p-4 lg:p-6 flex-1">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {consulta.medicos?.foto_url ? (
                  <img
                    src={consulta.medicos.foto_url}
                    alt={consulta.medicos?.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg truncate">
                  Dr(a). {consulta.medicos?.nome}
                </p>
                <p className="text-muted-foreground">
                  {consulta.medicos?.especialidade}
                </p>
                {consulta.medicos?.crm && (
                  <p className="text-xs text-muted-foreground mt-1">
                    CRM: {consulta.medicos.crm}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge 
                    variant="outline" 
                    className={statusColors[status] || ""}
                  >
                    {statusIcons[status]}
                    <span className="ml-1">{statusLabels[status]}</span>
                  </Badge>
                  
                  {consulta.status_pagamento === "pendente" && status !== "cancelada" && (
                    <Badge variant="destructive" className="gap-1">
                      <CreditCard className="w-3 h-3" />
                      Pagamento pendente
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Date/Time & Actions */}
            <div className="border-t lg:border-t-0 lg:border-l border-border p-4 lg:p-6 bg-muted/30 flex flex-col justify-between gap-4 lg:w-64">
              <div>
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(consulta.data_hora), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(consulta.data_hora), "HH:mm")}
                </div>
                <p className="text-lg font-bold text-foreground mt-2">
                  R$ {Number(consulta.valor_consulta || 0).toFixed(2)}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetalhesModal(consulta)}
                >
                  Ver detalhes
                </Button>
                
                {!isHistorico && consulta.status_pagamento === "pendente" && (
                  <Button 
                    size="sm"
                    disabled={processandoPagamento === consulta.id}
                    onClick={() => handleFinalizarPagamento(consulta)}
                    className="gap-1"
                  >
                    {processandoPagamento === consulta.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Finalizar pagamento
                      </>
                    )}
                  </Button>
                )}
                
                {!isHistorico && status !== "cancelada" && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/paciente/marcar?remarcar=${consulta.id}&medico=${consulta.medico_id}`)}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Remarcar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCancelarModal(consulta)}
                    >
                      Cancelar consulta
                    </Button>
                  </>
                )}

                {isHistorico && !avaliacao && status === "realizada" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={() => setAvaliarModal(consulta)}
                  >
                    <Star className="w-4 h-4" />
                    Avaliar médico
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Avaliação existente */}
          {isHistorico && avaliacao && (
            <div className="border-t border-border p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Sua avaliação:</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= avaliacao.nota
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {avaliacao.comentario && (
                <p className="text-sm text-muted-foreground italic">
                  "{avaliacao.comentario}"
                </p>
              )}
              {avaliacao.resposta_medico && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs font-medium text-primary mb-1">
                    Resposta do médico:
                  </p>
                  <p className="text-sm">{avaliacao.resposta_medico}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Minhas Consultas</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas consultas agendadas e histórico
        </p>
      </div>

      <Tabs defaultValue="proximas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="proximas" className="gap-2">
            <Clock className="w-4 h-4" />
            Próximas ({proximas.length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <Calendar className="w-4 h-4" />
            Histórico ({historico.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proximas" className="space-y-4 mt-6">
          {proximas.length === 0 ? (
            <Card className="card-shadow">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Nenhuma consulta agendada</p>
                <p className="text-muted-foreground mb-4">
                  Agende uma consulta com um de nossos especialistas
                </p>
                <Button onClick={() => window.location.href = "/paciente/marcar"}>
                  Marcar consulta
                </Button>
              </CardContent>
            </Card>
          ) : (
            proximas.map((c) => renderConsultaCard(c, false))
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-4 mt-6">
          {historico.length === 0 ? (
            <Card className="card-shadow">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Nenhuma consulta no histórico</p>
                <p className="text-muted-foreground">
                  Suas consultas passadas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            historico.map((c) => renderConsultaCard(c, true))
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Avaliação */}
      <Dialog open={!!avaliarModal} onOpenChange={() => setAvaliarModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliar Dr(a). {avaliarModal?.medicos?.nome}</DialogTitle>
            <DialogDescription>
              Compartilhe sua experiência com o médico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Como foi sua experiência?
              </p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNota(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= nota
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {nota === 1 && "Muito ruim"}
                {nota === 2 && "Ruim"}
                {nota === 3 && "Regular"}
                {nota === 4 && "Bom"}
                {nota === 5 && "Excelente"}
              </p>
            </div>
            <div>
              <Textarea
                placeholder="Deixe um comentário sobre sua experiência (opcional)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
              />
            </div>
            <Button
              onClick={handleEnviarAvaliacao}
              disabled={enviando}
              className="w-full"
            >
              {enviando ? "Enviando..." : "Enviar avaliação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <AlertDialog open={!!cancelarModal} onOpenChange={() => setCancelarModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta consulta com Dr(a). {cancelarModal?.medicos?.nome}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelarConsulta}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {enviando ? "Cancelando..." : "Sim, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Detalhes */}
      <Dialog open={!!detalhesModal} onOpenChange={() => setDetalhesModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
          </DialogHeader>
          {detalhesModal && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {detalhesModal.medicos?.foto_url ? (
                    <img
                      src={detalhesModal.medicos.foto_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    Dr(a). {detalhesModal.medicos?.nome}
                  </p>
                  <p className="text-muted-foreground">
                    {detalhesModal.medicos?.especialidade}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(detalhesModal.data_hora), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="font-medium">
                    {format(new Date(detalhesModal.data_hora), "HH:mm")}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-medium">
                    R$ {Number(detalhesModal.valor_consulta || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusColors[detalhesModal.status_consulta as keyof typeof statusColors]}>
                    {statusLabels[detalhesModal.status_consulta as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </div>

              {detalhesModal.status_pagamento === "pendente" && 
               detalhesModal.status_consulta !== "cancelada" && (
                <Button className="w-full">
                  Finalizar pagamento
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
