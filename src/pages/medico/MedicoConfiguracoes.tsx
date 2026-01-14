import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, User, Bell, Shield, Save, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatSettings } from "@/hooks/useChatSettings";

interface MedicoContext {
  medicoData: any;
}

export default function MedicoConfiguracoes() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const { currentUser } = useAuth();
  const { settings: chatSettings, saveSettings: saveChatSettings } = useChatSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    nome: "",
    especialidade: "",
    crm: "",
    valor_consulta: 0,
  });

  const [notifications, setNotifications] = useState({
    emailNovaConsulta: true,
    emailCancelamento: true,
    emailAvaliacao: true,
    whatsappLembrete: false,
  });

  useEffect(() => {
    if (medicoData) {
      setProfileData({
        nome: medicoData.nome || "",
        especialidade: medicoData.especialidade || "",
        crm: medicoData.crm || "",
        valor_consulta: medicoData.valor_consulta || 0,
      });
      setLoading(false);
    }
  }, [medicoData]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!medicoData?.id) return;

    setSaving(true);
    const { error } = await supabase
      .from("medicos")
      .update({
        nome: profileData.nome,
        especialidade: profileData.especialidade,
        crm: profileData.crm,
        valor_consulta: profileData.valor_consulta,
      })
      .eq("id", medicoData.id);

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar configurações");
      return;
    }

    toast.success("Configurações salvas!");
  }

  function handleSaveNotifications() {
    toast.success("Preferências de notificação salvas!");
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
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
        <p className="text-muted-foreground">Gerencie suas preferências e dados pessoais</p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList>
          <TabsTrigger value="perfil" className="gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2">
            <Shield className="w-4 h-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Dados do Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={profileData.nome}
                      onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input value={currentUser?.email || ""} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>Especialidade</Label>
                    <Input
                      value={profileData.especialidade}
                      onChange={(e) =>
                        setProfileData({ ...profileData, especialidade: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>CRM</Label>
                    <Input
                      value={profileData.crm}
                      onChange={(e) => setProfileData({ ...profileData, crm: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Valor da Consulta (R$)</Label>
                    <Input
                      type="number"
                      value={profileData.valor_consulta}
                      onChange={(e) =>
                        setProfileData({ ...profileData, valor_consulta: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Preferências de Notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">E-mail - Nova Consulta</p>
                    <p className="text-sm text-muted-foreground">
                      Receber e-mail quando uma nova consulta for agendada
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNovaConsulta}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailNovaConsulta: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">E-mail - Cancelamento</p>
                    <p className="text-sm text-muted-foreground">
                      Receber e-mail quando uma consulta for cancelada
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailCancelamento}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailCancelamento: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">E-mail - Nova Avaliação</p>
                    <p className="text-sm text-muted-foreground">
                      Receber e-mail quando um paciente deixar uma avaliação
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailAvaliacao}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailAvaliacao: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">WhatsApp - Lembrete</p>
                    <p className="text-sm text-muted-foreground">
                      Receber lembrete via WhatsApp antes das consultas
                    </p>
                  </div>
                  <Switch
                    checked={notifications.whatsappLembrete}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, whatsappLembrete: checked })
                    }
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    <span className="font-medium">Chat Interno</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Som de Notificação</p>
                      <p className="text-sm text-muted-foreground">
                        Tocar som quando receber uma nova mensagem no chat
                      </p>
                    </div>
                    <Switch
                      checked={chatSettings.soundEnabled}
                      onCheckedChange={(checked) =>
                        saveChatSettings({ soundEnabled: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} className="gap-2">
                  <Save className="w-4 h-4" />
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="seguranca">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Segurança da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Senha Atual</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div>
                <Label>Nova Senha</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div>
                <Label>Confirmar Nova Senha</Label>
                <Input type="password" placeholder="••••••••" />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Alterar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
