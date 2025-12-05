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

interface ConfigWhatsApp {
  id?: string;
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
  const [testingMedico, setTestingMedico] = useState(false);
  const [testingPaciente, setTestingPaciente] = useState(false);
  const [testingAsaas, setTestingAsaas] = useState(false);
  const [testingApiAsaas, setTestingApiAsaas] = useState(false);

  const [configAsaas, setConfigAsaas] = useState<ConfigAsaas>({
    ambiente: "sandbox",
    api_key: "",
    base_url: "https://sandbox.asaas.com/api/v3",
    webhook_url: WEBHOOK_URL,
    ativo: true,
  });

  const [configWhatsApp, setConfigWhatsApp] = useState<ConfigWhatsApp>({
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

  async function handleTestAsaasApi() {
    if (!configAsaas.api_key || !configAsaas.base_url) {
      toast.error("Configure a API Key e Base URL antes de testar");
      return;
    }

    setTestingApiAsaas(true);

    try {
      console.log("Testando conexão com API Asaas:", configAsaas.base_url);

      const response = await fetch(`${configAsaas.base_url}/customers?limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': configAsaas.api_key,
        },
      });

      const contentType = response.headers.get('content-type');
      
      if (!contentType?.includes('application/json')) {
        const textResponse = await response.text();
        console.error("Resposta não-JSON da API:", textResponse.substring(0, 500));
        toast.error(`Erro: A API retornou uma resposta inesperada. Verifique a API Key e URL.`);
        return;
      }

      const data = await response.json();
      console.log("Resposta da API:", data);

      if (response.ok) {
        toast.success(`✅ API Asaas conectada com sucesso! Ambiente: ${configAsaas.ambiente}`);
      } else if (response.status === 401) {
        toast.error("❌ API Key inválida ou expirada");
      } else {
        toast.error(`Erro ao conectar: ${data.errors?.[0]?.description || response.status}`);
      }
    } catch (error) {
      console.error("Erro ao testar API Asaas:", error);
      toast.error("Erro ao conectar com a API do Asaas. Verifique a configuração.");
    } finally {
      setTestingApiAsaas(false);
    }
  }

  async function handleTestAsaasWebhook() {
    setTestingAsaas(true);

    // Gera um UUID válido para teste (não vai encontrar consulta, mas não vai dar erro de sintaxe)
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
      console.log("Testando webhook Asaas:", WEBHOOK_URL);
      console.log("Dados:", JSON.stringify(dadosTeste, null, 2));

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosTeste),
      });

      const responseData = await response.json();
      console.log("Resposta:", responseData);

      if (response.ok) {
        toast.success("Teste do webhook Asaas enviado com sucesso! Verifique os logs.");
      } else {
        toast.error(`Erro ao testar webhook: ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao testar webhook Asaas:", error);
      toast.error("Erro ao conectar com o webhook Asaas");
    } finally {
      setTestingAsaas(false);
    }
  }

  async function handleTestWebhook(tipo: 'medico' | 'paciente') {
    const url = tipo === 'medico' ? configWhatsApp.webhook_medico_url : configWhatsApp.webhook_paciente_url;
    
    if (!url) {
      toast.error(`Informe a URL do webhook para ${tipo === 'medico' ? 'médico' : 'paciente'}`);
      return;
    }

    if (tipo === 'medico') {
      setTestingMedico(true);
    } else {
      setTestingPaciente(true);
    }

    // Dados de exemplo para teste
    const dadosTeste = tipo === 'medico' 
      ? {
          evento: "nova_consulta",
          consulta_id: "teste-123-abc",
          data_hora: new Date().toISOString(),
          medico: {
            nome: "Dr. João Silva",
            especialidade: "Cardiologia",
            telefone_whatsapp: "(11) 99999-8888"
          },
          paciente: {
            nome: "Maria Santos",
            telefone: "(11) 98888-7777"
          },
          local: {
            nome: "Clínica Centro",
            endereco: "Rua das Flores, 123 - Centro",
            cidade: "São Paulo",
            estado: "SP"
          },
          valor_consulta: 250.00,
          tipo_servico: "Consulta de Rotina",
          motivo_consulta: "Check-up cardíaco",
          mensagem_sugerida: "Parabéns Dr. João Silva! Você tem uma nova consulta agendada via MeConsulta. Paciente: Maria Santos. Data: " + new Date().toLocaleDateString('pt-BR') + ". Local: Clínica Centro."
        }
      : {
          evento: "consulta_confirmada",
          consulta_id: "teste-123-abc",
          data_hora: new Date().toISOString(),
          paciente: {
            nome: "Maria Santos",
            telefone: "(11) 98888-7777"
          },
          medico: {
            nome: "Dr. João Silva",
            especialidade: "Cardiologia"
          },
          local: {
            nome: "Clínica Centro",
            endereco: "Rua das Flores, 123 - Centro",
            cidade: "São Paulo",
            estado: "SP"
          },
          mensagem_sugerida: `Parabéns Maria Santos! 🎉

Sua consulta está marcada com Dr. João Silva (Cardiologia) na data ${new Date().toLocaleDateString('pt-BR')}.

📍 Local: Clínica Centro - Rua das Flores, 123 - Centro, São Paulo/SP

⏰ Lembre-se de chegar 15 minutos antes do horário agendado.

O MeConsulta te proporciona um atendimento de ponta e sem complicação. Aguardamos você na consulta!`
        };

    try {
      console.log(`Enviando teste para webhook ${tipo}:`, url);
      console.log("Dados:", JSON.stringify(dadosTeste, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosTeste),
      });

      if (response.ok) {
        toast.success(`Teste enviado com sucesso para webhook do ${tipo === 'medico' ? 'médico' : 'paciente'}!`);
      } else {
        const errorText = await response.text();
        console.error("Erro na resposta:", response.status, errorText);
        toast.error(`Erro ao enviar teste: ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao testar webhook:", error);
      toast.error(`Erro ao conectar com o webhook. Verifique a URL e se permite CORS.`);
    } finally {
      if (tipo === 'medico') {
        setTestingMedico(false);
      } else {
        setTestingPaciente(false);
      }
    }
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
                    onClick={handleTestAsaasWebhook}
                    disabled={testingAsaas}
                    className="gap-2"
                  >
                    {testingAsaas ? (
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
                    checked={configAsaas.ativo}
                    onCheckedChange={(checked) => setConfigAsaas({ ...configAsaas, ativo: checked })}
                  />
                  <Label>Integração ativa</Label>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleTestAsaasApi} 
                    disabled={testingApiAsaas || !configAsaas.api_key} 
                    className="gap-2"
                  >
                    {testingApiAsaas ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Testar Conexão API
                  </Button>
                  <Button onClick={handleSaveAsaas} disabled={savingAsaas} className="gap-2">
                    {savingAsaas ? (
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

      {/* WhatsApp Integration Card */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração com WhatsApp (Notificações)</CardTitle>
                <CardDescription>
                  Informe aqui as URLs de webhook fornecidas pelo seu sistema de disparo de WhatsApp
                </CardDescription>
              </div>
            </div>
            <Badge variant={configWhatsApp.id ? "default" : "secondary"}>
              {configWhatsApp.id ? "Configurado" : "Não configurado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingWhatsApp ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-500" />
            </div>
          ) : (
            <>
              <div className="p-4 bg-muted/50 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  O MeConsulta irá enviar os dados das consultas para essas URLs quando a automação estiver configurada. 
                  As automações serão conectadas depois que a integração com pagamentos estiver 100% estável.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>URL de webhook para médico</Label>
                  <div className="flex gap-2">
                    <Input
                      value={configWhatsApp.webhook_medico_url}
                      onChange={(e) => setConfigWhatsApp({ ...configWhatsApp, webhook_medico_url: e.target.value })}
                      placeholder="https://exemplo.suaapi.com/webhookcapture/capture/xxxxx"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook('medico')}
                      disabled={testingMedico || !configWhatsApp.webhook_medico_url}
                      className="gap-1 whitespace-nowrap"
                    >
                      {testingMedico ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Testar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta é a URL para onde o MeConsulta irá enviar os dados quando uma consulta for criada/alterada para o médico 
                    (por exemplo: "Parabéns, você tem uma nova consulta via MeConsulta...").
                  </p>
                </div>

                <div>
                  <Label>URL de webhook para paciente</Label>
                  <div className="flex gap-2">
                    <Input
                      value={configWhatsApp.webhook_paciente_url}
                      onChange={(e) => setConfigWhatsApp({ ...configWhatsApp, webhook_paciente_url: e.target.value })}
                      placeholder="https://exemplo.suaapi.com/webhookcapture/capture/xxxxx"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook('paciente')}
                      disabled={testingPaciente || !configWhatsApp.webhook_paciente_url}
                      className="gap-1 whitespace-nowrap"
                    >
                      {testingPaciente ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Testar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta é a URL para onde o MeConsulta irá enviar os dados quando a consulta do paciente for confirmada e paga 
                    (mensagens como "Sua consulta foi agendada com sucesso...").
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

                <Button onClick={handleSaveWhatsApp} disabled={savingWhatsApp} variant="outline" className="gap-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
                  {savingWhatsApp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Configuração de WhatsApp
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
