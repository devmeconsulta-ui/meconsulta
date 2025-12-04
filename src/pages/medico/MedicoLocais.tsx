import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface MedicoContext {
  medicoData: any;
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
}

export default function MedicoLocais() {
  const { medicoData } = useOutletContext<MedicoContext>();
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
  }, [medicoData]);

  async function fetchLocais() {
    if (!medicoData?.id) return;
    const { data } = await supabase
      .from("locais_atendimento")
      .select("*")
      .eq("medico_id", medicoData.id)
      .order("created_at", { ascending: false });
    setLocais(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!medicoData?.id) return;

    const payload = {
      ...formData,
      medico_id: medicoData.id,
    };

    if (editingLocal) {
      const { error } = await supabase
        .from("locais_atendimento")
        .update(payload)
        .eq("id", editingLocal.id);
      if (error) {
        toast.error("Erro ao atualizar local");
        return;
      }
      toast.success("Local atualizado com sucesso!");
    } else {
      const { error } = await supabase.from("locais_atendimento").insert(payload);
      if (error) {
        toast.error("Erro ao adicionar local");
        return;
      }
      toast.success("Local adicionado com sucesso!");
    }

    setDialogOpen(false);
    setEditingLocal(null);
    resetForm();
    fetchLocais();
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

  function resetForm() {
    setFormData({
      nome_local: "",
      tipo_atendimento: "presencial",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      observacoes: "",
    });
  }

  function handleEdit(local: Local) {
    setEditingLocal(local);
    setFormData({
      nome_local: local.nome_local,
      tipo_atendimento: local.tipo_atendimento,
      endereco: local.endereco || "",
      cidade: local.cidade || "",
      estado: local.estado || "",
      cep: local.cep || "",
      observacoes: local.observacoes || "",
    });
    setDialogOpen(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Locais de Atendimento</h2>
          <p className="text-muted-foreground">Gerencie seus locais de atendimento</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingLocal(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Local
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingLocal ? "Editar Local" : "Novo Local de Atendimento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome do Local *</Label>
                <Input
                  value={formData.nome_local}
                  onChange={(e) => setFormData({ ...formData, nome_local: e.target.value })}
                  placeholder="Ex: Clínica Centro"
                  required
                />
              </div>

              <div>
                <Label>Tipo de Atendimento *</Label>
                <Select
                  value={formData.tipo_atendimento}
                  onValueChange={(value) => setFormData({ ...formData, tipo_atendimento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo_atendimento !== "online" && (
                <>
                  <div>
                    <Label>Endereço</Label>
                    <Input
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="Rua, número"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Input
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>CEP</Label>
                    <Input
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingLocal ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {locais.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum local de atendimento cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione seu primeiro local clicando no botão acima
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

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {local.ativo ? "Ativo" : "Inativo"}
                      </span>
                      <Switch
                        checked={local.ativo}
                        onCheckedChange={() => toggleAtivo(local)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(local)}>
                      <Edit className="w-4 h-4" />
                    </Button>
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
