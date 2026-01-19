import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { MapPin, Building, Edit, Check, Users, Plus, Trash2, Video, User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ClinicaContext {
  clinicaData: any;
}

interface LocalAtendimento {
  id: string;
  nome_local: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  tipo_atendimento: string;
  ativo: boolean;
  medico_id: string;
  clinica_id: string | null;
  medico?: {
    id: string;
    nome: string;
    especialidade: string | null;
  };
}

export default function ClinicaLocais() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [localToDelete, setLocalToDelete] = useState<LocalAtendimento | null>(null);
  const [editingLocal, setEditingLocal] = useState<LocalAtendimento | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    endereco_principal: clinicaData?.endereco_principal || "",
    cidade: clinicaData?.cidade || "",
    estado: clinicaData?.estado || "",
  });

  const [localFormData, setLocalFormData] = useState({
    nome_local: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    tipo_atendimento: "presencial",
    medico_id: "",
    ativo: true,
  });

  // Buscar médicos vinculados à clínica
  const { data: medicos } = useQuery({
    queryKey: ["clinica-medicos-vinculados", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];
      const { data } = await supabase
        .from("clinicas_medicos")
        .select("medico_id, ativo, medicos(id, nome, especialidade, foto_url)")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);
      return data || [];
    },
    enabled: !!clinicaData?.id,
  });

  // Buscar locais de atendimento da clínica
  const { data: locais, isLoading: loadingLocais } = useQuery({
    queryKey: ["clinica-locais-atendimento", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];
      const { data, error } = await supabase
        .from("locais_atendimento")
        .select(`
          *,
          medico:medicos!locais_atendimento_medico_id_fkey(id, nome, especialidade)
        `)
        .eq("clinica_id", clinicaData.id)
        .order("nome_local");
      
      if (error) throw error;
      return data as LocalAtendimento[];
    },
    enabled: !!clinicaData?.id,
  });

  async function handleSave() {
    if (!clinicaData?.id) return;
    setLoading(true);

    const { error } = await supabase
      .from("clinicas")
      .update({
        endereco_principal: formData.endereco_principal,
        cidade: formData.cidade,
        estado: formData.estado,
      })
      .eq("id", clinicaData.id);

    if (error) {
      toast.error("Erro ao atualizar endereço");
    } else {
      toast.success("Endereço atualizado com sucesso!");
      clinicaData.endereco_principal = formData.endereco_principal;
      clinicaData.cidade = formData.cidade;
      clinicaData.estado = formData.estado;
      setDialogOpen(false);
    }
    setLoading(false);
  }

  function openNewLocalDialog() {
    setEditingLocal(null);
    setLocalFormData({
      nome_local: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      tipo_atendimento: "presencial",
      medico_id: medicos?.[0]?.medico_id || "",
      ativo: true,
    });
    setLocalDialogOpen(true);
  }

  function openEditLocalDialog(local: LocalAtendimento) {
    setEditingLocal(local);
    setLocalFormData({
      nome_local: local.nome_local,
      endereco: local.endereco || "",
      cidade: local.cidade || "",
      estado: local.estado || "",
      cep: local.cep || "",
      tipo_atendimento: local.tipo_atendimento,
      medico_id: local.medico_id,
      ativo: local.ativo,
    });
    setLocalDialogOpen(true);
  }

  async function handleSaveLocal() {
    if (!clinicaData?.id) return;
    if (!localFormData.nome_local.trim()) {
      toast.error("Nome do local é obrigatório");
      return;
    }
    if (!localFormData.medico_id) {
      toast.error("Selecione um médico");
      return;
    }

    setLoading(true);

    if (editingLocal) {
      // Update existing
      const { error } = await supabase
        .from("locais_atendimento")
        .update({
          nome_local: localFormData.nome_local,
          endereco: localFormData.endereco || null,
          cidade: localFormData.cidade || null,
          estado: localFormData.estado || null,
          cep: localFormData.cep || null,
          tipo_atendimento: localFormData.tipo_atendimento,
          medico_id: localFormData.medico_id,
          ativo: localFormData.ativo,
        })
        .eq("id", editingLocal.id);

      if (error) {
        toast.error("Erro ao atualizar local");
        console.error(error);
      } else {
        toast.success("Local atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["clinica-locais-atendimento"] });
        setLocalDialogOpen(false);
      }
    } else {
      // Create new
      const { error } = await supabase
        .from("locais_atendimento")
        .insert({
          nome_local: localFormData.nome_local,
          endereco: localFormData.endereco || null,
          cidade: localFormData.cidade || null,
          estado: localFormData.estado || null,
          cep: localFormData.cep || null,
          tipo_atendimento: localFormData.tipo_atendimento,
          medico_id: localFormData.medico_id,
          clinica_id: clinicaData.id,
          ativo: localFormData.ativo,
        });

      if (error) {
        toast.error("Erro ao criar local");
        console.error(error);
      } else {
        toast.success("Local criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["clinica-locais-atendimento"] });
        setLocalDialogOpen(false);
      }
    }
    setLoading(false);
  }

  async function handleDeleteLocal() {
    if (!localToDelete) return;
    setLoading(true);

    const { error } = await supabase
      .from("locais_atendimento")
      .delete()
      .eq("id", localToDelete.id);

    if (error) {
      toast.error("Erro ao excluir local. Verifique se não há consultas vinculadas.");
      console.error(error);
    } else {
      toast.success("Local excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clinica-locais-atendimento"] });
    }
    setDeleteDialogOpen(false);
    setLocalToDelete(null);
    setLoading(false);
  }

  async function toggleLocalStatus(local: LocalAtendimento) {
    const { error } = await supabase
      .from("locais_atendimento")
      .update({ ativo: !local.ativo })
      .eq("id", local.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(local.ativo ? "Local desativado" : "Local ativado");
      queryClient.invalidateQueries({ queryKey: ["clinica-locais-atendimento"] });
    }
  }

  const hasAddress = clinicaData?.endereco_principal || clinicaData?.cidade;

  return (
    <div className="space-y-6">
      {/* Endereço Principal da Clínica */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Locais de Atendimento</h2>
          <p className="text-muted-foreground">
            Gerencie os locais onde sua clínica realiza atendimentos
          </p>
        </div>
      </div>

      {/* Endereço sede */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Endereço Sede
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
              <Edit className="w-4 h-4" />
              {hasAddress ? "Editar" : "Cadastrar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasAddress ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{clinicaData?.nome_fantasia}</p>
                <p className="text-sm text-muted-foreground">
                  {clinicaData?.endereco_principal}
                  {clinicaData?.cidade && `, ${clinicaData.cidade}`}
                  {clinicaData?.estado && ` - ${clinicaData.estado}`}
                </p>
              </div>
              <Badge variant="default" className="gap-1">
                <Check className="w-3 h-3" />
                Ativo
              </Badge>
            </div>
          ) : (
            <div className="text-center py-4">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Nenhum endereço sede cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locais de Atendimento */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Locais de Atendimento
              {locais && locais.length > 0 && (
                <Badge variant="secondary">{locais.length}</Badge>
              )}
            </CardTitle>
            <Button onClick={openNewLocalDialog} className="gap-2" disabled={!medicos?.length}>
              <Plus className="w-4 h-4" />
              Novo Local
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!medicos?.length ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum médico vinculado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vincule médicos à clínica antes de criar locais de atendimento
              </p>
            </div>
          ) : loadingLocais ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : locais && locais.length > 0 ? (
            <div className="space-y-3">
              {locais.map((local) => (
                <div
                  key={local.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    local.ativo ? "bg-background" : "bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        local.tipo_atendimento === "telemedicina" 
                          ? "bg-blue-100 text-blue-600" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        {local.tipo_atendimento === "telemedicina" ? (
                          <Video className="w-5 h-5" />
                        ) : (
                          <MapPin className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{local.nome_local}</h4>
                          <Badge variant={local.ativo ? "default" : "secondary"} className="text-xs">
                            {local.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {local.tipo_atendimento === "telemedicina" ? "Telemedicina" : "Presencial"}
                          </Badge>
                        </div>
                        {local.endereco && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {local.endereco}
                            {local.cidade && `, ${local.cidade}`}
                            {local.estado && ` - ${local.estado}`}
                          </p>
                        )}
                        {local.medico && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Dr(a). {local.medico.nome} - {local.medico.especialidade || "Especialidade"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={local.ativo}
                        onCheckedChange={() => toggleLocalStatus(local)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditLocalDialog(local)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setLocalToDelete(local);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum local cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Novo Local" para adicionar um local de atendimento
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Médicos Vinculados */}
      {medicos && medicos.length > 0 && (
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Médicos vinculados à clínica</h3>
              <Badge variant="secondary">{medicos.length}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {medicos.map((vinculo: any) => (
                <div key={vinculo.medico_id} className="p-3 rounded-lg border bg-muted/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {vinculo.medicos?.nome?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">Dr(a). {vinculo.medicos?.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{vinculo.medicos?.especialidade || "Especialidade"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para editar endereço sede da clínica */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {hasAddress ? "Editar Endereço Sede" : "Cadastrar Endereço Sede"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Endereço Completo *</Label>
              <Input
                value={formData.endereco_principal}
                onChange={(e) => setFormData({ ...formData, endereco_principal: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade *</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
              <div>
                <Label>Estado *</Label>
                <Input
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar/editar local de atendimento */}
      <Dialog open={localDialogOpen} onOpenChange={setLocalDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLocal ? "Editar Local de Atendimento" : "Novo Local de Atendimento"}
            </DialogTitle>
            <DialogDescription>
              Cadastre um local onde os médicos da clínica realizam atendimentos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Local *</Label>
              <Input
                value={localFormData.nome_local}
                onChange={(e) => setLocalFormData({ ...localFormData, nome_local: e.target.value })}
                placeholder="Ex: Consultório 1, Sala de Exames, etc."
              />
            </div>

            <div>
              <Label>Médico Responsável *</Label>
              <Select
                value={localFormData.medico_id}
                onValueChange={(value) => setLocalFormData({ ...localFormData, medico_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicos?.map((vinculo: any) => (
                    <SelectItem key={vinculo.medico_id} value={vinculo.medico_id}>
                      Dr(a). {vinculo.medicos?.nome} - {vinculo.medicos?.especialidade || "Especialidade"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Atendimento *</Label>
              <Select
                value={localFormData.tipo_atendimento}
                onValueChange={(value) => setLocalFormData({ ...localFormData, tipo_atendimento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="telemedicina">Telemedicina</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Endereço</Label>
              <Input
                value={localFormData.endereco}
                onChange={(e) => setLocalFormData({ ...localFormData, endereco: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>CEP</Label>
                <Input
                  value={localFormData.cep}
                  onChange={(e) => setLocalFormData({ ...localFormData, cep: e.target.value })}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={localFormData.cidade}
                  onChange={(e) => setLocalFormData({ ...localFormData, cidade: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={localFormData.estado}
                  onChange={(e) => setLocalFormData({ ...localFormData, estado: e.target.value })}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="local-ativo"
                checked={localFormData.ativo}
                onCheckedChange={(checked) => setLocalFormData({ ...localFormData, ativo: checked })}
              />
              <Label htmlFor="local-ativo">Local ativo</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setLocalDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLocal} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local de atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O local "{localToDelete?.nome_local}" será removido permanentemente.
              {localToDelete?.endereco && (
                <span className="block mt-2 text-sm">
                  Endereço: {localToDelete.endereco}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
