import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CreditCard, 
  MessageSquare, 
  Save, 
  Loader2, 
  Copy, 
  CheckCircle,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConfigAsaas {
  id?: string;
  ambiente: string;
  api_key: string;
  base_url: string;
  webhook_url: string;
  ativo: boolean;
}

interface ConfigWhatsApp {
  id?: string;
  api_base_url: string;
  api_token: string;
  webhook_medico_url: string;
  webhook_paciente_url: string;
  ativo: boolean;
}

const WEBHOOK_URL = "https://dwqceailivjjacvqzfnh.supabase.co/functions/v1/asaas-webhook";

export default function AdminIntegracoes() {
  const [loadingAsaas, setLoadingAsaas] = useState(true);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(true);
  const [savingAsaas, setSavingAsaas] = useState(false);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [copied, setCopied] = useState(false);

  const [configAsaas, setConfigAsaas] = useState<ConfigAsaas>({
    ambiente: "sandbox",
    api_key: "",
    base_url: "https://sandbox.asaas.com/api/v3",
    webhook_url: WEBHOOK_URL,
    ativo: true,
  });

  const [configWhatsApp, setConfigWhatsApp] = useState<ConfigWhatsApp>({
    api_base_url: "",
    api_token: "",
    webhook_medico_url: "",
    webhook_paciente_url: "",
    ativo: false,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    // Fetch Asaas config
    const { data: asaasData } = await supabase
      .from("config_asaas")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (asaasData) {
      setConfigAsaas({
        id: asaasData.id,
        ambiente: asaasData.ambiente,
        api_key: asaasData.api_key,
        base_url: asaasData.base_url,
        webhook_url: asaasData.webhook_url || WEBHOOK_URL,
        ativo: asaasData.ativo ?? true,
      });
    }
    setLoadingAsaas(false);

    // Fetch WhatsApp config
    const { data: whatsappData } = await supabase
      .from("config_whatsapp")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (whatsappData) {
      setConfigWhatsApp({
        id: whatsappData.id,
        api_base_url: whatsappData.api_base_url || "",
        api_token: whatsappData.api_token || "",
        webhook_medico_url: whatsappData.webhook_medico_url || "",
        webhook_paciente_url: whatsappData.webhook_paciente_url || "",
        ativo: whatsappData.ativo ?? false,
      });
    }
    setLoadingWhatsApp(false);
  }

  function handleAmbienteChange(ambiente: string) {
    const baseUrl = ambiente === "sandbox" 
      ? "https://sandbox.asaas.com/api/v3" 
      : "https://api.asaas.com/api/v3";
    
    setConfigAsaas({
      ...configAsaas,
      ambiente,
      base_url: baseUrl,
    });
  }

  async function handleSaveAsaas() {
    if (!configAsaas.api_key) {
      toast.error("Informe a API Key do Asaas");
      return;
    }

    setSavingAsaas(true);

    try {
      if (configAsaas.id) {
        // Update existing
        const { error } = await supabase
          .from("config_asaas")
          .update({
            ambiente: configAsaas.ambiente,
            api_key: configAsaas.api_key,
            base_url: configAsaas.base_url,
            webhook_url: configAsaas.webhook_url,
            ativo: configAsaas.ativo,
          })
          .eq("id", configAsaas.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("config_asaas")
          .insert({
            ambiente: configAsaas.ambiente,
            api_key: configAsaas.api_key,
            base_url: configAsaas.base_url,
            webhook_url: configAsaas.webhook_url,
            ativo: configAsaas.ativo,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigAsaas({ ...configAsaas, id: data.id });
      }

      toast.success("Configuração do Asaas salva com sucesso!");
    } catch (error) {
      console.error("Error saving Asaas config:", error);
      toast.error("Erro ao salvar configuração do Asaas");
    } finally {
      setSavingAsaas(false);
    }
  }

  async function handleSaveWhatsApp() {
    setSavingWhatsApp(true);

    try {
      if (configWhatsApp.id) {
        // Update existing
        const { error } = await supabase
          .from("config_whatsapp")
          .update({
            api_base_url: configWhatsApp.api_base_url,
            api_token: configWhatsApp.api_token,
            webhook_medico_url: configWhatsApp.webhook_medico_url,
            webhook_paciente_url: configWhatsApp.webhook_paciente_url,
            ativo: configWhatsApp.ativo,
          })
          .eq("id", configWhatsApp.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("config_whatsapp")
          .insert({
            api_base_url: configWhatsApp.api_base_url,
            api_token: configWhatsApp.api_token,
            webhook_medico_url: configWhatsApp.webhook_medico_url,
            webhook_paciente_url: configWhatsApp.webhook_paciente_url,
            ativo: configWhatsApp.ativo,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigWhatsApp({ ...configWhatsApp, id: data.id });
      }

      toast.success("Configuração do WhatsApp salva com sucesso!");
    } catch (error) {
      console.error("Error saving WhatsApp config:", error);
      toast.error("Erro ao salvar configuração do WhatsApp");
    } finally {
      setSavingWhatsApp(false);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Integrações</h2>
        <p className="text-muted-foreground">
          Configure as integrações do sistema com serviços externos
        </p>
      </div>

      {/* Asaas Integration Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração com Asaas</CardTitle>
                <CardDescription>
                  Configure a integração para criar cobranças e receber notificações de pagamento
                </CardDescription>
              </div>
            </div>
            <Badge variant={configAsaas.id ? "default" : "secondary"}>
              {configAsaas.id ? "Configurado" : "Não configurado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingAsaas ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Ambiente *</Label>
                  <Select
                    value={configAsaas.ambiente}
                    onValueChange={handleAmbienteChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use Sandbox para testes antes de ir para produção
                  </p>
                </div>

                <div>
                  <Label>API Key *</Label>
                  <Input
                    type="password"
                    value={configAsaas.api_key}
                    onChange={(e) => setConfigAsaas({ ...configAsaas, api_key: e.target.value })}
                    placeholder="$aact_..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Encontre em: Asaas → Minha Conta → Integrações → API
                  </p>
                </div>
              </div>

              <div>
                <Label>Base URL</Label>
                <Input
                  value={configAsaas.base_url}
                  onChange={(e) => setConfigAsaas({ ...configAsaas, base_url: e.target.value })}
                  placeholder="https://api.asaas.com/api/v3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preenchida automaticamente conforme o ambiente selecionado
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <Label className="font-medium">URL do Webhook (cadastre no Asaas)</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={WEBHOOK_URL}
                    readOnly
                    className="bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyWebhookUrl}
                    className="gap-2"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cadastre esta URL no painel do Asaas: Minha Conta → Integrações → Webhooks → Adicionar
                </p>
                <a 
                  href="https://www.asaas.com/webhooks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Abrir configuração de Webhooks no Asaas <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={configAsaas.ativo}
                    onCheckedChange={(checked) => setConfigAsaas({ ...configAsaas, ativo: checked })}
                  />
                  <Label>Integração ativa</Label>
                </div>

                <Button onClick={handleSaveAsaas} disabled={savingAsaas} className="gap-2">
                  {savingAsaas ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Configuração
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Integration Card */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração com WhatsApp</CardTitle>
                <CardDescription>
                  Configure os dados do seu sistema de disparo de WhatsApp para notificações
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Em breve</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingWhatsApp ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-500" />
            </div>
          ) : (
            <>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Atenção:</strong> Configure aqui os dados do seu sistema de disparo de WhatsApp. 
                  As automações serão conectadas depois que a integração com pagamentos estiver 100% estável.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>API Base URL</Label>
                  <Input
                    value={configWhatsApp.api_base_url}
                    onChange={(e) => setConfigWhatsApp({ ...configWhatsApp, api_base_url: e.target.value })}
                    placeholder="https://api.seuwhatsapp.com"
                  />
                </div>

                <div>
                  <Label>API Token</Label>
                  <Input
                    type="password"
                    value={configWhatsApp.api_token}
                    onChange={(e) => setConfigWhatsApp({ ...configWhatsApp, api_token: e.target.value })}
                    placeholder="Seu token de autenticação"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Webhook para Médico</Label>
                  <Input
                    value={configWhatsApp.webhook_medico_url}
                    onChange={(e) => setConfigWhatsApp({ ...configWhatsApp, webhook_medico_url: e.target.value })}
                    placeholder="URL do webhook para notificar médicos"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL que receberá eventos de consultas para notificar o médico
                  </p>
                </div>

                <div>
                  <Label>Webhook para Paciente</Label>
                  <Input
                    value={configWhatsApp.webhook_paciente_url}
                    onChange={(e) => setConfigWhatsApp({ ...configWhatsApp, webhook_paciente_url: e.target.value })}
                    placeholder="URL do webhook para notificar pacientes"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL que receberá eventos de consultas para notificar o paciente
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={configWhatsApp.ativo}
                    onCheckedChange={(checked) => setConfigWhatsApp({ ...configWhatsApp, ativo: checked })}
                  />
                  <Label>Integração ativa</Label>
                </div>

                <Button onClick={handleSaveWhatsApp} disabled={savingWhatsApp} variant="outline" className="gap-2">
                  {savingWhatsApp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Configuração
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
