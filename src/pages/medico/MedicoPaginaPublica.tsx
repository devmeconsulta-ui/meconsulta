import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Plus, X, MapPin, Star, Edit, Save, Eye } from "lucide-react";

interface MedicoContext {
  medicoData: any;
}

interface Servico {
  id: string;
  nome_servico: string;
  ativo: boolean;
}

interface Local {
  id: string;
  nome_local: string;
  tipo_atendimento: string;
  cidade: string | null;
  estado: string | null;
}

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  pacientes?: { nome: string };
}

export default function MedicoPaginaPublica() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [novoServico, setNovoServico] = useState("");
  const [formData, setFormData] = useState({
    bio: "",
    foto_url: "",
  });
  const [mediaAvaliacao, setMediaAvaliacao] = useState(0);

  useEffect(() => {
    fetchData();
  }, [medicoData]);

  async function fetchData() {
    if (!medicoData?.id) return;

    // Servicos
    const { data: servicosData } = await supabase
      .from("medico_servicos")
      .select("*")
      .eq("medico_id", medicoData.id)
      .eq("ativo", true);

    setServicos(servicosData || []);

    // Locais
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local, tipo_atendimento, cidade, estado")
      .eq("medico_id", medicoData.id)
      .eq("ativo", true);

    setLocais(locaisData || []);

    // Avaliacoes
    const { data: avaliacoesData } = await supabase
      .from("avaliacoes_medico")
      .select("id, nota, comentario, pacientes(nome)")
      .eq("medico_id", medicoData.id)
      .eq("aprovada_admin", true)
      .order("created_at", { ascending: false })
      .limit(5);

    setAvaliacoes(avaliacoesData || []);

    if (avaliacoesData && avaliacoesData.length > 0) {
      const media = avaliacoesData.reduce((acc, av) => acc + av.nota, 0) / avaliacoesData.length;
      setMediaAvaliacao(media);
    }

    setFormData({
      bio: medicoData.bio || "",
      foto_url: medicoData.foto_url || "",
    });

    setLoading(false);
  }

  async function handleSaveBio() {
    const { error } = await supabase
      .from("medicos")
      .update({
        bio: formData.bio,
        foto_url: formData.foto_url,
      })
      .eq("id", medicoData.id);

    if (error) {
      toast.error("Erro ao salvar");
      return;
    }

    toast.success("Perfil atualizado!");
    setEditing(false);
  }

  async function handleAddServico() {
    if (!novoServico.trim() || !medicoData?.id) return;

    const { error } = await supabase.from("medico_servicos").insert({
      medico_id: medicoData.id,
      nome_servico: novoServico.trim(),
    });

    if (error) {
      toast.error("Erro ao adicionar serviço");
      return;
    }

    toast.success("Serviço adicionado!");
    setNovoServico("");
    fetchData();
  }

  async function handleRemoveServico(servicoId: string) {
    const { error } = await supabase
      .from("medico_servicos")
      .update({ ativo: false })
      .eq("id", servicoId);

    if (error) {
      toast.error("Erro ao remover serviço");
      return;
    }

    fetchData();
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Minha Página Pública</h2>
          <p className="text-muted-foreground">Configure como os pacientes veem seu perfil</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.open(`/medico/${medicoData.id}`, "_blank")}>
          <Eye className="w-4 h-4" />
          Ver Página
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-6">
          {/* Foto e Bio */}
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Perfil</CardTitle>
              <Button
                variant={editing ? "default" : "outline"}
                size="sm"
                onClick={() => editing ? handleSaveBio() : setEditing(true)}
                className="gap-2"
              >
                {editing ? (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4" />
                    Editar
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL da Foto</Label>
                <Input
                  value={formData.foto_url}
                  onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  placeholder="https://..."
                  disabled={!editing}
                />
              </div>
              <div>
                <Label>Bio / Apresentação</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Conte um pouco sobre você..."
                  rows={4}
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Servicos */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={novoServico}
                  onChange={(e) => setNovoServico(e.target.value)}
                  placeholder="Ex: Consulta de rotina, Teleconsulta..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddServico()}
                />
                <Button onClick={handleAddServico} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {servicos.map((servico) => (
                  <Badge
                    key={servico.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {servico.nome_servico}
                    <button
                      onClick={() => handleRemoveServico(servico.id)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {servicos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Prévia da Página
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-xl p-6 bg-muted/30">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {formData.foto_url ? (
                    <img src={formData.foto_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{medicoData?.nome}</h3>
                  <p className="text-muted-foreground">{medicoData?.especialidade}</p>
                  {medicoData?.crm && (
                    <p className="text-sm text-muted-foreground">CRM: {medicoData.crm}</p>
                  )}
                </div>
              </div>

              {/* Avaliação */}
              {avaliacoes.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= mediaAvaliacao ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {mediaAvaliacao.toFixed(1)} ({avaliacoes.length} avaliações)
                  </span>
                </div>
              )}

              {/* Bio */}
              {formData.bio && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">Sobre</h4>
                  <p className="text-sm text-muted-foreground">{formData.bio}</p>
                </div>
              )}

              {/* Servicos */}
              {servicos.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Serviços</h4>
                  <div className="flex flex-wrap gap-2">
                    {servicos.map((s) => (
                      <Badge key={s.id} variant="outline">
                        {s.nome_servico}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Locais */}
              {locais.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Locais de Atendimento</h4>
                  <div className="space-y-2">
                    {locais.map((local) => (
                      <div key={local.id} className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{local.nome_local}</span>
                        {local.cidade && (
                          <span className="text-muted-foreground">
                            - {local.cidade}/{local.estado}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
