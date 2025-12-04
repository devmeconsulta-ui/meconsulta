import { useState } from "react";
import { Settings, Save, Building2, CreditCard, Bell, Shield, Palette, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function AdminConfiguracoes() {
  const [saving, setSaving] = useState(false);
  
  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    nomePlataforma: "MeConsulta",
    emailContato: "contato@meconsulta.app.br",
    telefoneContato: "(61) 99999-9999",
    endereco: "Brasília, DF - Brasil",
    descricao: "Plataforma de agendamento de consultas médicas online.",
  });

  // Financial settings
  const [financialSettings, setFinancialSettings] = useState({
    valorConsultaPadrao: 160,
    percentualRepassePadrao: 75,
    diasParaRepasse: 7,
    taxaPlataforma: 25,
    pixChavePadrao: "",
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNovaConsulta: true,
    emailPagamentoConfirmado: true,
    emailCancelamento: true,
    emailLembrete24h: true,
    smsLembrete: false,
    whatsappNotificacoes: true,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    sessaoExpira: "24",
    tentativasLogin: 5,
    verificacaoEmail: true,
    autenticacaoDoisFatores: false,
    logAcessos: true,
  });

  const handleSave = (section: string) => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      toast.success(`Configurações de ${section} salvas com sucesso!`);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-7 w-7" />
          Configurações
        </h1>
        <p className="text-muted-foreground">Configure as preferências e parâmetros do sistema</p>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
          <TabsTrigger
            value="geral"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 border"
          >
            <Building2 className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger
            value="financeiro"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 border"
          >
            <CreditCard className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger
            value="notificacoes"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 border"
          >
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger
            value="seguranca"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 border"
          >
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
              <CardDescription>
                Configure as informações básicas da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nomePlataforma">Nome da Plataforma</Label>
                  <Input
                    id="nomePlataforma"
                    value={generalSettings.nomePlataforma}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, nomePlataforma: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailContato">Email de Contato</Label>
                  <Input
                    id="emailContato"
                    type="email"
                    value={generalSettings.emailContato}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, emailContato: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefoneContato">Telefone de Contato</Label>
                  <Input
                    id="telefoneContato"
                    value={generalSettings.telefoneContato}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, telefoneContato: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={generalSettings.endereco}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, endereco: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição da Plataforma</Label>
                <Textarea
                  id="descricao"
                  value={generalSettings.descricao}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, descricao: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSave("geral")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings */}
        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Financeiras</CardTitle>
              <CardDescription>
                Defina os valores padrão e regras financeiras da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="valorConsultaPadrao">Valor Padrão da Consulta (R$)</Label>
                  <Input
                    id="valorConsultaPadrao"
                    type="number"
                    min="0"
                    value={financialSettings.valorConsultaPadrao}
                    onChange={(e) =>
                      setFinancialSettings({
                        ...financialSettings,
                        valorConsultaPadrao: parseFloat(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor sugerido para novos médicos cadastrados
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentualRepassePadrao">Percentual de Repasse Padrão (%)</Label>
                  <Input
                    id="percentualRepassePadrao"
                    type="number"
                    min="0"
                    max="100"
                    value={financialSettings.percentualRepassePadrao}
                    onChange={(e) =>
                      setFinancialSettings({
                        ...financialSettings,
                        percentualRepassePadrao: parseFloat(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentual do valor da consulta repassado ao médico
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxaPlataforma">Taxa da Plataforma (%)</Label>
                  <Input
                    id="taxaPlataforma"
                    type="number"
                    min="0"
                    max="100"
                    value={financialSettings.taxaPlataforma}
                    onChange={(e) =>
                      setFinancialSettings({
                        ...financialSettings,
                        taxaPlataforma: parseFloat(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentual retido pela plataforma
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diasParaRepasse">Dias para Repasse</Label>
                  <Select
                    value={financialSettings.diasParaRepasse.toString()}
                    onValueChange={(value) =>
                      setFinancialSettings({
                        ...financialSettings,
                        diasParaRepasse: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 dia</SelectItem>
                      <SelectItem value="3">3 dias</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Prazo para repasse após confirmação do pagamento
                  </p>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Exemplo de Cálculo</h4>
                <p className="text-sm text-muted-foreground">
                  Consulta de R$ {financialSettings.valorConsultaPadrao.toFixed(2)}:
                </p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>
                    • Médico recebe:{" "}
                    <span className="font-medium text-green-600">
                      R${" "}
                      {(
                        (financialSettings.valorConsultaPadrao *
                          financialSettings.percentualRepassePadrao) /
                        100
                      ).toFixed(2)}
                    </span>{" "}
                    ({financialSettings.percentualRepassePadrao}%)
                  </li>
                  <li>
                    • Plataforma retém:{" "}
                    <span className="font-medium text-primary">
                      R${" "}
                      {(
                        (financialSettings.valorConsultaPadrao * financialSettings.taxaPlataforma) /
                        100
                      ).toFixed(2)}
                    </span>{" "}
                    ({financialSettings.taxaPlataforma}%)
                  </li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("financeiro")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
              <CardDescription>
                Configure como e quando as notificações são enviadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Notificações por Email</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Nova Consulta Agendada</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar email quando uma nova consulta for agendada
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNovaConsulta}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailNovaConsulta: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pagamento Confirmado</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar email quando o pagamento for confirmado
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailPagamentoConfirmado}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailPagamentoConfirmado: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Cancelamento de Consulta</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar email quando uma consulta for cancelada
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailCancelamento}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailCancelamento: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Lembrete 24h antes</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar lembrete 24 horas antes da consulta
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailLembrete24h}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailLembrete24h: checked,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <h4 className="font-medium">Outros Canais</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Lembrete</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar SMS de lembrete (custo adicional)
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.smsLembrete}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          smsLembrete: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>WhatsApp Notificações</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificações via WhatsApp
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.whatsappNotificacoes}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          whatsappNotificacoes: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("notificações")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Configure as políticas de segurança e acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Expiração da Sessão</Label>
                  <Select
                    value={securitySettings.sessaoExpira}
                    onValueChange={(value) =>
                      setSecuritySettings({ ...securitySettings, sessaoExpira: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="8">8 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="168">7 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Tempo até a sessão expirar automaticamente
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tentativasLogin">Tentativas de Login</Label>
                  <Input
                    id="tentativasLogin"
                    type="number"
                    min="1"
                    max="10"
                    value={securitySettings.tentativasLogin}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        tentativasLogin: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo de tentativas antes de bloquear a conta
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Verificação de Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Exigir verificação de email no cadastro
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.verificacaoEmail}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        verificacaoEmail: checked,
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar 2FA para administradores
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.autenticacaoDoisFatores}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        autenticacaoDoisFatores: checked,
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Log de Acessos</Label>
                    <p className="text-sm text-muted-foreground">
                      Registrar todos os acessos ao sistema
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.logAcessos}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        logAcessos: checked,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("segurança")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
