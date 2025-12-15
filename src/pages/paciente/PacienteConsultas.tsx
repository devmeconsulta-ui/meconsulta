import { useEffect, useState, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
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
  Loader2,
  ThumbsUp,
  Search,
  Filter,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PacienteContext {
  pacienteData: any;
}

type StatusFilter = "todos" | "aguardando_pagamento" | "confirmada" | "atendida_medico" | "concluida" | "cancelada";
type PaymentFilter = "todos" | "pago" | "pendente" | "cancelado";

const statusIcons: Record<string, React.ReactNode> = {
  aguardando_pagamento: <Clock className="w-4 h-4" />,
  confirmada: <CheckCircle className="w-4 h-4" />,
  atendida_medico: <CheckCircle className="w-4 h-4" />,
  concluida: <CheckCircle className="w-4 h-4" />,
  realizada: <CheckCircle className="w-4 h-4" />,
  nao_compareceu: <XCircle className="w-4 h-4" />,
  cancelada: <XCircle className="w-4 h-4" />,
};

const statusColors: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  confirmada: "bg-green-500/10 text-green-600 border-green-500/20",
  atendida_medico: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  concluida: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  realizada: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  nao_compareceu: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  cancelada: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando Pagamento",
  confirmada: "Confirmada",
  atendida_medico: "Atendida pelo Médico",
  concluida: "Concluída",
  realizada: "Realizada",
  nao_compareceu: "Não Compareceu",
  cancelada: "Cancelada",
};

const paymentStatusLabels: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

export default function PacienteConsultas() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [avaliarModal, setAvaliarModal] = useState<any>(null);
  const [cancelarModal, setCancelarModal] = useState<any>(null);
  const [detalhesModal, setDetalhesModal] = useState<any>(null);
  const [confirmarAtendimentoModal, setConfirmarAtendimentoModal] = useState<any>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [processandoPagamento, setProcessandoPagamento] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [notifiedPending, setNotifiedPending] = useState(false);

  // Count pending and cancelled consultations
  const cleanupCounts = useMemo(() => {
    const pending = consultas.filter(c => c.status_consulta === "aguardando_pagamento").length;
    const cancelled = consultas.filter(c => c.status_consulta === "cancelada").length;
    return { pending, cancelled, total: pending + cancelled };
  }, [consultas]);

  useEffect(() => {
    if (pacienteData?.id) {
      fetchConsultas();
    }
  }, [pacienteData?.id]);

  // Show toast notification for pending payments
  useEffect(() => {
    if (!notifiedPending && consultas.length > 0) {
      const pendingPayments = consultas.filter(
        c => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada"
      );
      
      if (pendingPayments.length > 0) {
        toast.warning(
          `Você tem ${pendingPayments.length} consulta${pendingPayments.length > 1 ? 's' : ''} com pagamento pendente!`,
          {
            description: "Clique em 'Pagar Agora' para finalizar o pagamento.",
            duration: 8000,
            action: {
              label: "Ver pendentes",
              onClick: () => setPaymentFilter("pendente"),
            },
          }
        );
        setNotifiedPending(true);
      }
    }
  }, [consultas, notifiedPending]);

  async function fetchConsultas() {
    if (!pacienteData?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [consultasResult, avsResult] = await Promise.all([
        supabase
          .from("consultas")
          .select(`
            *,
            medicos!consultas_medico_id_fkey (id, nome, especialidade, foto_url, crm),
            local:locais_atendimento (id, nome_local, endereco, cidade, estado, tipo_atendimento)
          `)
          .eq("paciente_id", pacienteData.id)
          .order("data_hora", { ascending: false }),

        supabase
          .from("avaliacoes_medico")
          .select("*")
          .eq("paciente_id", pacienteData.id)
      ]);

      // Map avaliacoes by consulta_id (preferred) or medico_id
      const avsMap: Record<string, any> = {};
      avsResult.data?.forEach((av) => {
        if (av.consulta_id) {
          avsMap[`consulta_${av.consulta_id}`] = av;
        }
        avsMap[`medico_${av.medico_id}`] = av;
      });

      const consultasData = consultasResult.data || [];
      setConsultas(consultasData);
      setAvaliacoes(avsMap);

      // Check payment status for pending consultations with asaas_payment_id
      const pendingWithPayment = consultasData.filter(
        c => c.status_pagamento === 'pendente' && 
             c.asaas_payment_id && 
             c.status_consulta !== 'cancelada'
      );

      if (pendingWithPayment.length > 0) {
        // Check each pending payment in the background (don't show toast for auto-sync)
        syncPaymentStatuses(pendingWithPayment, false);
      }
    } catch (error) {
      console.error("Error fetching consultas:", error);
    } finally {
      setLoading(false);
    }
  }

  // Sync payment statuses with Asaas (background check)
  async function syncPaymentStatuses(pendingConsultas: any[], showToast = false) {
    if (sincronizando) return;
    
    setSincronizando(true);
    let hasUpdates = false;
    
    for (const consulta of pendingConsultas) {
      try {
        const { data } = await supabase.functions.invoke('check-payment-status', {
          body: { consulta_id: consulta.id }
        });

        if (data?.updated) {
          hasUpdates = true;
          console.log(`Payment status updated for consulta ${consulta.id}: ${data.status_pagamento}`);
        }
      } catch (err) {
        console.error(`Error checking payment for ${consulta.id}:`, err);
      }
    }

    setSincronizando(false);

    // Refresh list if any payments were updated
    if (hasUpdates) {
      toast.success('Status de pagamento atualizado!');
      // Refetch the data
      const { data } = await supabase
        .from("consultas")
        .select(`
          *, 
          medicos!consultas_medico_id_fkey (id, nome, especialidade, foto_url, crm),
          local:locais_atendimento (id, nome_local, endereco, cidade, estado, tipo_atendimento)
        `)
        .eq("paciente_id", pacienteData?.id)
        .order("data_hora", { ascending: false });
      
      if (data) setConsultas(data);
    } else if (showToast) {
      toast.info('Todos os pagamentos estão atualizados');
    }
  }

  // Manual refresh button handler
  async function handleRefresh() {
    const pendingWithPayment = consultas.filter(
      c => c.status_pagamento === 'pendente' && 
           c.asaas_payment_id && 
           c.status_consulta !== 'cancelada'
    );

    if (pendingWithPayment.length > 0) {
      await syncPaymentStatuses(pendingWithPayment, true);
    } else {
      // Just refetch data
      await fetchConsultas();
      toast.success('Dados atualizados!');
    }
  }

  // Filtered consultas based on search and filters
  const filteredConsultas = useMemo(() => {
    return consultas.filter(c => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        c.medicos?.nome?.toLowerCase().includes(searchLower) ||
        c.medicos?.especialidade?.toLowerCase().includes(searchLower) ||
        c.nome_paciente_consulta?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === "todos" || c.status_consulta === statusFilter;

      // Payment filter
      const matchesPayment = paymentFilter === "todos" || c.status_pagamento === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [consultas, searchTerm, statusFilter, paymentFilter]);

  // Count stats
  const stats = useMemo(() => {
    return {
      total: consultas.length,
      pendentes: consultas.filter(c => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada").length,
      confirmadas: consultas.filter(c => c.status_consulta === "confirmada").length,
      canceladas: consultas.filter(c => c.status_consulta === "cancelada").length,
      concluidas: consultas.filter(c => c.status_consulta === "concluida" || c.status_consulta === "atendida_medico").length,
    };
  }, [consultas]);

  async function handleConfirmarAtendimento() {
    if (!confirmarAtendimentoModal || !pacienteData?.id) return;

    setEnviando(true);
    try {
      const { error: updateError } = await supabase
        .from("consultas")
        .update({
          finalizado_paciente: true,
          data_hora_finalizacao_paciente: new Date().toISOString(),
          status_consulta: "concluida",
        })
        .eq("id", confirmarAtendimentoModal.id);

      if (updateError) throw updateError;

      await supabase.from("consultas_eventos").insert({
        consulta_id: confirmarAtendimentoModal.id,
        tipo_evento: "finalizada_paciente",
        descricao: "Paciente confirmou que foi atendido",
        usuario_tipo: "paciente",
        usuario_id: pacienteData.id,
      });

      toast.success("Atendimento confirmado com sucesso!");
      
      const consultaToEvaluate = confirmarAtendimentoModal;
      setConfirmarAtendimentoModal(null);
      setAvaliarModal(consultaToEvaluate);
      
      fetchConsultas();
    } catch (error) {
      console.error("Error confirming attendance:", error);
      toast.error("Erro ao confirmar atendimento");
    } finally {
      setEnviando(false);
    }
  }

  async function handleEnviarAvaliacao() {
    if (!avaliarModal || !pacienteData?.id) return;

    setEnviando(true);
    try {
      const { error } = await supabase.from("avaliacoes_medico").insert({
        medico_id: avaliarModal.medicos.id,
        paciente_id: pacienteData.id,
        consulta_id: avaliarModal.id,
        nota,
        comentario: comentario.trim() || null,
      });

      if (error) throw error;

      await supabase.from("consultas_eventos").insert({
        consulta_id: avaliarModal.id,
        tipo_evento: "avaliacao_paciente",
        descricao: `Paciente avaliou com nota ${nota}`,
        usuario_tipo: "paciente",
        usuario_id: pacienteData.id,
      });

      toast.success("Obrigado pela sua avaliação!");
      setAvaliacoes((prev) => ({
        ...prev,
        [`consulta_${avaliarModal.id}`]: { nota, comentario },
        [`medico_${avaliarModal.medicos.id}`]: { nota, comentario },
      }));
      setAvaliarModal(null);
      setNota(5);
      setComentario("");
    } catch (error) {
      console.error("Error sending evaluation:", error);
      toast.error("Erro ao enviar avaliação");
    }
    setEnviando(false);
  }

  function handlePularAvaliacao() {
    setAvaliarModal(null);
    setNota(5);
    setComentario("");
  }

  async function handleCancelarConsulta() {
    if (!cancelarModal) return;

    setEnviando(true);
    
    try {
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

  // Delete pending and cancelled consultations
  async function handleDeleteCleanup() {
    if (cleanupCounts.total === 0) return;

    setIsDeleting(true);
    try {
      const cleanupConsultas = consultas.filter(c => 
        c.status_consulta === "aguardando_pagamento" || c.status_consulta === "cancelada"
      );
      const cleanupIds = cleanupConsultas.map(c => c.id);
      const slotIds = cleanupConsultas.map(c => c.agenda_slot_id).filter(Boolean);

      // Delete consultas
      const { error: deleteError } = await supabase
        .from("consultas")
        .delete()
        .in("id", cleanupIds);

      if (deleteError) throw deleteError;

      // Reopen agenda slots
      if (slotIds.length > 0) {
        await supabase
          .from("agenda_slots")
          .update({ disponivel: true })
          .in("id", slotIds);
      }

      toast.success(`${cleanupIds.length} consulta(s) removidas`);
      setDeleteDialogOpen(false);
      fetchConsultas();
    } catch (error: any) {
      console.error("Erro ao excluir consultas:", error);
      toast.error("Não foi possível excluir as consultas");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleFinalizarPagamento(consulta: any) {
    // If invoice URL already exists, just open it
    if (consulta.asaas_invoice_url) {
      window.open(consulta.asaas_invoice_url, '_blank');
      return;
    }

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
        console.error('Erro do Asaas:', data);
        
        // Handle specific error codes
        if (data.code === 'INVALID_CPF') {
          toast.error('CPF inválido no cadastro', {
            description: 'Por favor, atualize seu CPF no perfil para continuar.',
            action: {
              label: 'Atualizar perfil',
              onClick: () => navigate('/paciente/perfil'),
            },
            duration: 10000,
          });
        } else {
          toast.error(data.error || 'Erro ao gerar pagamento');
        }
        return;
      }

      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
        toast.success('Pagamento gerado! Complete o pagamento na nova aba.');
        fetchConsultas();
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      toast.error('Erro ao conectar com o serviço de pagamento');
    } finally {
      setProcessandoPagamento(null);
    }
  }

  const canConfirmAttendance = (consulta: any) => {
    const now = new Date();
    const consultaDate = new Date(consulta.data_hora);
    const isPast = consultaDate <= now;
    const isPaid = consulta.status_pagamento === "pago";
    const notConfirmedByPatient = !consulta.finalizado_paciente;
    const validStatus = ["confirmada", "atendida_medico"].includes(consulta.status_consulta);
    
    return isPast && isPaid && notConfirmedByPatient && validStatus;
  };

  const hasEvaluationForConsulta = (consulta: any) => {
    return !!avaliacoes[`consulta_${consulta.id}`];
  };

  const isPastConsulta = (consulta: any) => {
    return new Date(consulta.data_hora) <= new Date();
  };

  const renderConsultaCard = (consulta: any) => {
    const avaliacao = avaliacoes[`consulta_${consulta.id}`] || avaliacoes[`medico_${consulta.medicos?.id}`];
    const status = consulta.status_consulta as string;
    const isPast = isPastConsulta(consulta);
    const showConfirmButton = canConfirmAttendance(consulta);
    const canEvaluate = isPast && !hasEvaluationForConsulta(consulta) && consulta.finalizado_paciente;
    const isPendingPayment = consulta.status_pagamento === "pendente" && status !== "cancelada";

    return (
      <Card key={consulta.id} className={`card-shadow overflow-hidden ${isPendingPayment ? 'ring-2 ring-yellow-500/50' : ''}`}>
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
                    <span className="ml-1">{statusLabels[status] || status}</span>
                  </Badge>
                  
                  {isPendingPayment && (
                    <Badge variant="destructive" className="gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      Pagamento pendente
                    </Badge>
                  )}

                  {consulta.status_pagamento === "pago" && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Pago
                    </Badge>
                  )}

                  {consulta.finalizado_paciente && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      Confirmado
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Date/Time & Actions */}
            <div className="border-t lg:border-t-0 lg:border-l border-border p-4 lg:p-6 bg-muted/30 flex flex-col justify-between gap-4 lg:w-72">
              <div>
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(consulta.data_hora), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Clock className="w-4 h-4" />
                  {format(parseISO(consulta.data_hora), "HH:mm")}
                </div>
                
                {/* Local de atendimento */}
                {consulta.local && (
                  <div className="flex items-start gap-2 mt-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{consulta.local.nome_local}</p>
                      {consulta.local.cidade && (
                        <p className="text-muted-foreground text-xs">
                          {consulta.local.cidade}{consulta.local.estado ? `, ${consulta.local.estado}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <p className="text-lg font-bold text-foreground mt-2">
                  R$ {Number(consulta.valor_consulta || 0).toFixed(2)}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {/* Highlighted Payment Button for pending */}
                {isPendingPayment && (
                  <Button 
                    size="sm"
                    disabled={processandoPagamento === consulta.id}
                    onClick={() => handleFinalizarPagamento(consulta)}
                    className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold animate-pulse"
                  >
                    {processandoPagamento === consulta.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pagar Agora
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetalhesModal(consulta)}
                >
                  Ver detalhes
                </Button>
                
                {/* Patient confirmation button */}
                {showConfirmButton && (
                  <Button 
                    size="sm"
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setConfirmarAtendimentoModal(consulta)}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Confirmar atendimento
                  </Button>
                )}
                
                {!isPast && status !== "cancelada" && (
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

                {/* Evaluate button for concluded consultations */}
                {canEvaluate && (
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
          {avaliacao && (
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Minhas Consultas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas consultas agendadas e histórico
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={sincronizando || loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
          {sincronizando ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setStatusFilter("todos"); setPaymentFilter("todos"); }}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:bg-muted/50 transition-colors ${stats.pendentes > 0 ? 'ring-2 ring-yellow-500/50' : ''}`} onClick={() => { setStatusFilter("todos"); setPaymentFilter("pendente"); }}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
            <p className="text-xs text-muted-foreground">Pag. Pendente</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setStatusFilter("confirmada"); setPaymentFilter("todos"); }}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.confirmadas}</p>
            <p className="text-xs text-muted-foreground">Confirmadas</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setStatusFilter("concluida"); setPaymentFilter("todos"); }}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.concluidas}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setStatusFilter("cancelada"); setPaymentFilter("todos"); }}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.canceladas}</p>
            <p className="text-xs text-muted-foreground">Canceladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por médico ou especialidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status da consulta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="atendida_medico">Atendida</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentFilter)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos pagamentos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Consultas List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            {filteredConsultas.length} consulta{filteredConsultas.length !== 1 ? 's' : ''} encontrada{filteredConsultas.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            {(statusFilter !== "todos" || paymentFilter !== "todos" || searchTerm) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setStatusFilter("todos"); setPaymentFilter("todos"); setSearchTerm(""); }}
              >
                Limpar filtros
              </Button>
            )}
            
            {/* Delete pending/cancelled button */}
            {cleanupCounts.total > 0 && (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar ({cleanupCounts.total})
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar consultas?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>Esta ação irá excluir:</p>
                      <ul className="list-disc list-inside text-sm">
                        {cleanupCounts.pending > 0 && <li><strong>{cleanupCounts.pending}</strong> consulta(s) aguardando pagamento</li>}
                        {cleanupCounts.cancelled > 0 && <li><strong>{cleanupCounts.cancelled}</strong> consulta(s) canceladas</li>}
                      </ul>
                      <p className="pt-2">Esta ação não pode ser desfeita.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteCleanup}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir {cleanupCounts.total} consulta(s)
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {filteredConsultas.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhuma consulta encontrada</p>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "todos" || paymentFilter !== "todos" 
                  ? "Tente ajustar os filtros de busca"
                  : "Agende uma consulta com um de nossos especialistas"
                }
              </p>
              {!searchTerm && statusFilter === "todos" && paymentFilter === "todos" && (
                <Button onClick={() => navigate("/paciente/marcar")}>
                  Marcar consulta
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredConsultas.map((c) => renderConsultaCard(c))
        )}
      </div>

      {/* Modal de Confirmação de Atendimento */}
      <AlertDialog open={!!confirmarAtendimentoModal} onOpenChange={() => setConfirmarAtendimentoModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-emerald-600" />
              Confirmar Atendimento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você confirma que foi atendido(a) pelo(a){" "}
                <span className="font-semibold">Dr(a). {confirmarAtendimentoModal?.medicos?.nome}</span>{" "}
                na data{" "}
                <span className="font-semibold">
                  {confirmarAtendimentoModal && format(parseISO(confirmarAtendimentoModal.data_hora), "dd/MM/yyyy 'às' HH:mm")}
                </span>?
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Após confirmar, você poderá avaliar o atendimento do médico.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarAtendimento}
              disabled={enviando}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                "Sim, fui atendido(a)"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Avaliação */}
      <Dialog open={!!avaliarModal} onOpenChange={() => handlePularAvaliacao()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avalie o atendimento</DialogTitle>
            <DialogDescription>
              Dr(a). {avaliarModal?.medicos?.nome}
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
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handlePularAvaliacao}
              disabled={enviando}
              className="w-full sm:w-auto"
            >
              Pular agora
            </Button>
            <Button
              onClick={handleEnviarAvaliacao}
              disabled={enviando}
              className="w-full sm:w-auto"
            >
              {enviando ? "Enviando..." : "Enviar avaliação"}
            </Button>
          </DialogFooter>
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
                    {format(parseISO(detalhesModal.data_hora), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="font-medium">
                    {format(parseISO(detalhesModal.data_hora), "HH:mm")}
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
                  <Badge variant="outline" className={statusColors[detalhesModal.status_consulta as string]}>
                    {statusLabels[detalhesModal.status_consulta as string] || detalhesModal.status_consulta}
                  </Badge>
                </div>
              </div>

              {/* Timeline do status */}
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="text-sm font-medium mb-3">Status da consulta</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Consulta agendada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {detalhesModal.status_pagamento === "pago" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                    <span>Pagamento {detalhesModal.status_pagamento === "pago" ? "confirmado" : "pendente"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {detalhesModal.finalizado_medico ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>Atendimento {detalhesModal.finalizado_medico ? "realizado" : "aguardando"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {detalhesModal.finalizado_paciente ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>Confirmação do paciente {detalhesModal.finalizado_paciente ? "realizada" : "pendente"}</span>
                  </div>
                </div>
              </div>

              {detalhesModal.status_pagamento === "pendente" && 
               detalhesModal.status_consulta !== "cancelada" && (
                <Button 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold"
                  onClick={() => {
                    handleFinalizarPagamento(detalhesModal);
                    setDetalhesModal(null);
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagar Agora
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
