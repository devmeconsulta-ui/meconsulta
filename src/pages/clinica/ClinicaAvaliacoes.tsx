import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClinicaContext {
  clinicaData: any;
}

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  resposta_medico: string | null;
  created_at: string;
  pacientes?: { nome: string };
  medicos?: { nome: string };
}

export default function ClinicaAvaliacoes() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    media: 0,
    distribuicao: [0, 0, 0, 0, 0],
  });

  useEffect(() => {
    fetchAvaliacoes();
  }, [clinicaData]);

  async function fetchAvaliacoes() {
    if (!clinicaData?.id) return;

    // Busca médicos vinculados
    const { data: vinculosData } = await supabase
      .from("clinicas_medicos")
      .select("medico_id")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    if (!vinculosData || vinculosData.length === 0) {
      setAvaliacoes([]);
      setLoading(false);
      return;
    }

    const medicoIds = vinculosData.map((v) => v.medico_id);

    // Busca avaliações dos médicos vinculados
    const { data } = await supabase
      .from("avaliacoes_medico")
      .select("*, pacientes(nome), medicos(nome)")
      .in("medico_id", medicoIds)
      .order("created_at", { ascending: false });

    if (data) {
      setAvaliacoes(data);

      const total = data.length;
      const media = total > 0 ? data.reduce((acc, av) => acc + av.nota, 0) / total : 0;
      const distribuicao = [0, 0, 0, 0, 0];
      data.forEach((av) => {
        distribuicao[av.nota - 1]++;
      });

      setStats({ total, media, distribuicao });
    }

    setLoading(false);
  }

  const renderStars = (nota: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= nota ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
          />
        ))}
      </div>
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
        <h2 className="text-2xl font-bold text-foreground">Avaliações</h2>
        <p className="text-muted-foreground">Veja as avaliações dos médicos vinculados à clínica</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{stats.media.toFixed(1)}</p>
              <div className="flex justify-center mt-2">{renderStars(Math.round(stats.media))}</div>
              <p className="text-sm text-muted-foreground mt-2">{stats.total} avaliações</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow md:col-span-2">
          <CardContent className="pt-6">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((nota) => (
                <div key={nota} className="flex items-center gap-3">
                  <span className="w-4 text-sm text-muted-foreground">{nota}</span>
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{
                        width: stats.total > 0
                          ? `${(stats.distribuicao[nota - 1] / stats.total) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <span className="w-8 text-sm text-muted-foreground text-right">
                    {stats.distribuicao[nota - 1]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avaliações */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Todas as Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {avaliacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma avaliação ainda</p>
            </div>
          ) : (
            <div className="space-y-6">
              {avaliacoes.map((avaliacao) => (
                <div key={avaliacao.id} className="border-b border-border pb-6 last:border-0">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{avaliacao.pacientes?.nome || "Paciente"}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(avaliacao.created_at), "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                          {avaliacao.medicos && (
                            <p className="text-sm text-primary">
                              Dr(a). {avaliacao.medicos.nome}
                            </p>
                          )}
                        </div>
                        {renderStars(avaliacao.nota)}
                      </div>

                      {avaliacao.comentario && (
                        <p className="mt-2 text-foreground">{avaliacao.comentario}</p>
                      )}

                      {avaliacao.resposta_medico && (
                        <div className="mt-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                          <p className="text-sm font-medium text-primary mb-1">Resposta do médico:</p>
                          <p className="text-sm text-foreground">{avaliacao.resposta_medico}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
