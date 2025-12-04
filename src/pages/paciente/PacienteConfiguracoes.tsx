import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings, 
  Bell, 
  Moon, 
  Globe, 
  Shield,
  Trash2,
  LogOut
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PacienteConfiguracoes() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [settings, setSettings] = useState({
    notificacoesEmail: true,
    notificacoesPush: true,
    lembreteConsulta: true,
    marketingEmail: false,
    tema: "light",
    idioma: "pt-BR",
  });

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
                Escolha entre tema claro ou escuro
              </p>
            </div>
            <Select 
              value={settings.tema} 
              onValueChange={(v) => setSettings(prev => ({ ...prev, tema: v }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
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
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Alterar senha</p>
              <p className="text-sm text-muted-foreground">
                Recomendamos alterar sua senha periodicamente
              </p>
            </div>
            <Button variant="outline">Alterar</Button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Baixar meus dados</p>
              <p className="text-sm text-muted-foreground">
                Solicite uma cópia dos seus dados
              </p>
            </div>
            <Button variant="outline">Solicitar</Button>
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
          <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <div>
              <p className="font-medium">Sair da conta</p>
              <p className="text-sm text-muted-foreground">
                Encerre sua sessão atual
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <div>
              <p className="font-medium text-destructive">Excluir conta</p>
              <p className="text-sm text-muted-foreground">
                Exclua permanentemente sua conta e todos os dados
              </p>
            </div>
            <Button variant="destructive">Excluir</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
