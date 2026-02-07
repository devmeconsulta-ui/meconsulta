import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Users, Plus, Phone, Mail, Trash2, Pencil, Eye, EyeOff, Key, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { hashPassword } from "@/lib/secureAuth";

interface ClinicaContext {
  clinicaData: any;
}

interface UsuarioClinica {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  papel: string;
  ativo: boolean;
  created_at: string;
  senha_hash: string | null;
  permissoes: string[] | null;
  medico_id: string;
  clinica_id: string | null;
  todos_medicos: boolean | null;
  medicos_ids: string[] | null;
  medico?: { nome: string } | null;
}

const papelOptions = [
  { value: "secretaria", label: "Secretária" },
  { value: "recepcao", label: "Recepção" },
  { value: "assistente", label: "Assistente" },
  { value: "gerente", label: "Gerente" },
];

const permissaoOptions = [
  { value: "dashboard", label: "Dashboard" },
  { value: "consultas", label: "Consultas" },
  { value: "locais", label: "Locais de Atendimento" },
  { value: "agenda", label: "Agenda" },
  { value: "financeiro", label: "Financeiro" },
  { value: "pacientes", label: "Pacientes" },
];

export default function ClinicaUsuarios() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [usuarios, setUsuarios] = useState<UsuarioClinica[]>([]);
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioClinica | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    papel: "secretaria",
    ativo: true,
    senha: "",
    medicoId: "",
    todosMedicos: false,
    medicosIds: [] as string[],
    permissoes: ["dashboard", "consultas", "locais", "agenda", "pacientes"] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (clinicaData?.id) {
      fetchMedicos();
    }
  }, [clinicaData?.id]);

  useEffect(() => {
    if (medicos.length > 0) {
      fetchUsuarios();
    }
  }, [medicos]);

  async function fetchMedicos() {
    const { data: vinculos } = await supabase
      .from("clinicas_medicos")
      .select("medico_id")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    if (!vinculos || vinculos.length === 0) {
      setMedicos([]);
      setLoading(false);
      return;
    }

    const medicoIds = vinculos.map((v) => v.medico_id);

    const { data } = await supabase
      .from("medicos")
      .select("id, nome")
      .in("id", medicoIds)
      .eq("ativo", true);

    setMedicos(data || []);
  }

  async function fetchUsuarios() {
    // Fetch users linked to this clinic (via clinica_id) or linked to any of the clinic's doctors
    const medicoIds = medicos.map((m) => m.id);

    // Build query - fetch by clinica_id OR by medico_id in clinic's doctors
    let query = supabase
      .from("usuarios_clinica")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (clinicaData?.id) {
      // Prefer clinica_id filter, but also get legacy users by medico_id
      query = query.or(`clinica_id.eq.${clinicaData.id}${medicoIds.length > 0 ? `,medico_id.in.(${medicoIds.join(',')})` : ''}`);
    } else if (medicoIds.length > 0) {
      query = query.in("medico_id", medicoIds);
    } else {
      setUsuarios([]);
      setLoading(false);
      return;
    }

    const { data, error } = await query;

    if (!error) {
      // Map medico names to usuarios
      const usuariosWithMedico = (data || []).map((u) => ({
        ...u,
        clinica_id: u.clinica_id || null,
        todos_medicos: u.todos_medicos || false,
        medico: medicos.find((m) => m.id === u.medico_id),
      })) as UsuarioClinica[];
      setUsuarios(usuariosWithMedico);
    }
    setLoading(false);
  }

  function resetForm() {
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      papel: "secretaria",
      ativo: true,
      senha: "",
      medicoId: medicos[0]?.id || "",
      todosMedicos: false,
      medicosIds: [],
      permissoes: ["dashboard", "consultas", "locais", "agenda", "pacientes"],
    });
    setEditingUser(null);
    setShowPassword(false);
  }

  function openEditDialog(usuario: UsuarioClinica) {
    setEditingUser(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email || "",
      telefone: usuario.telefone || "",
      papel: usuario.papel,
      ativo: usuario.ativo,
      senha: "",
      medicoId: usuario.medico_id,
      todosMedicos: usuario.todos_medicos || false,
      medicosIds: usuario.medicos_ids || [],
      permissoes: usuario.permissoes || ["dashboard", "consultas", "locais", "agenda", "pacientes"],
    });
    setDialogOpen(true);
  }

  function togglePermissao(permissao: string) {
    setFormData((prev) => ({
      ...prev,
      permissoes: prev.permissoes.includes(permissao)
        ? prev.permissoes.filter((p) => p !== permissao)
        : [...prev.permissoes, permissao],
    }));
  }

  function toggleMedicoSelection(medicoId: string) {
    setFormData((prev) => ({
      ...prev,
      medicosIds: prev.medicosIds.includes(medicoId)
        ? prev.medicosIds.filter((id) => id !== medicoId)
        : [...prev.medicosIds, medicoId],
    }));
  }

  async function handleSubmit() {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!formData.email?.trim()) {
      toast.error("E-mail é obrigatório para login");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("E-mail inválido");
      return;
    }

    if (!formData.todosMedicos && formData.medicosIds.length === 0) {
      toast.error("Selecione pelo menos um médico ou marque 'Todos os médicos'");
      return;
    }

    if (!editingUser && !formData.senha.trim()) {
      toast.error("Senha é obrigatória para novos usuários");
      return;
    }

    if (!editingUser && formData.senha.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    // Check for email uniqueness
    const { data: existingUser, error: checkError } = await supabase
      .from("usuarios_clinica")
      .select("id, email")
      .eq("email", formData.email.trim().toLowerCase())
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      toast.error("Erro ao verificar e-mail");
      return;
    }

    if (existingUser && (!editingUser || existingUser.id !== editingUser.id)) {
      toast.error("Este e-mail já está em uso por outro usuário");
      return;
    }

    // Use first medico as default if todos_medicos is true, otherwise use first selected
    const medicoIdToUse = formData.todosMedicos 
      ? medicos[0]?.id 
      : formData.medicosIds[0] || medicos[0]?.id;
    
    const medicosIdsToSave = formData.todosMedicos ? null : formData.medicosIds;

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (formData.senha.trim()) {
      const hashResult = await hashPassword(formData.senha);
      if (hashResult.error || !hashResult.hash) {
        toast.error(hashResult.error || "Erro ao processar senha");
        return;
      }
      hashedPassword = hashResult.hash;
    }

    if (editingUser) {
      const updateData: any = {
        nome: formData.nome.trim(),
        email: formData.email?.trim().toLowerCase() || null,
        telefone: formData.telefone || null,
        papel: formData.papel,
        ativo: formData.ativo,
        permissoes: formData.permissoes,
        medico_id: medicoIdToUse,
        clinica_id: clinicaData.id,
        todos_medicos: formData.todosMedicos,
        medicos_ids: medicosIdsToSave,
      };

      if (hashedPassword) {
        updateData.senha_hash = hashedPassword;
      }

      const { error } = await supabase
        .from("usuarios_clinica")
        .update(updateData)
        .eq("id", editingUser.id);

      if (error) {
        toast.error("Erro ao atualizar usuário");
        return;
      }
      toast.success("Usuário atualizado!");
    } else {
      const { error } = await supabase.from("usuarios_clinica").insert({
        medico_id: medicoIdToUse,
        clinica_id: clinicaData.id,
        todos_medicos: formData.todosMedicos,
        medicos_ids: medicosIdsToSave,
        nome: formData.nome.trim(),
        email: formData.email?.trim().toLowerCase() || null,
        telefone: formData.telefone || null,
        papel: formData.papel,
        ativo: formData.ativo,
        senha_hash: hashedPassword,
        permissoes: formData.permissoes,
      });

      if (error) {
        toast.error("Erro ao adicionar usuário");
        return;
      }
      toast.success("Usuário adicionado com acesso ao sistema!");
    }

    setDialogOpen(false);
    resetForm();
    fetchUsuarios();
  }

  function openDeleteDialog(id: string) {
    setUserToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from("usuarios_clinica")
        .delete()
        .eq("id", userToDelete);

      if (error) {
        toast.error(`Erro ao excluir usuário: ${error.message}`);
        return;
      }

      toast.success("Usuário excluído");
      fetchUsuarios();
    } catch (err) {
      toast.error("Erro inesperado ao excluir usuário");
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  }

  function getPapelLabel(papel: string) {
    return papelOptions.find((p) => p.value === papel)?.label || papel;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usuários da Clínica</h2>
          <p className="text-muted-foreground">Gerencie sua equipe (secretárias, recepção, etc.)</p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={medicos.length === 0}>
              <Plus className="w-4 h-4" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingUser ? "Editar Usuário" : "Adicionar Usuário"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Será usado para login no sistema
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="todosMedicos"
                    checked={formData.todosMedicos}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      todosMedicos: !!checked, 
                      medicosIds: checked ? [] : formData.medicosIds 
                    })}
                  />
                  <label
                    htmlFor="todosMedicos"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Acesso a todos os médicos da clínica
                  </label>
                </div>
                
                {!formData.todosMedicos && (
                  <div className="space-y-2">
                    <Label>Médicos com Acesso *</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {medicos.map((medico) => (
                        <div key={medico.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={`medico-${medico.id}`}
                            checked={formData.medicosIds.includes(medico.id)}
                            onCheckedChange={() => toggleMedicoSelection(medico.id)}
                          />
                          <label
                            htmlFor={`medico-${medico.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            Dr(a). {medico.nome}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione os médicos que este usuário poderá acessar
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="papel">Papel</Label>
                <Select
                  value={formData.papel}
                  onValueChange={(value) => setFormData({ ...formData, papel: value })}
                >
                  <SelectTrigger id="papel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {papelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  {editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder={editingUser ? "••••••••" : "Criar senha"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O usuário usará esta senha para acessar o sistema
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Permissões de Acesso
                </Label>
                <div className="grid grid-cols-2 gap-3 pl-1">
                  {permissaoOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-3">
                      <Checkbox
                        id={`perm-${option.value}`}
                        checked={formData.permissoes.includes(option.value)}
                        onCheckedChange={() => togglePermissao(option.value)}
                      />
                      <label
                        htmlFor={`perm-${option.value}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione quais áreas o usuário poderá acessar
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="ativo" className="cursor-pointer">
                  Ativo
                </Label>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full mt-2">
                {editingUser ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {medicos.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhum médico vinculado à clínica</p>
              <p className="text-sm">Vincule médicos antes de cadastrar usuários</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Equipe ({usuarios.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usuarios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário cadastrado</p>
                <p className="text-sm">Adicione sua equipe para que possam agendar consultas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usuarios.map((usuario) => (
                  <div
                    key={usuario.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-4 ${
                      usuario.ativo
                        ? "bg-card border-border"
                        : "bg-muted/50 border-border opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{usuario.nome}</p>
                          <Badge variant={usuario.ativo ? "default" : "secondary"}>
                            {getPapelLabel(usuario.papel)}
                          </Badge>
                          {usuario.todos_medicos && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              Todos os Médicos
                            </Badge>
                          )}
                          {!usuario.ativo && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                          {!usuario.todos_medicos && usuario.medicos_ids && usuario.medicos_ids.length > 0 ? (
                            <span className="text-primary font-medium">
                              {usuario.medicos_ids.length} médico(s): {
                                usuario.medicos_ids
                                  .map(id => medicos.find(m => m.id === id)?.nome)
                                  .filter(Boolean)
                                  .map(nome => `Dr(a). ${nome}`)
                                  .join(", ")
                              }
                            </span>
                          ) : !usuario.todos_medicos && usuario.medico ? (
                            <span className="text-primary font-medium">
                              Dr(a). {usuario.medico.nome}
                            </span>
                          ) : null}
                          {usuario.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {usuario.telefone}
                            </span>
                          )}
                          {usuario.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {usuario.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(usuario)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog(usuario.id)}
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
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
