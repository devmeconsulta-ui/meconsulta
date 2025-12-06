import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Bell, 
  Moon, 
  Sun,
  Monitor,
  Shield,
  Trash2,
  LogOut,
  Copy,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

export default function PacienteConfiguracoes() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [settings, setSettings] = useState({
    notificacoesEmail: true,
    notificacoesPush: true,
    lembreteConsulta: true,
    marketingEmail: false,
    idioma: "pt-BR",
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const confirmationText = "excluir conta";

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    toast.success("Configuração atualizada");
  };

  const handleLogout = () => {
    logout();
    navigate("/entrar");
  };

  const handleCopyConfirmation = () => {
    navigator.clipboard.writeText(confirmationText);
    toast.success("Texto copiado!");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== confirmationText) {
      toast.error("Digite o texto de confirmação corretamente");
      return;
    }

    if (!currentUser?.id) {
      toast.error("Usuário não encontrado");
      return;
    }

    setIsDeleting(true);

    try {
      // Delete paciente record first (if exists)
      if (currentUser.pacienteId) {
        // Delete related records
        await supabase.from("paciente_favoritos").delete().eq("paciente_id", currentUser.pacienteId);
        await supabase.from("paciente_dependentes").delete().eq("paciente_id", currentUser.pacienteId);
        await supabase.from("historico_medico_paciente").delete().eq("paciente_id", currentUser.pacienteId);
        await supabase.from("meconsulta_pay_solicitacoes").delete().eq("paciente_id", currentUser.pacienteId);
        await supabase.from("avaliacoes_medico").delete().eq("paciente_id", currentUser.pacienteId);
        
        // Delete paciente
        await supabase.from("pacientes").delete().eq("id", currentUser.pacienteId);
      }

      // Delete user record
      const { error } = await supabase.from("usuarios").delete().eq("id", currentUser.id);

      if (error) throw error;

      toast.success("Conta excluída com sucesso");
      logout();
      navigate("/");
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast.error("Erro ao excluir conta. Tente novamente.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmation("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      {/* Notificações */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure como deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Notificações por e-mail</Label>
              <p className="text-sm text-muted-foreground">
                Receba atualizações importantes por e-mail
              </p>
            </div>
            <Switch
              checked={settings.notificacoesEmail}
              onCheckedChange={() => handleToggle("notificacoesEmail")}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Notificações push</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações em tempo real no navegador
              </p>
            </div>
            <Switch
              checked={settings.notificacoesPush}
              onCheckedChange={() => handleToggle("notificacoesPush")}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Lembrete de consulta</Label>
              <p className="text-sm text-muted-foreground">
                Receba lembretes antes das suas consultas
              </p>
            </div>
            <Switch
              checked={settings.lembreteConsulta}
              onCheckedChange={() => handleToggle("lembreteConsulta")}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">E-mails de marketing</Label>
              <p className="text-sm text-muted-foreground">
                Receba novidades e promoções por e-mail
              </p>
            </div>
            <Switch
              checked={settings.marketingEmail}
              onCheckedChange={() => handleToggle("marketingEmail")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize a aparência do aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Tema</Label>
              <p className="text-sm text-muted-foreground">
                Escolha entre tema claro, escuro ou automático
              </p>
            </div>
            <Select 
              value={theme} 
              onValueChange={(value) => {
                setTheme(value);
                toast.success(`Tema alterado para ${value === 'light' ? 'claro' : value === 'dark' ? 'escuro' : 'sistema'}`);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Claro
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Escuro
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Sistema
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Idioma</Label>
              <p className="text-sm text-muted-foreground">
                Selecione o idioma do aplicativo
              </p>
            </div>
            <Select 
              value={settings.idioma} 
              onValueChange={(v) => setSettings(prev => ({ ...prev, idioma: v }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (BR)</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacidade */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacidade e Segurança
          </CardTitle>
          <CardDescription>
            Gerencie a privacidade e segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Alterar senha</p>
              <p className="text-sm text-muted-foreground">
                Recomendamos alterar sua senha periodicamente
              </p>
            </div>
            <Button variant="outline" className="w-full sm:w-auto">Alterar</Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Baixar meus dados</p>
              <p className="text-sm text-muted-foreground">
                Solicite uma cópia dos seus dados
              </p>
            </div>
            <Button variant="outline" className="w-full sm:w-auto">Solicitar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Conta */}
      <Card className="card-shadow border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis relacionadas à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <div>
              <p className="font-medium">Sair da conta</p>
              <p className="text-sm text-muted-foreground">
                Encerre sua sessão atual
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <div>
              <p className="font-medium text-red-400 dark:text-red-300">Excluir conta</p>
              <p className="text-sm text-muted-foreground">
                Exclua permanentemente sua conta e todos os dados
              </p>
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">Excluir</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Excluir conta permanentemente
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4 pt-2">
                    <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 rounded-lg p-4 space-y-2">
                      <p className="font-medium text-destructive dark:text-red-300">
                        Ao excluir sua conta, você perderá:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Todos os seus dados pessoais</li>
                        <li>Histórico de consultas</li>
                        <li>Dependentes cadastrados</li>
                        <li>Histórico médico</li>
                        <li>Avaliações realizadas</li>
                        <li>Solicitações de crédito</li>
                      </ul>
                      <p className="text-sm font-medium text-destructive dark:text-red-300 pt-2">
                        Esta ação é irreversível!
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm">
                        Para confirmar, digite <span className="font-bold text-foreground">"{confirmationText}"</span> abaixo:
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                          {confirmationText}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCopyConfirmation}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>

                      <Input
                        placeholder="Digite aqui para confirmar..."
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                  <AlertDialogCancel 
                    onClick={() => setDeleteConfirmation("")}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation.toLowerCase() !== confirmationText || isDeleting}
                  >
                    {isDeleting ? "Excluindo..." : "Excluir conta"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
