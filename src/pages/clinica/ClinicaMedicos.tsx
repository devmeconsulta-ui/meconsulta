import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Stethoscope, ExternalLink, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function ClinicaMedicos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [search, setSearch] = useState("");
  const [searchNew, setSearchNew] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedicoToDelete, setSelectedMedicoToDelete] = useState<string | null>(null);

  // Médicos vinculados
  const { data: medicos, isLoading } = useQuery({
    queryKey: ["clinica-medicos", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const { data, error } = await supabase
        .from("clinicas_medicos")
        .select(`
          id,
          ativo,
          medico:medicos(
            id,
            nome,
            especialidade,
            crm,
            foto_url,
            valor_consulta,
            ativo
          )
        `)
        .eq("clinica_id", clinicaData.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicaData?.id,
  });

  // Médicos disponíveis para vincular (não vinculados ainda)
  const { data: medicosDisponiveis, isLoading: loadingDisponiveis } = useQuery({
    queryKey: ["medicos-disponiveis", clinicaData?.id, searchNew],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      // IDs já vinculados
      const vinculadosIds = medicos?.map((m: any) => m.medico?.id).filter(Boolean) || [];

      let query = supabase
        .from("medicos")
        .select("id, nome, especialidade, crm, foto_url, valor_consulta")
        .eq("ativo", true)
        .order("nome");

      if (vinculadosIds.length > 0) {
        query = query.not("id", "in", `(${vinculadosIds.join(",")})`);
      }

      if (searchNew.trim()) {
        query = query.or(`nome.ilike.%${searchNew}%,especialidade.ilike.%${searchNew}%,crm.ilike.%${searchNew}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicaData?.id && dialogOpen,
  });

  // Vincular médico
  const vincularMutation = useMutation({
    mutationFn: async (medicoId: string) => {
      const { error } = await supabase.from("clinicas_medicos").insert({
        clinica_id: clinicaData.id,
        medico_id: medicoId,
        ativo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Médico vinculado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
      queryClient.invalidateQueries({ queryKey: ["medicos-disponiveis"] });
      setDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao vincular médico");
    },
  });

  // Toggle ativo/inativo
  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("clinicas_medicos")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Desvincular médico
  const desvincularMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clinicas_medicos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Médico desvinculado!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
      setDeleteDialogOpen(false);
      setSelectedMedicoToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao desvincular médico");
    },
  });

  const filteredMedicos = medicos?.filter((m: any) =>
    m.medico?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.medico?.especialidade?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Médicos Vinculados</h1>
          <p className="text-muted-foreground">
            Gerencie os médicos vinculados à sua clínica.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Vincular Médico
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Vincular Novo Médico
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, especialidade ou CRM..."
                  value={searchNew}
                  onChange={(e) => setSearchNew(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loadingDisponiveis ? (
                <div className="text-center py-8 text-muted-foreground">
                  Buscando médicos...
                </div>
              ) : medicosDisponiveis?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum médico disponível encontrado</p>
                  <p className="text-xs mt-1">Todos os médicos já estão vinculados ou não há médicos cadastrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medicosDisponiveis?.map((medico: any) => (
                    <Card key={medico.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              {medico.foto_url ? (
                                <img 
                                  src={medico.foto_url} 
                                  alt={medico.nome}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <Stethoscope className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{medico.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {medico.especialidade} • CRM: {medico.crm}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => vincularMutation.mutate(medico.id)}
                            disabled={vincularMutation.isPending}
                          >
                            Vincular
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredMedicos?.length === 0 ? (
            <div className="text-center py-8">
              <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum médico vinculado ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Vincular Médico" para adicionar
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMedicos?.map((item: any) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {item.medico?.foto_url ? (
                          <img 
                            src={item.medico.foto_url} 
                            alt={item.medico.nome}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Stethoscope className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{item.medico?.nome}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.medico?.especialidade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CRM: {item.medico?.crm}
                        </p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge variant={item.ativo ? "default" : "secondary"}>
                            {item.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                          <span className="text-sm font-medium text-primary">
                            R$ {item.medico?.valor_consulta?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.ativo}
                          onCheckedChange={(checked) => 
                            toggleAtivoMutation.mutate({ id: item.id, ativo: checked })
                          }
                        />
                        <Label className="text-xs text-muted-foreground">
                          {item.ativo ? "Ativo" : "Inativo"}
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/medico/${item.medico?.id}`)}
                          title="Ver página pública"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSelectedMedicoToDelete(item.id);
                            setDeleteDialogOpen(true);
                          }}
                          title="Desvincular médico"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular Médico?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação irá remover o vínculo do médico com a clínica. O médico continuará existindo no sistema, mas não aparecerá mais na sua lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedMedicoToDelete && desvincularMutation.mutate(selectedMedicoToDelete)}
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
