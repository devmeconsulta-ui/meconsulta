import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Webhook, 
  Save, 
  Loader2, 
  Copy, 
  CheckCircle,
  Send,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

interface ConfigWhatsApp {
  id?: string;
  webhook_medico_url: string;
  webhook_paciente_url: string;
  ativo: boolean;
}

interface WebhookSaida {
  id: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  headers: Record<string, string>;
}

const EVENTOS_DISPONIVEIS = [
  { id: "nova_consulta", label: "Nova Consulta Criada" },
  { id: "consulta_confirmada", label: "Consulta Confirmada" },
  { id: "consulta_cancelada", label: "Consulta Cancelada" },
  { id: "pagamento_confirmado", label: "Pagamento Confirmado" },
  { id: "pagamento_estornado", label: "Pagamento Estornado" },
  { id: "consulta_reagendada", label: "Consulta Reagendada" },
];

const WEBHOOK_ENTRADA_URL = "https://dwqceailivjjacvqzfnh.supabase.co/functions/v1/external-webhook";

export function IntegracoesWebhooks() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testingMedico, setTestingMedico] = useState(false);
  const [testingPaciente, setTestingPaciente] = useState(false);

  const [configWhatsApp, setConfigWhatsApp] = useState<ConfigWhatsApp>({
    webhook_medico_url: "",
    webhook_paciente_url: "",
    ativo: false,
  });

  const [webhooksSaida, setWebhooksSaida] = useState<WebhookSaida[]>([]);
  const [novoWebhook, setNovoWebhook] = useState<Partial<WebhookSaida>>({
    url: "",
    eventos: [],
    ativo: true,
    headers: {},
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
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
    setLoading(false);
  }

  async function handleSaveWhatsApp() {
    setSaving(true);

    try {
      if (configWhatsApp.id) {
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

      toast.success("Configuração de webhooks salva com sucesso!");
    } catch (error) {
      console.error("Error saving WhatsApp config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(WEBHOOK_ENTRADA_URL);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
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

    const dadosTeste = tipo === 'medico' 
      ? {
          evento: "nova_consulta",
          consulta_id: "teste-123-abc",
          data_hora: new Date().toISOString(),
          medico: { nome: "Dr. João Silva", especialidade: "Cardiologia" },
          paciente: { nome: "Maria Santos", telefone: "(11) 98888-7777" },
        }
      : {
          evento: "consulta_confirmada",
          consulta_id: "teste-123-abc",
          data_hora: new Date().toISOString(),
          paciente: { nome: "Maria Santos", telefone: "(11) 98888-7777" },
          medico: { nome: "Dr. João Silva", especialidade: "Cardiologia" },
        };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosTeste),
      });

      if (response.ok) {
        toast.success(`Teste enviado com sucesso para webhook do ${tipo === 'medico' ? 'médico' : 'paciente'}!`);
      } else {
        toast.error(`Erro ao enviar teste: ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao testar webhook:", error);
      toast.error(`Erro ao conectar com o webhook. Verifique a URL e CORS.`);
    } finally {
      if (tipo === 'medico') {
        setTestingMedico(false);
      } else {
        setTestingPaciente(false);
      }
    }
  }

  function handleEventoChange(eventoId: string, checked: boolean) {
    setNovoWebhook(prev => ({
      ...prev,
      eventos: checked 
        ? [...(prev.eventos || []), eventoId]
        : (prev.eventos || []).filter(e => e !== eventoId)
    }));
  }

  function handleAddWebhookSaida() {
    if (!novoWebhook.url) {
      toast.error("Informe a URL do webhook");
      return;
    }
    if (!novoWebhook.eventos?.length) {
      toast.error("Selecione pelo menos um evento");
      return;
    }

    const webhook: WebhookSaida = {
      id: crypto.randomUUID(),
      url: novoWebhook.url,
      eventos: novoWebhook.eventos || [],
      ativo: true,
      headers: {},
    };

    setWebhooksSaida(prev => [...prev, webhook]);
    setNovoWebhook({ url: "", eventos: [], ativo: true, headers: {} });
    toast.success("Webhook adicionado! Clique em Salvar para persistir.");
  }

  function handleRemoveWebhookSaida(id: string) {
    setWebhooksSaida(prev => prev.filter(w => w.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webhooks de Entrada */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>Webhooks de Entrada</CardTitle>
              <CardDescription>
                Receba dados de aplicações externas no MeConsulta
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <Label className="font-medium">Endpoint para receber webhooks externos</Label>
            <div className="flex gap-2">
              <Input
                value={WEBHOOK_ENTRADA_URL}
                readOnly
                className="bg-background font-mono text-sm"
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
              Configure esta URL em aplicações externas para enviar dados ao MeConsulta.
              Autenticação via header <code className="bg-muted px-1 rounded">Authorization: Bearer SEU_TOKEN</code>
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Eventos suportados:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>criar_consulta - Cria uma nova consulta</li>
              <li>atualizar_paciente - Atualiza dados do paciente</li>
              <li>sincronizar_agenda - Sincroniza agenda externa</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks de Saída */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ArrowUpFromLine className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <CardTitle>Webhooks de Saída</CardTitle>
              <CardDescription>
                Envie dados do MeConsulta para aplicações externas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de webhooks configurados */}
          {webhooksSaida.length > 0 && (
            <div className="space-y-2">
              {webhooksSaida.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="font-mono text-sm">{webhook.url}</p>
                    <div className="flex gap-1">
                      {webhook.eventos.map(e => (
                        <Badge key={e} variant="secondary" className="text-xs">
                          {EVENTOS_DISPONIVEIS.find(ev => ev.id === e)?.label || e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveWebhookSaida(webhook.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar novo webhook */}
          <div className="p-4 border border-dashed rounded-lg space-y-4">
            <Label className="font-medium">Adicionar novo webhook de saída</Label>
            <Input
              value={novoWebhook.url}
              onChange={(e) => setNovoWebhook({ ...novoWebhook, url: e.target.value })}
              placeholder="https://sua-api.com/webhook"
            />
            
            <div className="space-y-2">
              <Label className="text-sm">Eventos para enviar:</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENTOS_DISPONIVEIS.map((evento) => (
                  <label key={evento.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={novoWebhook.eventos?.includes(evento.id)}
                      onCheckedChange={(checked) => handleEventoChange(evento.id, !!checked)}
                    />
                    {evento.label}
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleAddWebhookSaida} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Webhooks WhatsApp (legado) */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Webhook className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle>Webhooks para Notificações WhatsApp</CardTitle>
                <CardDescription>
                  URLs para enviar notificações via seu sistema de WhatsApp
                </CardDescription>
              </div>
            </div>
            <Badge variant={configWhatsApp.id ? "default" : "secondary"}>
              {configWhatsApp.id ? "Configurado" : "Não configurado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>URL de webhook para médico</Label>
              <div className="flex gap-2">
                <Input
                  value={configWhatsApp.webhook_medico_url}
                  onChange={(e) => setConfigWhatsApp({ ...configWhatsApp, webhook_medico_url: e.target.value })}
                  placeholder="https://exemplo.suaapi.com/webhook/medico"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestWebhook('medico')}
                  disabled={testingMedico || !configWhatsApp.webhook_medico_url}
                  className="gap-1 whitespace-nowrap"
                >
                  {testingMedico ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Testar
                </Button>
              </div>
            </div>

            <div>
              <Label>URL de webhook para paciente</Label>
              <div className="flex gap-2">
                <Input
                  value={configWhatsApp.webhook_paciente_url}
                  onChange={(e) => setConfigWhatsApp({ ...configWhatsApp, webhook_paciente_url: e.target.value })}
                  placeholder="https://exemplo.suaapi.com/webhook/paciente"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestWebhook('paciente')}
                  disabled={testingPaciente || !configWhatsApp.webhook_paciente_url}
                  className="gap-1 whitespace-nowrap"
                >
                  {testingPaciente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Testar
                </Button>
              </div>
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

            <Button onClick={handleSaveWhatsApp} disabled={saving} variant="outline" className="gap-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}