import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Key,
  Webhook,
  Send,
  Download,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Bot,
  Settings2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

interface ApiToken {
  id: string;
  nome: string;
  token: string;
  ativo: boolean;
  created_at: string;
  ultimo_uso: string | null;
}

interface WebhookConfig {
  id: string;
  nome: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  headers: Record<string, string>;
  created_at: string;
  ultimo_envio: string | null;
  status_ultimo_envio: "sucesso" | "erro" | null;
}

interface AIConfig {
  id: string;
  fila_id: string;
  fila_nome: string;
  openai_token: string;
  modelo: string;
  prompt_sistema: string;
  ativo: boolean;
}

export default function OmniIntegracoes() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const { currentUser } = useAuth();
  const clinicaId = clinicaData?.id || currentUser?.clinicaId || null;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("tokens");
  const [showToken, setShowToken] = useState<string | null>(null);
  
  // Token form
  const [novoTokenNome, setNovoTokenNome] = useState("");
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  
  // Webhook form
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [novoWebhook, setNovoWebhook] = useState({
    nome: "",
    url: "",
    eventos: [] as string[],
    headers: {} as Record<string, string>
  });
  
  // AI Config form
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [novaAiConfig, setNovaAiConfig] = useState({
    fila_id: "",
    openai_token: "",
    modelo: "gpt-4o-mini",
    prompt_sistema: "Você é um assistente virtual de atendimento ao cliente. Seja cordial, objetivo e ajude o cliente com suas dúvidas."
  });

  // Mock data - em produção virá do banco
  const [tokens] = useState<ApiToken[]>([
    {
      id: "1",
      nome: "Token Principal",
      token: "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      ativo: true,
      created_at: new Date().toISOString(),
      ultimo_uso: new Date().toISOString()
    }
  ]);

  const [webhooksEntrada] = useState<WebhookConfig[]>([
    {
      id: "1",
      nome: "Receber de CRM Externo",
      url: `${window.location.origin}/api/webhook/entrada/${clinicaId}`,
      eventos: ["novo_lead", "atualizar_lead"],
      ativo: true,
      headers: { "X-API-Key": "seu_token_aqui" },
      created_at: new Date().toISOString(),
      ultimo_envio: new Date().toISOString(),
      status_ultimo_envio: "sucesso"
    }
  ]);

  const [webhooksSaida] = useState<WebhookConfig[]>([
    {
      id: "1",
      nome: "Enviar para Zapier",
      url: "https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx/",
      eventos: ["nova_mensagem", "atendimento_finalizado"],
      ativo: true,
      headers: {},
      created_at: new Date().toISOString(),
      ultimo_envio: new Date().toISOString(),
      status_ultimo_envio: "sucesso"
    }
  ]);

  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);

  // Fetch filas for AI config
  const { data: filas = [] } = useQuery({
    queryKey: ["omni_filas", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      const { data, error } = await supabase
        .from("omni_filas")
        .select("id, nome")
        .eq("clinica_id", clinicaId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicaId
  });

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copiado!");
  };

  const handleGerarToken = () => {
    const novoToken = `sk_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    navigator.clipboard.writeText(novoToken);
    toast.success("Novo token gerado e copiado!");
    setTokenDialogOpen(false);
    setNovoTokenNome("");
  };

  const handleSalvarWebhook = () => {
    toast.success("Webhook configurado com sucesso!");
    setWebhookDialogOpen(false);
    setNovoWebhook({ nome: "", url: "", eventos: [], headers: {} });
  };

  const handleSalvarAiConfig = () => {
    const fila = filas.find(f => f.id === novaAiConfig.fila_id);
    if (!fila) {
      toast.error("Selecione uma fila");
      return;
    }
    
    setAiConfigs(prev => [...prev, {
      id: Math.random().toString(),
      fila_id: novaAiConfig.fila_id,
      fila_nome: fila.nome,
      openai_token: novaAiConfig.openai_token,
      modelo: novaAiConfig.modelo,
      prompt_sistema: novaAiConfig.prompt_sistema,
      ativo: true
    }]);
    
    toast.success("Configuração de IA salva com sucesso!");
    setAiDialogOpen(false);
    setNovaAiConfig({
      fila_id: "",
      openai_token: "",
      modelo: "gpt-4o-mini",
      prompt_sistema: "Você é um assistente virtual de atendimento ao cliente. Seja cordial, objetivo e ajude o cliente com suas dúvidas."
    });
  };

  const eventosDisponiveis = [
    { id: "nova_mensagem", label: "Nova mensagem recebida" },
    { id: "atendimento_iniciado", label: "Atendimento iniciado" },
    { id: "atendimento_finalizado", label: "Atendimento finalizado" },
    { id: "atendimento_transferido", label: "Atendimento transferido" },
    { id: "novo_contato", label: "Novo contato criado" },
    { id: "lead_criado", label: "Lead criado no CRM" },
    { id: "lead_movido", label: "Lead movido de etapa" },
    { id: "consulta_confirmada", label: "Consulta confirmada" },
    { id: "consulta_cancelada", label: "Consulta cancelada" },
  ];

  return (
    <OmniLayout clinicaId={clinicaId || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Integrações</h1>
            <p className="text-muted-foreground">
              Configure APIs, webhooks e inteligência artificial
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tokens" className="gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Tokens API</span>
              <span className="sm:hidden">API</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks-entrada" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Webhooks Entrada</span>
              <span className="sm:hidden">Entrada</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks-saida" className="gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Webhooks Saída</span>
              <span className="sm:hidden">Saída</span>
            </TabsTrigger>
            <TabsTrigger value="ia" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Inteligência Artificial</span>
              <span className="sm:hidden">IA</span>
            </TabsTrigger>
          </TabsList>

          {/* Tokens API */}
          <TabsContent value="tokens" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Tokens de API</CardTitle>
                  <CardDescription>
                    Gerencie tokens para acessar a API do sistema
                  </CardDescription>
                </div>
                <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Token
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Token</DialogTitle>
                      <DialogDescription>
                        Crie um novo token para acesso à API
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome do Token</Label>
                        <Input
                          placeholder="Ex: Token para Integração CRM"
                          value={novoTokenNome}
                          onChange={(e) => setNovoTokenNome(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleGerarToken} className="w-full">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Gerar Token
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último Uso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {showToken === token.id 
                                ? token.token 
                                : `${token.token.substring(0, 10)}...`}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowToken(showToken === token.id ? null : token.id)}
                            >
                              {showToken === token.id ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyToken(token.token)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={token.ativo ? "default" : "secondary"}>
                            {token.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {token.ultimo_uso 
                            ? format(new Date(token.ultimo_uso), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "Nunca"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Documentação da API */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Documentação da API</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Utilize o token no header Authorization para autenticar suas requisições.
                  </p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`curl -X GET "${window.location.origin}/api/v1/atendimentos" \\
  -H "Authorization: Bearer seu_token_aqui" \\
  -H "Content-Type: application/json"`}
                  </pre>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <span>/api/v1/atendimentos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <span>/api/v1/contatos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50">POST</Badge>
                      <span>/api/v1/mensagens</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50">POST</Badge>
                      <span>/api/v1/contatos</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Entrada */}
          <TabsContent value="webhooks-entrada" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhooks de Entrada</CardTitle>
                <CardDescription>
                  Configure endpoints para receber dados de sistemas externos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    Seu Endpoint de Webhook
                  </h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-background px-3 py-2 rounded text-sm border">
                      {`${window.location.origin}/api/webhook/entrada/${clinicaId}`}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhook/entrada/${clinicaId}`);
                        toast.success("URL copiada!");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    Use este endpoint em sistemas externos para enviar dados para sua clínica.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Eventos Suportados</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Badge variant="outline" className="bg-green-50">POST</Badge>
                      <span className="text-sm">criar_contato</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Badge variant="outline" className="bg-green-50">POST</Badge>
                      <span className="text-sm">criar_lead</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Badge variant="outline" className="bg-green-50">POST</Badge>
                      <span className="text-sm">enviar_mensagem</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Badge variant="outline" className="bg-amber-50">PUT</Badge>
                      <span className="text-sm">atualizar_contato</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Exemplo de Payload</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "evento": "criar_contato",
  "dados": {
    "nome": "João Silva",
    "telefone": "+5511999999999",
    "email": "joao@email.com"
  }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Saída */}
          <TabsContent value="webhooks-saida" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Webhooks de Saída</CardTitle>
                  <CardDescription>
                    Configure webhooks para enviar eventos para sistemas externos
                  </CardDescription>
                </div>
                <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Webhook
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Configurar Webhook de Saída</DialogTitle>
                      <DialogDescription>
                        Configure para onde enviar eventos do sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          placeholder="Ex: Integração Zapier"
                          value={novoWebhook.nome}
                          onChange={(e) => setNovoWebhook(prev => ({ ...prev, nome: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL do Webhook</Label>
                        <Input
                          placeholder="https://hooks.zapier.com/..."
                          value={novoWebhook.url}
                          onChange={(e) => setNovoWebhook(prev => ({ ...prev, url: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Eventos</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                          {eventosDisponiveis.map((evento) => (
                            <label key={evento.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={novoWebhook.eventos.includes(evento.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNovoWebhook(prev => ({
                                      ...prev,
                                      eventos: [...prev.eventos, evento.id]
                                    }));
                                  } else {
                                    setNovoWebhook(prev => ({
                                      ...prev,
                                      eventos: prev.eventos.filter(ev => ev !== evento.id)
                                    }));
                                  }
                                }}
                                className="rounded"
                              />
                              {evento.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <Button onClick={handleSalvarWebhook} className="w-full">
                        Salvar Webhook
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Eventos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooksSaida.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs truncate max-w-[200px]">
                              {webhook.url}
                            </code>
                            <a href={webhook.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.eventos.slice(0, 2).map((ev) => (
                              <Badge key={ev} variant="outline" className="text-xs">
                                {ev}
                              </Badge>
                            ))}
                            {webhook.eventos.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{webhook.eventos.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {webhook.status_ultimo_envio === "sucesso" ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : webhook.status_ultimo_envio === "erro" ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <Badge variant={webhook.ativo ? "default" : "secondary"}>
                              {webhook.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inteligência Artificial - Apenas tokens LLM */}
          <TabsContent value="ia" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Tokens de LLM
                </CardTitle>
                <CardDescription>
                  Configure o token da sua LLM preferida para usar nos agentes de IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  {/* Provedor */}
                  <div className="space-y-2">
                    <Label>Provedor de IA</Label>
                    <Select defaultValue="openai">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4, GPT-4o, GPT-3.5)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                        <SelectItem value="google">Google (Gemini)</SelectItem>
                        <SelectItem value="groq">Groq (LLaMA, Mixtral)</SelectItem>
                        <SelectItem value="together">Together AI</SelectItem>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Token */}
                  <div className="space-y-2">
                    <Label>Token / API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="sk-... ou sua API key"
                        className="flex-1"
                      />
                      <Button variant="outline" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Obtenha seu token no painel do provedor escolhido
                    </p>
                  </div>

                  {/* Modelo padrão */}
                  <div className="space-y-2">
                    <Label>Modelo Padrão</Label>
                    <Select defaultValue="gpt-4o-mini">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recomendado)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        <SelectItem value="gemini-flash">Gemini Flash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Salvar Configuração
                  </Button>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Sobre os Tokens
                  </h4>
                  <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
                    <li>• O token será usado pelos agentes de IA configurados na seção "IA"</li>
                    <li>• Cada provedor tem seus próprios modelos e preços</li>
                    <li>• O GPT-4o Mini é recomendado por equilibrar custo e qualidade</li>
                    <li>• Acesse a seção "IA" no menu para criar e configurar seus agentes</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </OmniLayout>
  );
}
