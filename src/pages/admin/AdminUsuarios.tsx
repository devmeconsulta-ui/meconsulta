import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, UserCog, Shield, Eye, Edit, Trash2, User, Mail, Calendar, CheckCircle, XCircle, Building2, Stethoscope, Users, ChevronDown, ChevronRight } from "lucide-react";
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

interface ClinicaComUsuarios {
  id: string;
  nome_fantasia: string;
  cnpj: string | null;
  email_contato: string | null;
  ativo: boolean | null;
  created_at: string | null;
  usuarios: Array<{
    id: string;
    nome: string;
    email: string;
    papel: string;
    ativo: boolean;
  }>;
  medicos: Array<{
    id: string;
    nome: string;
    especialidade: string | null;
    crm: string | null;
    ativo: boolean;
  }>;
  pacientes: Array<{
    id: string;
    nome: string;
    email: string | null;
    cpf: string | null;
    telefone: string | null;
  }>;
}

export default function AdminUsuarios() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("admins");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [editUsuario, setEditUsuario] = useState<Partial<Usuario>>({});
  const [expandedClinicas, setExpandedClinicas] = useState<Record<string, boolean>>({});
  const [newUser, setNewUser] = useState({
    nome: "", email: "", senha: "", tipo: "admin", papel: "atendente" as Papel,
  });

  const userPapel = (currentUser?.papel as Papel) || "atendente";
  const canEdit = userPapel === "superadmin" || userPapel === "admin";
  const canDelete = userPapel === "superadmin";
  const canChangePapel = userPapel === "superadmin";

  // Fetch all usuarios
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Usuario[];
    },
  });

  // Fetch clinicas with their staff and patients
  const { data: clinicasData, isLoading: clinicasLoading } = useQuery({
    queryKey: ["admin-clinicas-usuarios"],
    queryFn: async () => {
      const { data: clinicas, error: clinicasError } = await supabase
        .from("clinicas")
        .select("id, nome_fantasia, cnpj, email_contato, ativo, created_at")
        .order("nome_fantasia");
      if (clinicasError) throw clinicasError;

      const [staffResult, medicosResult, consultasResult] = await Promise.all([
        supabase.from("usuarios_clinica").select("id, nome, email, papel, ativo, clinica_id"),
        supabase.from("clinicas_medicos").select("clinica_id, medico:medicos!clinicas_medicos_medico_id_fkey(id, nome, especialidade, crm, ativo)").eq("ativo", true),
        supabase.from("consultas").select("clinica_id, paciente_id, pacientes(id, nome, email, cpf, telefone)").not("clinica_id", "is", null).not("paciente_id", "is", null),
      ]);

      if (staffResult.error) throw staffResult.error;
      if (medicosResult.error) throw medicosResult.error;
      if (consultasResult.error) throw consultasResult.error;

      const result: ClinicaComUsuarios[] = (clinicas || []).map((c) => {
        const staff = (staffResult.data || []).filter((s: any) => s.clinica_id === c.id);
        
        // Médicos vinculados a esta clínica
        const clinicaMedicos = (medicosResult.data || [])
          .filter((cm: any) => cm.clinica_id === c.id && cm.medico)
          .map((cm: any) => cm.medico);

        // Deduplicate patients per clinic
        const pacientesMap = new Map<string, any>();
        (consultasResult.data || []).forEach((con: any) => {
          if (con.clinica_id === c.id && con.pacientes) {
            pacientesMap.set(con.pacientes.id, con.pacientes);
          }
        });

        return {
          ...c,
          usuarios: staff,
          medicos: clinicaMedicos,
          pacientes: Array.from(pacientesMap.values()),
        };
      });

      return result;
    },
  });

  // Mutations (same as before)
  const createUsuario = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data, error } = await supabase.from("usuarios").insert({
        nome: userData.nome, email: userData.email, senha_hash: userData.senha,
        tipo: userData.tipo, papel: userData.papel, ativo: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success("Usuário criado com sucesso!");
      setIsDialogOpen(false);
      setNewUser({ nome: "", email: "", senha: "", tipo: "admin", papel: "atendente" });
    },
    onError: (error: any) => toast.error(`Erro ao criar usuário: ${error.message}`),
  });

  const updateUsuario = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Usuario>) => {
      const { error } = await supabase.from("usuarios").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success("Usuário atualizado!");
      setIsEditDialogOpen(false);
      setSelectedUsuario(null);
      setEditUsuario({});
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const deleteUsuario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("usuarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success("Usuário excluído!");
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
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

  const openViewDialog = (usuario: Usuario) => { setSelectedUsuario(usuario); setIsViewDialogOpen(true); };
  const openEditDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setEditUsuario({ nome: usuario.nome, email: usuario.email, tipo: usuario.tipo, papel: usuario.papel, ativo: usuario.ativo });
    setIsEditDialogOpen(true);
  };

  const canEditUser = (usuario: Usuario) => {
    if (userPapel === "superadmin") return true;
    if (userPapel === "admin") return usuario.papel !== "superadmin" && usuario.papel !== "admin";
    return false;
  };

  // Filter helpers - only actual admins/superadmins, not atendentes
  const admins = (usuarios || []).filter(u => u.tipo === "admin" || u.papel === "superadmin" || u.papel === "admin");
  const medicos = (usuarios || []).filter(u => u.tipo === "medico");
  const pacientes = (usuarios || []).filter(u => u.tipo === "paciente" && u.papel !== "atendente" && u.papel !== "supervisor");
  const clinicaOwners = (usuarios || []).filter(u => u.tipo === "clinica");

  const filterBySearch = (list: Usuario[]) => {
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(u => u.nome.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  };

  const toggleClinica = (id: string) => {
    setExpandedClinicas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderUserTable = (list: Usuario[], showTipo = false) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            {showTipo && <TableHead>Tipo</TableHead>}
            <TableHead>Papel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell className="font-medium">{usuario.nome}</TableCell>
              <TableCell>{usuario.email}</TableCell>
              {showTipo && (
                <TableCell className="capitalize">{tipoLabels[usuario.tipo] || usuario.tipo}</TableCell>
              )}
              <TableCell>
                <Badge variant="secondary" className={papelColors[usuario.papel] || ""}>
                  {papelLabels[usuario.papel] || usuario.papel}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={usuario.ativo ? "default" : "secondary"}
                  className={usuario.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {usuario.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(usuario.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Visualizar" onClick={() => openViewDialog(usuario)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEditUser(usuario) && (
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => openEditDialog(usuario)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && canEditUser(usuario) && (
                    <Button variant="ghost" size="icon" title="Excluir"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Excluir este usuário?")) deleteUsuario.mutate(usuario.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {list.length === 0 && (
        <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCog className="h-7 w-7" /> Usuários
          </h1>
          <p className="text-muted-foreground">Gerencie os usuários e permissões do sistema</p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Usuário</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Criar Novo Usuário</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={newUser.nome} onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={newUser.senha} onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })} placeholder="Senha" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Usuário</Label>
                  <Select value={newUser.tipo} onValueChange={(v) => setNewUser({ ...newUser, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="medico">Médico</SelectItem>
                      <SelectItem value="paciente">Paciente</SelectItem>
                      <SelectItem value="clinica">Clínica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Papel/Permissão</Label>
                  <Select value={newUser.papel} onValueChange={(v: Papel) => setNewUser({ ...newUser, papel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atendente">Atendente</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {userPapel === "superadmin" && <SelectItem value="superadmin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createUsuario.isPending}>
                    {createUsuario.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="admins" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Admins</span>
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">{admins.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="medicos" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Médicos</span>
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">{medicos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pacientes" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Pacientes</span>
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">{pacientes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="clinicas" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clínicas</span>
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">{clinicasData?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Admins Tab */}
        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Administradores & Super Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : renderUserTable(filterBySearch(admins))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medicos Tab */}
        <TabsContent value="medicos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" /> Médicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : renderUserTable(filterBySearch(medicos))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pacientes Tab */}
        <TabsContent value="pacientes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Pacientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : renderUserTable(filterBySearch(pacientes))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinicas Tab */}
        <TabsContent value="clinicas">
          <div className="space-y-4">
            {/* Clinic owners */}
            {clinicaOwners.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Donos de Clínicas (Contas)</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderUserTable(filterBySearch(clinicaOwners))}
                </CardContent>
              </Card>
            )}

            {/* Each clinic with staff and patients */}
            {clinicasLoading ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : (clinicasData || []).map((clinica) => {
              const isExpanded = expandedClinicas[clinica.id];
              const searchLower = search.toLowerCase();
              const filteredStaff = clinica.usuarios.filter(u => 
                !search || u.nome.toLowerCase().includes(searchLower) || u.email.toLowerCase().includes(searchLower)
              );
              const filteredPacientes = clinica.pacientes.filter(p =>
                !search || p.nome.toLowerCase().includes(searchLower) || (p.email || "").toLowerCase().includes(searchLower)
              );

              // If searching and no matches, hide this clinic
              if (search && filteredStaff.length === 0 && filteredPacientes.length === 0) return null;

              return (
                <Card key={clinica.id}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleClinica(clinica.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardTitle className="flex items-center justify-between text-base">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{clinica.nome_fantasia}</p>
                              <p className="text-xs text-muted-foreground font-normal">
                                {clinica.cnpj || "Sem CNPJ"} • {clinica.usuarios.length} funcionário(s) • {clinica.medicos.length} médico(s) • {clinica.pacientes.length} paciente(s)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={clinica.ativo ? "default" : "secondary"}
                              className={clinica.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                              {clinica.ativo ? "Ativa" : "Inativa"}
                            </Badge>
                            {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                          </div>
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                       <CardContent className="space-y-6 pt-0">
                        {/* Staff */}
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" /> Funcionários ({filteredStaff.length})
                          </h4>
                          {filteredStaff.length > 0 ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>E-mail</TableHead>
                                    <TableHead>Papel</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredStaff.map((staff) => (
                                    <TableRow key={staff.id}>
                                      <TableCell className="font-medium">{staff.nome}</TableCell>
                                      <TableCell>{staff.email}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary" className={papelColors[staff.papel as Papel] || "bg-muted"}>
                                          {papelLabels[staff.papel as Papel] || staff.papel}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={staff.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                          {staff.ativo ? "Ativo" : "Inativo"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground pl-6">Nenhum funcionário cadastrado</p>
                          )}
                        </div>

                        {/* Médicos */}
                        {(() => {
                          const filteredMedicos = clinica.medicos.filter(m =>
                            !search || m.nome.toLowerCase().includes(searchLower) || (m.especialidade || "").toLowerCase().includes(searchLower)
                          );
                          return (
                            <div>
                              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                <Stethoscope className="h-4 w-4" /> Médicos ({filteredMedicos.length})
                              </h4>
                              {filteredMedicos.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Especialidade</TableHead>
                                        <TableHead>CRM</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {filteredMedicos.map((med) => (
                                        <TableRow key={med.id}>
                                          <TableCell className="font-medium">{med.nome}</TableCell>
                                          <TableCell>{med.especialidade || "—"}</TableCell>
                                          <TableCell>{med.crm || "—"}</TableCell>
                                          <TableCell>
                                            <Badge className={med.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                              {med.ativo ? "Ativo" : "Inativo"}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground pl-6">Nenhum médico vinculado</p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Patients */}
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" /> Pacientes ({filteredPacientes.length})
                          </h4>
                          {filteredPacientes.length > 0 ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>E-mail</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>Telefone</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredPacientes.map((pac) => (
                                    <TableRow key={pac.id}>
                                      <TableCell className="font-medium">{pac.nome}</TableCell>
                                      <TableCell>{pac.email || "—"}</TableCell>
                                      <TableCell>{pac.cpf || "—"}</TableCell>
                                      <TableCell>{pac.telefone || "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground pl-6">Nenhum paciente vinculado</p>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Detalhes do Usuário</DialogTitle>
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
                  <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{selectedUsuario.nome}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">E-mail</p><p className="font-medium">{selectedUsuario.email}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <UserCog className="h-5 w-5 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium capitalize">{tipoLabels[selectedUsuario.tipo] || selectedUsuario.tipo}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Papel</p><Badge className={papelColors[selectedUsuario.papel] || ""}>{papelLabels[selectedUsuario.papel] || selectedUsuario.papel}</Badge></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    {selectedUsuario.ativo ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                    <div><p className="text-xs text-muted-foreground">Status</p><Badge className={selectedUsuario.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{selectedUsuario.ativo ? "Ativo" : "Inativo"}</Badge></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Criado em</p><p className="font-medium">{format(new Date(selectedUsuario.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
            {selectedUsuario && canEditUser(selectedUsuario) && (
              <Button onClick={() => { setIsViewDialogOpen(false); openEditDialog(selectedUsuario); }}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editUsuario.nome || ""} onChange={(e) => setEditUsuario({ ...editUsuario, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={editUsuario.email || ""} onChange={(e) => setEditUsuario({ ...editUsuario, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Usuário</Label>
              <Select value={editUsuario.tipo || ""} onValueChange={(v) => setEditUsuario({ ...editUsuario, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="paciente">Paciente</SelectItem>
                  <SelectItem value="clinica">Clínica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Papel/Permissão</Label>
              <Select value={editUsuario.papel || ""} onValueChange={(v: Papel) => setEditUsuario({ ...editUsuario, papel: v })}
                disabled={!canChangePapel && selectedUsuario?.papel !== "atendente"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {userPapel === "superadmin" && <SelectItem value="superadmin">Super Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium">Status Ativo</Label>
                <p className="text-xs text-muted-foreground">Usuários inativos não podem acessar</p>
              </div>
              <Switch checked={editUsuario.ativo ?? true} onCheckedChange={(checked) => setEditUsuario({ ...editUsuario, ativo: checked })} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedUsuario(null); setEditUsuario({}); }}>Cancelar</Button>
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
