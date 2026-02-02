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
  Save, 
  Loader2, 
  Copy, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Send
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

const WEBHOOK_URL = "https://dwqceailivjjacvqzfnh.supabase.co/functions/v1/asaas-webhook";

export function IntegracoesPagamentos() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingApi, setTestingApi] = useState(false);

  const [config, setConfig] = useState<ConfigAsaas>({
    ambiente: "sandbox",
    api_key: "",
    base_url: "https://sandbox.asaas.com/api/v3",
    webhook_url: WEBHOOK_URL,
    ativo: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    const { data } = await supabase
      .from("config_asaas")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setConfig({
        id: data.id,
        ambiente: data.ambiente,
        api_key: data.api_key,
        base_url: data.base_url,
        webhook_url: data.webhook_url || WEBHOOK_URL,
        ativo: data.ativo ?? true,
      });
    }
    setLoading(false);
  }

  function handleAmbienteChange(ambiente: string) {
    const baseUrl = ambiente === "sandbox" 
      ? "https://sandbox.asaas.com/api/v3" 
      : "https://api.asaas.com/api/v3";
    
    setConfig({
      ...config,
      ambiente,
      base_url: baseUrl,
    });
  }

  async function handleSave() {
    if (!config.api_key) {
      toast.error("Informe a API Key do Asaas");
      return;
    }

    setSaving(true);

    try {
      if (config.id) {
        const { error } = await supabase
          .from("config_asaas")
          .update({
            ambiente: config.ambiente,
            api_key: config.api_key,
            base_url: config.base_url,
            webhook_url: config.webhook_url,
            ativo: config.ativo,
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("config_asaas")
          .insert({
            ambiente: config.ambiente,
            api_key: config.api_key,
            base_url: config.base_url,
            webhook_url: config.webhook_url,
            ativo: config.ativo,
          })
          .select()
          .single();

        if (error) throw error;
        setConfig({ ...config, id: data.id });
      }

      toast.success("Configuração do Asaas salva com sucesso!");
    } catch (error) {
      console.error("Error saving Asaas config:", error);
      toast.error("Erro ao salvar configuração do Asaas");
    } finally {
      setSaving(false);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleTestApi() {
    if (!config.api_key || !config.base_url) {
      toast.error("Configure a API Key e Base URL antes de testar");
      return;
    }

    setTestingApi(true);

    try {
      const response = await fetch(`${config.base_url}/customers?limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': config.api_key,
        },
      });

      const contentType = response.headers.get('content-type');
      
      if (!contentType?.includes('application/json')) {
        toast.error(`Erro: A API retornou uma resposta inesperada. Verifique a API Key e URL.`);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        toast.success(`✅ API Asaas conectada com sucesso! Ambiente: ${config.ambiente}`);
      } else if (response.status === 401) {
        toast.error("❌ API Key inválida ou expirada");
      } else {
        toast.error(`Erro ao conectar: ${data.errors?.[0]?.description || response.status}`);
      }
    } catch (error) {
      console.error("Erro ao testar API Asaas:", error);
      toast.error("Erro ao conectar com a API do Asaas. Verifique a configuração.");
    } finally {
      setTestingApi(false);
    }
  }

  async function handleTestWebhook() {
    setTestingWebhook(true);

    const testUuid = crypto.randomUUID();

    const dadosTeste = {
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: "pay_teste_123456",
        customer: "cus_teste_789",
        value: 250.00,
        netValue: 245.00,
        status: "CONFIRMED",
        billingType: "PIX",
        externalReference: testUuid,
        confirmedDate: new Date().toISOString(),
        paymentDate: new Date().toISOString(),
      }
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosTeste),
      });

      if (response.ok) {
        toast.success("Teste do webhook Asaas enviado com sucesso! Verifique os logs.");
      } else {
        toast.error(`Erro ao testar webhook: ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao testar webhook Asaas:", error);
      toast.error("Erro ao conectar com o webhook Asaas");
    } finally {
      setTestingWebhook(false);
    }
  }

  return (
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
          <Badge variant={config.id ? "default" : "secondary"}>
            {config.id ? "Configurado" : "Não configurado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Ambiente *</Label>
                <Select
                  value={config.ambiente}
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
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
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
                value={config.base_url}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
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
              <div className="flex items-center gap-2">
                <a 
                  href="https://www.asaas.com/webhooks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Abrir configuração de Webhooks no Asaas <ExternalLink className="w-3 h-3" />
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                  className="gap-2"
                >
                  {testingWebhook ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Testar Webhook
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.ativo}
                  onCheckedChange={(checked) => setConfig({ ...config, ativo: checked })}
                />
                <Label>Integração ativa</Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleTestApi} 
                  disabled={testingApi || !config.api_key} 
                  className="gap-2"
                >
                  {testingApi ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Testar Conexão API
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Configuração
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}