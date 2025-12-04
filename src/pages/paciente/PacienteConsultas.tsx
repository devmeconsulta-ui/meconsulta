import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, User, Star, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PacienteContext {
  pacienteData: any;
}

export default function PacienteConsultas() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const [proximas, setProximas] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [avaliarModal, setAvaliarModal] = useState<any>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchConsultas();
  }, [pacienteData]);

  async function fetchConsultas() {
    if (!pacienteData?.id) return;

    const now = new Date().toISOString();

    // Próximas consultas
    const { data: prox } = await supabase
      .from("consultas")
      .select(`
        *,
        medicos (id, nome, especialidade, foto_url)
      `)
      .eq("paciente_id", pacienteData.id)
      .gte("data_hora", now)
      .neq("status_consulta", "cancelada")
      .order("data_hora", { ascending: true });

    // Histórico
    const { data: hist } = await supabase
      .from("consultas")
      .select(`
        *,
        medicos (id, nome, especialidade, foto_url)
      `)
      .eq("paciente_id", pacienteData.id)
      .or(`data_hora.lt.${now},status_consulta.eq.cancelada`)
      .order("data_hora", { ascending: false });

    // Avaliações existentes
    const { data: avs } = await supabase
      .from("avaliacoes_medico")
      .select("*")
      .eq("paciente_id", pacienteData.id);

    const avsMap: Record<string, any> = {};
    avs?.forEach((av) => {
      avsMap[av.medico_id] = av;
    });

    setProximas(prox || []);
    setHistorico(hist || []);
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

  const renderConsultaCard = (consulta: any, isHistorico: boolean) => {
    const avaliacao = avaliacoes[consulta.medicos?.id];

    return (
      <Card key={consulta.id} className="card-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {consulta.medicos?.foto_url ? (
                <img
                  src={consulta.medicos.foto_url}
                  alt={consulta.medicos?.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-7 h-7 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                Dr(a). {consulta.medicos?.nome}
              </p>
              <p className="text-sm text-muted-foreground">
                {consulta.medicos?.especialidade}
              </p>
              <div className="flex items-center gap-1 text-sm text-primary mt-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant={
                    consulta.status_consulta === "confirmada"
                      ? "default"
                      : consulta.status_consulta === "cancelada"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {consulta.status_consulta}
                </Badge>
                {consulta.status_pagamento === "pendente" && (
                  <Badge variant="destructive" className="gap-1">
                    <CreditCard className="w-3 h-3" />
                    Pagamento pendente
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 mt-4">
            {!isHistorico && consulta.status_pagamento === "pendente" && (
              <Button size="sm" className="flex-1">
                Finalizar pagamento
              </Button>
            )}
            {isHistorico && !avaliacao && consulta.status_consulta !== "cancelada" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => setAvaliarModal(consulta)}
              >
                <Star className="w-4 h-4" />
                Avaliar médico
              </Button>
            )}
            {isHistorico && avaliacao && (
              <div className="w-full p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
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
                  <span className="text-xs text-muted-foreground ml-1">
                    Sua avaliação
                  </span>
                </div>
                {avaliacao.comentario && (
                  <p className="text-sm text-muted-foreground">
                    "{avaliacao.comentario}"
                  </p>
                )}
                {avaliacao.resposta_medico && (
                  <div className="mt-2 p-2 bg-primary/5 rounded">
                    <p className="text-xs font-medium text-primary">
                      Resposta do médico:
                    </p>
                    <p className="text-sm">{avaliacao.resposta_medico}</p>
                  </div>
                )}
              </div>
            )}
          </div>
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Minhas Consultas</h1>

      <Tabs defaultValue="proximas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="proximas">
            Próximas ({proximas.length})
          </TabsTrigger>
          <TabsTrigger value="historico">
            Histórico ({historico.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proximas" className="space-y-4 mt-4">
          {proximas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma consulta agendada
            </p>
          ) : (
            proximas.map((c) => renderConsultaCard(c, false))
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-4 mt-4">
          {historico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma consulta no histórico
            </p>
          ) : (
            historico.map((c) => renderConsultaCard(c, true))
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Avaliação */}
      <Dialog open={!!avaliarModal} onOpenChange={() => setAvaliarModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar Dr(a). {avaliarModal?.medicos?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Como foi sua experiência?
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNota(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= nota
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Textarea
                placeholder="Deixe um comentário (opcional)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={3}
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
    </div>
  );
}
