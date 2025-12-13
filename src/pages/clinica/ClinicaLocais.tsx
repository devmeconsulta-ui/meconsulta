import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Plus, Edit, Building, Video, Globe } from "lucide-react";

interface ClinicaContext {
  clinicaData: any;
}

interface Local {
  id: string;
  nome_local: string;
  tipo_atendimento: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  ativo: boolean;
  medico_id: string;
  medicos?: { nome: string };
}

export default function ClinicaLocais() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [formData, setFormData] = useState({
    nome_local: "",
    tipo_atendimento: "presencial",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    observacoes: "",
  });

  useEffect(() => {
    fetchLocais();
  }, [clinicaData]);

  async function fetchLocais() {
    if (!clinicaData?.id) return;

    // Busca médicos vinculados à clínica
    const { data: vinculosData } = await supabase
      .from("clinicas_medicos")
      .select("medico_id")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    if (!vinculosData || vinculosData.length === 0) {
      setLocais([]);
      setLoading(false);
      return;
    }

    const medicoIds = vinculosData.map((v) => v.medico_id);

    // Busca locais dos médicos vinculados
    const { data } = await supabase
      .from("locais_atendimento")
      .select("*, medicos(nome)")
      .in("medico_id", medicoIds)
      .order("created_at", { ascending: false });

    setLocais(data || []);
    setLoading(false);
  }

  async function toggleAtivo(local: Local) {
    const { error } = await supabase
      .from("locais_atendimento")
      .update({ ativo: !local.ativo })
      .eq("id", local.id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    fetchLocais();
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "presencial":
        return <Building className="w-5 h-5" />;
      case "online":
        return <Video className="w-5 h-5" />;
      case "hibrido":
        return <Globe className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "presencial":
        return "Presencial";
      case "online":
        return "Online";
      case "hibrido":
        return "Híbrido";
      default:
        return tipo;
    }
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
        <h2 className="text-2xl font-bold text-foreground">Locais de Atendimento</h2>
        <p className="text-muted-foreground">Visualize os locais de atendimento dos médicos vinculados</p>
      </div>

      {locais.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum local de atendimento encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os locais são cadastrados pelos médicos vinculados à clínica
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {locais.map((local) => (
            <Card key={local.id} className={`card-shadow ${!local.ativo ? "opacity-60" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      local.tipo_atendimento === "online" 
                        ? "bg-green-500/10 text-green-500" 
                        : local.tipo_atendimento === "hibrido"
                        ? "bg-purple-500/10 text-purple-500"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {getTipoIcon(local.tipo_atendimento)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{local.nome_local}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getTipoLabel(local.tipo_atendimento)}
                      </p>
                      {local.medicos && (
                        <p className="text-sm text-primary mt-1">
                          Dr(a). {local.medicos.nome}
                        </p>
                      )}
                      {local.endereco && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {local.endereco}
                          {local.cidade && `, ${local.cidade}`}
                          {local.estado && ` - ${local.estado}`}
                        </p>
                      )}
                      {local.observacoes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {local.observacoes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${local.ativo ? "text-green-500" : "text-muted-foreground"}`}>
                      {local.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
