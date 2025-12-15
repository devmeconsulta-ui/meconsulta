import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { MapPin, Building, Edit, Check, Trash2, Plus, Users } from "lucide-react";

interface ClinicaContext {
  clinicaData: any;
}

interface LocalAtendimento {
  id: string;
  nome_local: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  tipo_atendimento: string;
  ativo: boolean;
  medico_id: string;
  medicos?: { nome: string };
}

export default function ClinicaLocais() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locais, setLocais] = useState<LocalAtendimento[]>([]);
  const [loadingLocais, setLoadingLocais] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [localToDelete, setLocalToDelete] = useState<LocalAtendimento | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    endereco_principal: clinicaData?.endereco_principal || "",
    cidade: clinicaData?.cidade || "",
    estado: clinicaData?.estado || "",
  });

  useEffect(() => {
    if (clinicaData?.id) {
      fetchLocais();
    }
  }, [clinicaData?.id]);

  async function fetchLocais() {
    setLoadingLocais(true);
    const { data, error } = await supabase
      .from("locais_atendimento")
      .select(`
        id,
        nome_local,
        endereco,
        cidade,
        estado,
        tipo_atendimento,
        ativo,
        medico_id,
        medicos(nome)
      `)
      .eq("clinica_id", clinicaData.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setLocais(data || []);
    }
    setLoadingLocais(false);
  }

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

  async function handleDeleteLocal() {
    if (!localToDelete) return;
    setDeleteLoading(true);

    // Verifica se há consultas vinculadas a este local
    const { data: consultas } = await supabase
      .from("consultas")
      .select("id")
      .eq("local_id", localToDelete.id)
      .limit(1);

    if (consultas && consultas.length > 0) {
      // Se há consultas, apenas desativa
      const { error } = await supabase
        .from("locais_atendimento")
        .update({ ativo: false })
        .eq("id", localToDelete.id);

      if (error) {
        toast.error("Erro ao desativar local");
      } else {
        toast.success("Local desativado (possui consultas vinculadas)");
        fetchLocais();
      }
    } else {
      // Se não há consultas, pode excluir
      // Primeiro verifica se há slots de agenda
      const { data: slots } = await supabase
        .from("agenda_slots")
        .select("id")
        .eq("local_id", localToDelete.id)
        .limit(1);

      if (slots && slots.length > 0) {
        // Exclui os slots primeiro
        await supabase
          .from("agenda_slots")
          .delete()
          .eq("local_id", localToDelete.id);
      }

      const { error } = await supabase
        .from("locais_atendimento")
        .delete()
        .eq("id", localToDelete.id);

      if (error) {
        toast.error("Erro ao excluir local");
      } else {
        toast.success("Local excluído com sucesso!");
        fetchLocais();
      }
    }

    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    setLocalToDelete(null);
  }

  function openDeleteDialog(local: LocalAtendimento) {
    setLocalToDelete(local);
    setDeleteDialogOpen(true);
  }

  const hasAddress = clinicaData?.endereco_principal || clinicaData?.cidade;

  return (
    <div className="space-y-6">
      {/* Endereço Principal */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Endereço da Clínica</h2>
          <p className="text-muted-foreground">
            Este é o endereço padrão para todos os médicos vinculados
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Edit className="w-4 h-4" />
          {hasAddress ? "Editar Endereço" : "Cadastrar Endereço"}
        </Button>
      </div>

      <Card className="card-shadow">
        <CardContent className="p-6">
          {hasAddress ? (
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-xl">{clinicaData?.nome_fantasia}</h3>
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Ativo
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {clinicaData?.endereco_principal}
                  {clinicaData?.cidade && `, ${clinicaData.cidade}`}
                  {clinicaData?.estado && ` - ${clinicaData.estado}`}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Todos os médicos vinculados à clínica utilizam este endereço automaticamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum endereço cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Cadastrar Endereço" para adicionar o endereço da clínica
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locais de Atendimento dos Médicos */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Locais de Atendimento Vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLocais ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : locais.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum local de atendimento cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os locais são criados automaticamente ao vincular médicos à clínica
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {locais.map((local) => (
                <div
                  key={local.id}
                  className={`p-4 rounded-lg border ${
                    local.ativo 
                      ? "bg-card border-border" 
                      : "bg-muted/50 border-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        local.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        <Building className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{local.nome_local}</h4>
                          <Badge variant={local.ativo ? "default" : "secondary"}>
                            {local.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline">
                            {local.tipo_atendimento === "presencial" ? "Presencial" : "Telemedicina"}
                          </Badge>
                        </div>
                        {local.endereco && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {local.endereco}
                            {local.cidade && `, ${local.cidade}`}
                            {local.estado && ` - ${local.estado}`}
                          </p>
                        )}
                        {local.medicos && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <Users className="w-3 h-3" />
                            Dr(a). {local.medicos.nome}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteDialog(local)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar endereço da clínica */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {hasAddress ? "Editar Endereço" : "Cadastrar Endereço"}
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

      {/* AlertDialog para confirmar exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Local de Atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o local "{localToDelete?.nome_local}"?
              <br /><br />
              Se houver consultas vinculadas, o local será apenas desativado.
              Caso contrário, será excluído permanentemente junto com os horários da agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocal}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
