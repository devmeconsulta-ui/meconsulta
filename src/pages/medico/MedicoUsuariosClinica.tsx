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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, Phone, Mail, Briefcase, Trash2, Pencil, Eye, EyeOff, Key, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MedicoContext {
  medicoData: any;
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
}

const papelOptions = [
  { value: "secretaria", label: "Secretária" },
  { value: "recepcao", label: "Recepção" },
  { value: "assistente", label: "Assistente" },
];

const permissaoOptions = [
  { value: "dashboard", label: "Dashboard" },
  { value: "consultas", label: "Consultas" },
  { value: "locais", label: "Locais de Atendimento" },
  { value: "agenda", label: "Agenda" },
  { value: "pagina-publica", label: "Minha Página Pública" },
];

export default function MedicoUsuariosClinica() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [usuarios, setUsuarios] = useState<UsuarioClinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioClinica | null>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    papel: "secretaria",
    ativo: true,
    senha: "",
    permissoes: ["dashboard", "consultas", "locais", "agenda", "pagina-publica"] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, [medicoData]);

  async function fetchUsuarios() {
    if (!medicoData?.id) return;

    const { data, error } = await supabase
      .from("usuarios_clinica")
      .select("*")
      .eq("medico_id", medicoData.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setUsuarios(data || []);
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
      permissoes: ["dashboard", "consultas", "locais", "agenda", "pagina-publica"],
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
      permissoes: usuario.permissoes || ["dashboard", "consultas", "locais", "agenda", "pagina-publica"],
    });
    setDialogOpen(true);
  }

  function togglePermissao(permissao: string) {
    setFormData(prev => ({
      ...prev,
      permissoes: prev.permissoes.includes(permissao)
        ? prev.permissoes.filter(p => p !== permissao)
        : [...prev.permissoes, permissao]
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

    // For new users, password is required
    if (!editingUser && !formData.senha.trim()) {
      toast.error("Senha é obrigatória para novos usuários");
      return;
    }

    if (editingUser) {
      const updateData: any = {
        nome: formData.nome,
        email: formData.email || null,
        telefone: formData.telefone || null,
        papel: formData.papel,
        ativo: formData.ativo,
        permissoes: formData.permissoes,
      };

      if (formData.senha.trim()) {
        updateData.senha_hash = formData.senha;
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
        medico_id: medicoData.id,
        nome: formData.nome,
        email: formData.email || null,
        telefone: formData.telefone || null,
        papel: formData.papel,
        ativo: formData.ativo,
        senha_hash: formData.senha,
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

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      const { error } = await supabase
        .from("usuarios_clinica")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao excluir:", error);
        toast.error(`Erro ao excluir usuário: ${error.message}`);
        return;
      }

      toast.success("Usuário excluído");
      fetchUsuarios();
    } catch (err) {
      console.error("Erro inesperado:", err);
      toast.error("Erro inesperado ao excluir usuário");
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

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
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
                <div className="space-y-3 pl-1">
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
                <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
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
                        {!usuario.ativo && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
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
                      onClick={() => handleDelete(usuario.id)}
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
    </div>
  );
}
