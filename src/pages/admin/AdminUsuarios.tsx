import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, UserCog, Shield, Eye, Edit, Trash2, User, Mail, Calendar, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Papel = "atendente" | "supervisor" | "admin" | "superadmin";

const papelColors: Record<Papel, string> = {
  atendente: "bg-blue-100 text-blue-800",
  supervisor: "bg-purple-100 text-purple-800",
  admin: "bg-green-100 text-green-800",
  superadmin: "bg-red-100 text-red-800",
};

const papelLabels: Record<Papel, string> = {
  atendente: "Atendente",
  supervisor: "Supervisor",
  admin: "Admin",
  superadmin: "Super Admin",
};

const tipoLabels: Record<string, string> = {
  admin: "Administrador",
  medico: "Médico",
  paciente: "Paciente",
  clinica: "Clínica",
};

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  papel: Papel;
  ativo: boolean;
  created_at: string;
}

export default function AdminUsuarios() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [papelFilter, setPapelFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [editUsuario, setEditUsuario] = useState<Partial<Usuario>>({});
  const [newUser, setNewUser] = useState({
    nome: "",
    email: "",
    senha: "",
    tipo: "admin",
    papel: "atendente" as Papel,
  });

  const userPapel = (currentUser?.papel as Papel) || "atendente";
  const canEdit = userPapel === "superadmin" || userPapel === "admin";
  const canDelete = userPapel === "superadmin";
  const canChangePapel = userPapel === "superadmin";

  // Fetch usuarios
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["admin-usuarios", search, papelFilter],
    queryFn: async () => {
      let query = supabase
        .from("usuarios")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (papelFilter && papelFilter !== "all") {
        query = query.eq("papel", papelFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Usuario[];
    },
  });

  // Create usuario mutation
  const createUsuario = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data, error } = await supabase.from("usuarios").insert({
        nome: userData.nome,
        email: userData.email,
        senha_hash: userData.senha,
        tipo: userData.tipo,
        papel: userData.papel,
        ativo: true,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success("Usuário criado com sucesso!");
      setIsDialogOpen(false);
      setNewUser({
        nome: "",
        email: "",
        senha: "",
        tipo: "admin",
        papel: "atendente",
      });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  // Update usuario mutation
  const updateUsuario = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Usuario>) => {
      const { error } = await supabase.from("usuarios").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success("Usuário atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedUsuario(null);
      setEditUsuario({});
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    },
  });

  // Delete usuario mutation
  const deleteUsuario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("usuarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.nome || !newUser.email || !newUser.senha) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createUsuario.mutate(newUser);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsuario) return;
    updateUsuario.mutate({ id: selectedUsuario.id, ...editUsuario });
  };

  const openViewDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setEditUsuario({
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      papel: usuario.papel,
      ativo: usuario.ativo,
    });
    setIsEditDialogOpen(true);
  };

  const canEditUser = (usuario: Usuario) => {
    if (userPapel === "superadmin") return true;
    if (userPapel === "admin") {
      return usuario.papel !== "superadmin" && usuario.papel !== "admin";
    }
    return false;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCog className="h-7 w-7" />
            Usuários
          </h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e permissões do sistema
          </p>
        </div>

        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={newUser.nome}
                    onChange={(e) =>
                      setNewUser({ ...newUser, nome: e.target.value })
                    }
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={newUser.senha}
                    onChange={(e) =>
                      setNewUser({ ...newUser, senha: e.target.value })
                    }
                    placeholder="Senha do usuário"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Usuário</Label>
                  <Select
                    value={newUser.tipo}
                    onValueChange={(value) =>
                      setNewUser({ ...newUser, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="medico">Médico</SelectItem>
                      <SelectItem value="paciente">Paciente</SelectItem>
                      <SelectItem value="clinica">Clínica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="papel">Papel/Permissão</Label>
                  <Select
                    value={newUser.papel}
                    onValueChange={(value: Papel) =>
                      setNewUser({ ...newUser, papel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atendente">Atendente</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {userPapel === "superadmin" && (
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createUsuario.isPending}>
                    {createUsuario.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={papelFilter} onValueChange={setPapelFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Shield className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os papéis</SelectItem>
                <SelectItem value="atendente">Atendente</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : usuarios && usuarios.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">
                        {usuario.nome}
                      </TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell className="capitalize">
                        {tipoLabels[usuario.tipo] || usuario.tipo}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={papelColors[usuario.papel] || ""}
                        >
                          {papelLabels[usuario.papel] || usuario.papel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={usuario.ativo ? "default" : "secondary"}
                          className={
                            usuario.ativo
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {usuario.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(usuario.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Visualizar"
                            onClick={() => openViewDialog(usuario)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEditUser(usuario) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Editar"
                              onClick={() => openEditDialog(usuario)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && canEditUser(usuario) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Tem certeza que deseja excluir este usuário?"
                                  )
                                ) {
                                  deleteUsuario.mutate(usuario.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhum usuário encontrado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes do Usuário
            </DialogTitle>
          </DialogHeader>
          {selectedUsuario && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedUsuario.nome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="font-medium">{selectedUsuario.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <UserCog className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="font-medium capitalize">
                        {tipoLabels[selectedUsuario.tipo] || selectedUsuario.tipo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Papel</p>
                      <Badge className={papelColors[selectedUsuario.papel] || ""}>
                        {papelLabels[selectedUsuario.papel] || selectedUsuario.papel}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    {selectedUsuario.ativo ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={selectedUsuario.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {selectedUsuario.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Criado em</p>
                      <p className="font-medium">
                        {format(new Date(selectedUsuario.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fechar
            </Button>
            {selectedUsuario && canEditUser(selectedUsuario) && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(selectedUsuario);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={editUsuario.nome || ""}
                onChange={(e) =>
                  setEditUsuario({ ...editUsuario, nome: e.target.value })
                }
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUsuario.email || ""}
                onChange={(e) =>
                  setEditUsuario({ ...editUsuario, email: e.target.value })
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tipo">Tipo de Usuário</Label>
              <Select
                value={editUsuario.tipo || ""}
                onValueChange={(value) =>
                  setEditUsuario({ ...editUsuario, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="paciente">Paciente</SelectItem>
                  <SelectItem value="clinica">Clínica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-papel">Papel/Permissão</Label>
              <Select
                value={editUsuario.papel || ""}
                onValueChange={(value: Papel) =>
                  setEditUsuario({ ...editUsuario, papel: value })
                }
                disabled={!canChangePapel && selectedUsuario?.papel !== "atendente"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {userPapel === "superadmin" && (
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="edit-ativo" className="font-medium">Status Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Usuários inativos não podem acessar o sistema
                </p>
              </div>
              <Switch
                id="edit-ativo"
                checked={editUsuario.ativo ?? true}
                onCheckedChange={(checked) =>
                  setEditUsuario({ ...editUsuario, ativo: checked })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedUsuario(null);
                  setEditUsuario({});
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateUsuario.isPending}>
                {updateUsuario.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
