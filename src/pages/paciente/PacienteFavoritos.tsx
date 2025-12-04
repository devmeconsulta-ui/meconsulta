import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, User, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface PacienteContext {
  pacienteData: any;
}

export default function PacienteFavoritos() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const navigate = useNavigate();
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavoritos();
  }, [pacienteData]);

  async function fetchFavoritos() {
    if (!pacienteData?.id) return;

    const { data } = await supabase
      .from("paciente_favoritos")
      .select(`
        *,
        medicos (
          *,
          medico_servicos (*),
          avaliacoes_medico (nota)
        )
      `)
      .eq("paciente_id", pacienteData.id);

    const medicosComMedia = data?.map(f => ({
      ...f,
      medicos: {
        ...f.medicos,
        mediaAvaliacao: f.medicos?.avaliacoes_medico?.length
          ? f.medicos.avaliacoes_medico.reduce((acc: number, av: any) => acc + av.nota, 0) / f.medicos.avaliacoes_medico.length
          : 0
      }
    })) || [];

    setFavoritos(medicosComMedia);
    setLoading(false);
  }

  async function removerFavorito(favoritoId: string) {
    await supabase
      .from("paciente_favoritos")
      .delete()
      .eq("id", favoritoId);
    
    setFavoritos(prev => prev.filter(f => f.id !== favoritoId));
    toast.success("Removido dos favoritos");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meus Favoritos</h1>

      {favoritos.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Você ainda não tem médicos favoritos
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/paciente/marcar")}
          >
            Buscar médicos
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {favoritos.map(fav => {
            const medico = fav.medicos;
            if (!medico) return null;

            return (
              <Card key={fav.id} className="card-shadow">
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
                          onClick={() => removerFavorito(fav.id)}
                          className="p-1"
                        >
                          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
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
                        <Button 
                          size="sm" 
                          onClick={() => navigate(`/medico/${medico.id}`)}
                          className="gap-1"
                        >
                          Ver perfil
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
