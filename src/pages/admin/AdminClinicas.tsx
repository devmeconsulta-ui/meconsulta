import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Building2, Search, Loader2, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Clinica {
  id: string;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj: string | null;
  email_contato: string | null;
  telefone: string | null;
  endereco_principal: string | null;
  cidade: string | null;
  estado: string | null;
  ativo: boolean | null;
  created_at: string | null;
}

export default function AdminClinicas() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClinica, setEditingClinica] = useState<Clinica | null>(null);
  const [formData, setFormData] = useState({
    nome_fantasia: "",
    razao_social: "",
    cnpj: "",
    email_contato: "",
    telefone: "",
    endereco_principal: "",
    cidade: "",
    estado: "",
  });

  const { data: clinicas, isLoading } = useQuery({
    queryKey: ["admin-clinicas", search],
    queryFn: async () => {
      let query = supabase
        .from("clinicas")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `nome_fantasia.ilike.%${search}%,razao_social.ilike.%${search}%,cnpj.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Clinica[];
    },
  });

  const createClinica = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Create user for clinic
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .insert({
          nome: data.nome_fantasia,
          email: data.email_contato || `clinica_${Date.now()}@meconsulta.com`,
          tipo: "clinica",
          papel: "clinica",
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create clinic
      const { error: clinicaError } = await supabase.from("clinicas").insert({
        nome_fantasia: data.nome_fantasia,
        razao_social: data.razao_social || null,
        cnpj: data.cnpj || null,
        email_contato: data.email_contato || null,
        telefone: data.telefone || null,
        endereco_principal: data.endereco_principal || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        usuario_id: usuario.id,
      });

      if (clinicaError) throw clinicaError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinicas"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Clínica criada",
        description: "A clínica foi cadastrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar clínica",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateClinica = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("clinicas")
        .update({
          nome_fantasia: data.nome_fantasia,
          razao_social: data.razao_social || null,
          cnpj: data.cnpj || null,
          email_contato: data.email_contato || null,
          telefone: data.telefone || null,
          endereco_principal: data.endereco_principal || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinicas"] });
      setEditingClinica(null);
      resetForm();
      toast({
        title: "Clínica atualizada",
        description: "Os dados da clínica foram atualizados.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("clinicas")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinicas"] });
      toast({
        title: "Status atualizado",
        description: "O status da clínica foi alterado.",
      });
    },
  });

  const deleteClinica = useMutation({
    mutationFn: async (id: string) => {
      // Delete related records first
      await supabase.from("clinicas_medicos").delete().eq("clinica_id", id);
      await supabase.from("usuarios_clinica").delete().eq("clinica_id", id);
      await supabase.from("locais_atendimento").delete().eq("clinica_id", id);
      
      // Get clinic to find usuario_id
      const { data: clinica } = await supabase
        .from("clinicas")
        .select("usuario_id")
        .eq("id", id)
        .single();

      // Delete clinic
      const { error } = await supabase.from("clinicas").delete().eq("id", id);
      if (error) throw error;

      // Delete associated user if exists
      if (clinica?.usuario_id) {
        await supabase.from("usuarios").delete().eq("id", clinica.usuario_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinicas"] });
      toast({
        title: "Clínica excluída",
        description: "A clínica foi removida do sistema.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      nome_fantasia: "",
      razao_social: "",
      cnpj: "",
      email_contato: "",
      telefone: "",
      endereco_principal: "",
      cidade: "",
      estado: "",
    });
  };

  const handleEdit = (clinica: Clinica) => {
    setEditingClinica(clinica);
    setFormData({
      nome_fantasia: clinica.nome_fantasia,
      razao_social: clinica.razao_social || "",
      cnpj: clinica.cnpj || "",
      email_contato: clinica.email_contato || "",
      telefone: clinica.telefone || "",
      endereco_principal: clinica.endereco_principal || "",
      cidade: clinica.cidade || "",
      estado: clinica.estado || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_fantasia) {
      toast({
        title: "Erro",
        description: "Nome fantasia é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (editingClinica) {
      updateClinica.mutate({ id: editingClinica.id, data: formData });
    } else {
      createClinica.mutate(formData);
    }
  };

  const FormFields = () => (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
          <Input
            id="nome_fantasia"
            value={formData.nome_fantasia}
            onChange={(e) =>
              setFormData({ ...formData, nome_fantasia: e.target.value })
            }
            placeholder="Nome da clínica"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="razao_social">Razão Social</Label>
          <Input
            id="razao_social"
            value={formData.razao_social}
            onChange={(e) =>
              setFormData({ ...formData, razao_social: e.target.value })
            }
            placeholder="Razão social"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            value={formData.cnpj}
            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={formData.telefone}
            onChange={(e) =>
              setFormData({ ...formData, telefone: e.target.value })
            }
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email_contato">E-mail de Contato</Label>
        <Input
          id="email_contato"
          type="email"
          value={formData.email_contato}
          onChange={(e) =>
            setFormData({ ...formData, email_contato: e.target.value })
          }
          placeholder="contato@clinica.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endereco_principal">Endereço Principal</Label>
        <Input
          id="endereco_principal"
          value={formData.endereco_principal}
          onChange={(e) =>
            setFormData({ ...formData, endereco_principal: e.target.value })
          }
          placeholder="Rua, número, bairro"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            value={formData.cidade}
            onChange={(e) =>
              setFormData({ ...formData, cidade: e.target.value })
            }
            placeholder="Cidade"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Input
            id="estado"
            value={formData.estado}
            onChange={(e) =>
              setFormData({ ...formData, estado: e.target.value })
            }
            placeholder="UF"
            maxLength={2}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clínicas</h1>
          <p className="text-muted-foreground">
            Gerencie as clínicas cadastradas no sistema
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Clínica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Clínica</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormFields />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createClinica.isPending}>
                  {createClinica.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Cadastrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingClinica}
        onOpenChange={(open) => !open && setEditingClinica(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Clínica</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormFields />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingClinica(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateClinica.isPending}>
                {updateClinica.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, razão social ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Clínicas Cadastradas ({clinicas?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !clinicas?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma clínica encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clinicas.map((clinica) => (
                    <TableRow key={clinica.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{clinica.nome_fantasia}</p>
                          {clinica.razao_social && (
                            <p className="text-xs text-muted-foreground">
                              {clinica.razao_social}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{clinica.cnpj || "-"}</TableCell>
                      <TableCell>
                        {clinica.cidade && clinica.estado
                          ? `${clinica.cidade}/${clinica.estado}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {clinica.email_contato && (
                            <p>{clinica.email_contato}</p>
                          )}
                          {clinica.telefone && (
                            <p className="text-muted-foreground">
                              {clinica.telefone}
                            </p>
                          )}
                          {!clinica.email_contato && !clinica.telefone && "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={clinica.ativo ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() =>
                            toggleStatus.mutate({
                              id: clinica.id,
                              ativo: clinica.ativo ?? true,
                            })
                          }
                        >
                          {clinica.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(clinica)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Clínica</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a clínica "{clinica.nome_fantasia}"? 
                                  Esta ação irá remover todos os dados associados (médicos vinculados, 
                                  usuários da clínica, locais de atendimento) e não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteClinica.mutate(clinica.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteClinica.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Excluir"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
