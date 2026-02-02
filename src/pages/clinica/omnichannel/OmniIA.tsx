import { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  Briefcase,
  GraduationCap,
  Target,
  Link2,
  Settings,
  Plus,
  Trash2,
  Image,
  Video,
  FileText,
  Globe,
  Headphones,
  ShoppingCart,
  Users,
  Home,
  Smile,
  ArrowRightLeft,
  MessageSquare,
  Clock,
  Webhook,
  Shield,
  Split,
  StickyNote,
  Search,
  Calendar,
  MessageCircle,
  Sparkles,
  Bot,
  MoreVertical,
  Pencil,
  Upload,
  Copy,
  Check,
  X,
  RefreshCw,
  Play,
  Pause,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

interface AgenteIA {
  id: string;
  nome: string;
  descricao: string;
  modelo: string;
  avatar_url: string | null;
  comunicacao: "formal" | "normal" | "descontraida";
  comportamento: string;
  finalidade: "suporte" | "vendas" | "pessoal";
  produto: string;
  site_url: string;
  descricao_produto: string;
  ativo: boolean;
  // Configurações
  transferir_para_humano: boolean;
  usar_emojis: boolean;
  assinar_nome: boolean;
  restringir_temas: boolean;
  dividir_resposta: boolean;
  permitir_lembretes: boolean;
  busca_treinamento: boolean;
  timezone: string;
  tempo_resposta: number;
  limite_interacoes: number;
  // Inatividade
  tempo_inatividade: number;
  acao_inatividade: string;
  mensagem_inatividade: string;
  // Transferência
  palavras_chave_transferencia: string[];
  fila_transferencia: string;
}

interface Treinamento {
  id: string;
  tipo: "texto" | "website" | "video" | "documento";
  conteudo: string;
  status: "pendente" | "treinado" | "erro";
  created_at: string;
}

interface Intencao {
  id: string;
  nome: string;
  webhook_url: string;
  ativa: boolean;
  descricao: string;
}

interface Integracao {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  ativa: boolean;
  configurada: boolean;
  api_key?: string;
}

export default function OmniIA() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const { currentUser } = useAuth();
  const clinicaId = clinicaData?.id || currentUser?.clinicaId || null;

  const [selectedAgente, setSelectedAgente] = useState<AgenteIA | null>(null);
  const [activeSection, setActiveSection] = useState("perfil");
  const [configTab, setConfigTab] = useState("conversa");
  const [treinamentoTab, setTreinamentoTab] = useState("texto");
  const [criarAgenteOpen, setCriarAgenteOpen] = useState(false);
  const [novoAgenteNome, setNovoAgenteNome] = useState("");
  const [buscarTreinamento, setBuscarTreinamento] = useState("");
  const [buscarIntencao, setBuscarIntencao] = useState("");
  const [novoTreinamento, setNovoTreinamento] = useState("");
  const [novoWebsiteUrl, setNovoWebsiteUrl] = useState("");
  const [novoVideoUrl, setNovoVideoUrl] = useState("");
  const [testarIaOpen, setTestarIaOpen] = useState(false);
  const [chatMensagens, setChatMensagens] = useState<{role: string; content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [editTreinamentoOpen, setEditTreinamentoOpen] = useState(false);
  const [editTreinamento, setEditTreinamento] = useState<Treinamento | null>(null);
  const [deleteTreinamentoOpen, setDeleteTreinamentoOpen] = useState(false);
  const [deleteTreinamentoId, setDeleteTreinamentoId] = useState<string | null>(null);
  
  const [novaIntencaoOpen, setNovaIntencaoOpen] = useState(false);
  const [novaIntencao, setNovaIntencao] = useState({ nome: "", webhook_url: "", descricao: "" });
  const [editIntencaoOpen, setEditIntencaoOpen] = useState(false);
  const [editIntencao, setEditIntencao] = useState<Intencao | null>(null);
  const [deleteIntencaoOpen, setDeleteIntencaoOpen] = useState(false);
  const [deleteIntencaoId, setDeleteIntencaoId] = useState<string | null>(null);
  
  const [configIntegracaoOpen, setConfigIntegracaoOpen] = useState(false);
  const [integracaoSelecionada, setIntegracaoSelecionada] = useState<Integracao | null>(null);
  const [integracaoApiKey, setIntegracaoApiKey] = useState("");
  
  const [deleteAgenteOpen, setDeleteAgenteOpen] = useState(false);
  
  // Inatividade config
  const [inativodadeConfigOpen, setInativodadeConfigOpen] = useState(false);
  
  // Webhooks config
  const [webhooksConfigOpen, setWebhooksConfigOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEventos, setWebhookEventos] = useState<string[]>([]);
  
  // Transferência config
  const [transferenciaConfigOpen, setTransferenciaConfigOpen] = useState(false);
  const [palavrasChave, setPalavrasChave] = useState("");

  const [agentes, setAgentes] = useState<AgenteIA[]>([
    {
      id: "1",
      nome: "Assistente Virtual",
      descricao: "Atendente da Clínica",
      modelo: "gpt-4o-mini",
      avatar_url: null,
      comunicacao: "normal",
      comportamento: "Você é um assistente virtual de atendimento. Seja cordial e objetivo.",
      finalidade: "suporte",
      produto: "Clínica Médica",
      site_url: "",
      descricao_produto: "Clínica especializada em saúde e bem-estar.",
      ativo: true,
      transferir_para_humano: true,
      usar_emojis: true,
      assinar_nome: false,
      restringir_temas: true,
      dividir_resposta: true,
      permitir_lembretes: true,
      busca_treinamento: false,
      timezone: "America/Sao_Paulo",
      tempo_resposta: 5,
      limite_interacoes: 0,
      tempo_inatividade: 5,
      acao_inatividade: "mensagem",
      mensagem_inatividade: "Olá! Notei que você ficou um tempo sem responder. Posso ajudar em algo mais?",
      palavras_chave_transferencia: ["humano", "atendente", "pessoa real"],
      fila_transferencia: ""
    }
  ]);

  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([
    {
      id: "1",
      tipo: "texto",
      conteudo: "Mensagem da IA (natural e persuasiva): Perfeito! Como prometido, estou aqui para ajudar com suas dúvidas sobre nossos serviços.",
      status: "treinado",
      created_at: new Date().toISOString()
    }
  ]);

  const [intencoes, setIntencoes] = useState<Intencao[]>([
    {
      id: "1",
      nome: "INTERAGIU COM A IA",
      webhook_url: "https://example.com/webhook/interagiu",
      ativa: true,
      descricao: "Dispara quando o usuário interage com a IA"
    },
    {
      id: "2",
      nome: "INTENÇÃO: novo lead",
      webhook_url: "https://example.com/webhook/novo-lead",
      ativa: true,
      descricao: "Dispara quando um novo lead é identificado"
    }
  ]);

  const [integracoes, setIntegracoes] = useState<Integracao[]>([
    {
      id: "1",
      nome: "ElevenLabs",
      descricao: "Com ElevenLabs você dá a capacidade do seu agente responder seus clientes em áudio, tornando ainda mais humanizado.",
      icone: "11",
      ativa: false,
      configurada: false
    },
    {
      id: "2",
      nome: "Google Calendar",
      descricao: "Com google calendar sua agente será capaz de agendar reuniões, criar link da chamada e já enviar os convites.",
      icone: "calendar",
      ativa: true,
      configurada: true
    },
    {
      id: "3",
      nome: "Plug Chat",
      descricao: "Caso sua IA ainda não consiga responder algumas perguntas, permita direcionar o atendimento a um humano.",
      icone: "chat",
      ativa: false,
      configurada: false
    }
  ]);

  // Initialize selected agente
  useEffect(() => {
    if (!selectedAgente && agentes.length > 0) {
      setSelectedAgente(agentes[0]);
    }
  }, [agentes, selectedAgente]);

  const handleCriarAgente = () => {
    if (!novoAgenteNome.trim()) {
      toast.error("Digite um nome para o agente");
      return;
    }

    const novoAgente: AgenteIA = {
      id: Math.random().toString(),
      nome: novoAgenteNome,
      descricao: "Novo agente",
      modelo: "gpt-4o-mini",
      avatar_url: null,
      comunicacao: "normal",
      comportamento: "",
      finalidade: "suporte",
      produto: "",
      site_url: "",
      descricao_produto: "",
      ativo: true,
      transferir_para_humano: false,
      usar_emojis: true,
      assinar_nome: false,
      restringir_temas: false,
      dividir_resposta: false,
      permitir_lembretes: false,
      busca_treinamento: false,
      timezone: "America/Sao_Paulo",
      tempo_resposta: 5,
      limite_interacoes: 0,
      tempo_inatividade: 5,
      acao_inatividade: "mensagem",
      mensagem_inatividade: "",
      palavras_chave_transferencia: [],
      fila_transferencia: ""
    };

    setAgentes(prev => [...prev, novoAgente]);
    setSelectedAgente(novoAgente);
    setCriarAgenteOpen(false);
    setNovoAgenteNome("");
    toast.success("Agente criado com sucesso!");
  };

  const handleDeleteAgente = () => {
    if (!selectedAgente) return;
    
    setAgentes(prev => prev.filter(a => a.id !== selectedAgente.id));
    setSelectedAgente(agentes.length > 1 ? agentes.find(a => a.id !== selectedAgente.id) || null : null);
    setDeleteAgenteOpen(false);
    toast.success("Agente excluído com sucesso!");
  };

  const handleSalvarAgente = () => {
    if (!selectedAgente) return;
    setAgentes(prev => prev.map(a => a.id === selectedAgente.id ? selectedAgente : a));
    toast.success("Alterações salvas!");
  };

  const handleToggleAgenteAtivo = () => {
    if (!selectedAgente) return;
    const updated = { ...selectedAgente, ativo: !selectedAgente.ativo };
    setSelectedAgente(updated);
    setAgentes(prev => prev.map(a => a.id === updated.id ? updated : a));
    toast.success(updated.ativo ? "Agente ativado!" : "Agente desativado!");
  };

  // Treinamentos handlers
  const handleAdicionarTreinamento = (tipo: Treinamento["tipo"], conteudo: string) => {
    if (!conteudo.trim()) {
      toast.error("Digite o conteúdo do treinamento");
      return;
    }
    
    setTreinamentos(prev => [...prev, {
      id: Math.random().toString(),
      tipo,
      conteudo,
      status: "pendente",
      created_at: new Date().toISOString()
    }]);
    
    setNovoTreinamento("");
    setNovoWebsiteUrl("");
    setNovoVideoUrl("");
    toast.success("Treinamento cadastrado! Processando...");
    
    // Simulate training
    setTimeout(() => {
      setTreinamentos(prev => prev.map(t => 
        t.status === "pendente" ? { ...t, status: "treinado" as const } : t
      ));
      toast.success("Treinamento concluído!");
    }, 2000);
  };

  const handleEditTreinamento = () => {
    if (!editTreinamento) return;
    setTreinamentos(prev => prev.map(t => t.id === editTreinamento.id ? editTreinamento : t));
    setEditTreinamentoOpen(false);
    setEditTreinamento(null);
    toast.success("Treinamento atualizado!");
  };

  const handleDeleteTreinamento = () => {
    if (!deleteTreinamentoId) return;
    setTreinamentos(prev => prev.filter(t => t.id !== deleteTreinamentoId));
    setDeleteTreinamentoOpen(false);
    setDeleteTreinamentoId(null);
    toast.success("Treinamento excluído!");
  };

  const handleRetrainTreinamento = (id: string) => {
    setTreinamentos(prev => prev.map(t => 
      t.id === id ? { ...t, status: "pendente" as const } : t
    ));
    toast.info("Reprocessando treinamento...");
    
    setTimeout(() => {
      setTreinamentos(prev => prev.map(t => 
        t.id === id ? { ...t, status: "treinado" as const } : t
      ));
      toast.success("Treinamento reprocessado!");
    }, 2000);
  };

  // Intenções handlers
  const handleCriarIntencao = () => {
    if (!novaIntencao.nome.trim() || !novaIntencao.webhook_url.trim()) {
      toast.error("Preencha nome e URL do webhook");
      return;
    }
    
    setIntencoes(prev => [...prev, {
      id: Math.random().toString(),
      ...novaIntencao,
      ativa: true
    }]);
    
    setNovaIntencaoOpen(false);
    setNovaIntencao({ nome: "", webhook_url: "", descricao: "" });
    toast.success("Intenção criada com sucesso!");
  };

  const handleEditIntencaoSave = () => {
    if (!editIntencao) return;
    setIntencoes(prev => prev.map(i => i.id === editIntencao.id ? editIntencao : i));
    setEditIntencaoOpen(false);
    setEditIntencao(null);
    toast.success("Intenção atualizada!");
  };

  const handleDeleteIntencao = () => {
    if (!deleteIntencaoId) return;
    setIntencoes(prev => prev.filter(i => i.id !== deleteIntencaoId));
    setDeleteIntencaoOpen(false);
    setDeleteIntencaoId(null);
    toast.success("Intenção excluída!");
  };

  const handleToggleIntencao = (id: string) => {
    setIntencoes(prev => prev.map(i => 
      i.id === id ? { ...i, ativa: !i.ativa } : i
    ));
  };

  // Integração handlers
  const handleConfigIntegracao = (integracao: Integracao) => {
    setIntegracaoSelecionada(integracao);
    setIntegracaoApiKey(integracao.api_key || "");
    setConfigIntegracaoOpen(true);
  };

  const handleSalvarIntegracao = () => {
    if (!integracaoSelecionada) return;
    
    setIntegracoes(prev => prev.map(i => 
      i.id === integracaoSelecionada.id 
        ? { ...i, ativa: true, configurada: true, api_key: integracaoApiKey }
        : i
    ));
    
    setConfigIntegracaoOpen(false);
    setIntegracaoSelecionada(null);
    setIntegracaoApiKey("");
    toast.success("Integração configurada com sucesso!");
  };

  const handleToggleIntegracao = (id: string) => {
    setIntegracoes(prev => prev.map(i => 
      i.id === id ? { ...i, ativa: !i.ativa } : i
    ));
  };

  // Testar IA
  const handleEnviarMensagemTeste = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = { role: "user", content: chatInput };
    setChatMensagens(prev => [...prev, userMsg]);
    setChatInput("");
    setIsLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { 
        role: "assistant", 
        content: `Olá! Sou o ${selectedAgente?.nome || "Assistente"}. ${selectedAgente?.comportamento || "Como posso ajudar você hoje?"}`
      };
      setChatMensagens(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  // Salvar configs de inatividade
  const handleSalvarInatividade = () => {
    handleSalvarAgente();
    setInativodadeConfigOpen(false);
    toast.success("Configurações de inatividade salvas!");
  };

  // Salvar webhooks
  const handleSalvarWebhooks = () => {
    toast.success("Webhooks configurados com sucesso!");
    setWebhooksConfigOpen(false);
  };

  // Salvar transferência
  const handleSalvarTransferencia = () => {
    if (selectedAgente) {
      const updated = {
        ...selectedAgente,
        palavras_chave_transferencia: palavrasChave.split(",").map(p => p.trim()).filter(Boolean)
      };
      setSelectedAgente(updated);
      setAgentes(prev => prev.map(a => a.id === updated.id ? updated : a));
    }
    setTransferenciaConfigOpen(false);
    toast.success("Regras de transferência salvas!");
  };

  const menuItems = [
    { id: "perfil", label: "Perfil", icon: User },
    { id: "trabalho", label: "Trabalho", icon: Briefcase },
    { id: "treinamentos", label: "Treinamentos", icon: GraduationCap },
    { id: "intencoes", label: "Intenções", icon: Target },
    { id: "integracoes", label: "Integrações", icon: Link2 },
    { id: "configuracoes", label: "Configurações", icon: Settings }
  ];

  return (
    <OmniLayout clinicaId={clinicaId || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Inteligência Artificial
            </h1>
            <p className="text-muted-foreground">
              Configure e treine seus agentes de IA para atendimento automático
            </p>
          </div>
          <Dialog open={criarAgenteOpen} onOpenChange={setCriarAgenteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Agente IA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Agente IA</DialogTitle>
                <DialogDescription>
                  Dê um nome para seu novo agente de inteligência artificial
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Agente</Label>
                  <Input
                    placeholder="Ex: Assistente de Vendas"
                    value={novoAgenteNome}
                    onChange={(e) => setNovoAgenteNome(e.target.value)}
                  />
                </div>
                <Button onClick={handleCriarAgente} className="w-full bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Criar Agente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        {agentes.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum agente IA criado</h3>
              <p className="text-muted-foreground mb-6">
                Crie seu primeiro agente de IA para automatizar o atendimento
              </p>
              <Button onClick={() => setCriarAgenteOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar - Lista de Agentes e Menu */}
            <div className="col-span-12 lg:col-span-3">
              <Card>
                <CardContent className="p-4">
                  {/* Seletor de Agente */}
                  <div className="flex flex-col items-center pb-4 border-b">
                    <div className="relative mb-3">
                      <Avatar className="w-24 h-24 border-4 border-purple-200">
                        <AvatarImage src={selectedAgente?.avatar_url || ""} />
                        <AvatarFallback className="bg-purple-500 text-white text-2xl">
                          {(selectedAgente?.nome || agentes[0]?.nome || "IA").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button 
                        size="icon" 
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                    <h3 className="font-semibold text-lg">{selectedAgente?.nome || agentes[0]?.nome}</h3>
                    <p className="text-sm text-muted-foreground">{selectedAgente?.descricao || agentes[0]?.descricao}</p>
                    
                    {/* Status do agente */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={selectedAgente?.ativo ? "default" : "secondary"} className={selectedAgente?.ativo ? "bg-emerald-500" : ""}>
                        {selectedAgente?.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={handleToggleAgenteAtivo}>
                        {selectedAgente?.ativo ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                    </div>
                    
                    {/* Seletor de LLM configurada */}
                    <div className="mt-3 w-full">
                      <Label className="text-xs text-muted-foreground mb-1 block text-center">LLM Configurada</Label>
                      <Select
                        value={selectedAgente?.modelo || agentes[0]?.modelo || "gpt-4o-mini"}
                        onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, modelo: value } : null)}
                      >
                        <SelectTrigger className="w-full">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <SelectValue placeholder="Selecionar modelo" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">OpenAI GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">OpenAI GPT-4o mini</SelectItem>
                          <SelectItem value="gpt-4-turbo">OpenAI GPT-4 Turbo</SelectItem>
                          <SelectItem value="claude-3-opus">Anthropic Claude 3 Opus</SelectItem>
                          <SelectItem value="claude-3-sonnet">Anthropic Claude 3 Sonnet</SelectItem>
                          <SelectItem value="claude-3-haiku">Anthropic Claude 3 Haiku</SelectItem>
                          <SelectItem value="gemini-1.5-pro">Google Gemini 1.5 Pro</SelectItem>
                          <SelectItem value="gemini-1.5-flash">Google Gemini 1.5 Flash</SelectItem>
                          <SelectItem value="llama-3-70b">Groq LLaMA 3 70B</SelectItem>
                          <SelectItem value="mixtral-8x7b">Groq Mixtral 8x7B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dropdown de agentes */}
                    {agentes.length > 1 && (
                      <Select
                        value={selectedAgente?.id || agentes[0]?.id}
                        onValueChange={(value) => {
                          const agente = agentes.find(a => a.id === value);
                          setSelectedAgente(agente || null);
                        }}
                      >
                        <SelectTrigger className="mt-3 w-full">
                          <SelectValue placeholder="Selecionar agente" />
                        </SelectTrigger>
                        <SelectContent>
                          {agentes.map((agente) => (
                            <SelectItem key={agente.id} value={agente.id}>
                              {agente.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Menu de Navegação */}
                  <nav className="mt-4 space-y-1">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          activeSection === item.id
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </nav>

                  {/* Botões de ação */}
                  <div className="mt-6 space-y-2">
                    <Button 
                      onClick={() => {
                        setChatMensagens([]);
                        setTestarIaOpen(true);
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Teste sua IA
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeleteAgenteOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Agente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conteúdo Principal */}
            <div className="col-span-12 lg:col-span-9">
              <Card>
                <CardContent className="p-6">
                  {/* Seção: Perfil */}
                  {activeSection === "perfil" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Informações pessoais</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Nome do agente</Label>
                          <Input
                            value={selectedAgente?.nome || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, nome: e.target.value } : null)}
                            placeholder="Nome do agente"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Input
                            value={selectedAgente?.descricao || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                            placeholder="Ex: Atendente da Clínica"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Comunicação</Label>
                        <div className="flex gap-2">
                          {["formal", "normal", "descontraida"].map((tipo) => (
                            <Button
                              key={tipo}
                              variant={selectedAgente?.comunicacao === tipo ? "default" : "outline"}
                              className={cn(
                                selectedAgente?.comunicacao === tipo && "bg-purple-600 hover:bg-purple-700"
                              )}
                              onClick={() => setSelectedAgente(prev => prev ? { ...prev, comunicacao: tipo as AgenteIA["comunicacao"] } : null)}
                            >
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Comportamento:</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Descreva um pouco sobre como o agente deve se comportar durante a conversa.
                        </p>
                        <Textarea
                          value={selectedAgente?.comportamento || ""}
                          onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, comportamento: e.target.value } : null)}
                          placeholder="Ex: Você é um assistente cordial que ajuda clientes..."
                          rows={8}
                          className="resize-none"
                        />
                        <div className="text-right text-sm text-muted-foreground">
                          {(selectedAgente?.comportamento || "").length}/3000
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Seção: Trabalho */}
                  {activeSection === "trabalho" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Informações sobre trabalho</h2>
                      
                      <div className="space-y-2">
                        <Label>Finalidade:</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { id: "suporte", label: "Suporte", desc: "Use essa opção sempre que o objetivo do seu agente for prestar suporte.", icon: Headphones },
                            { id: "vendas", label: "Vendas", desc: "Use sempre que quiser criar um agente de no setor de vendas.", icon: ShoppingCart },
                            { id: "pessoal", label: "Uso pessoal", desc: "Escolha esta opção caso queira um agente para uso pessoal.", icon: Users }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedAgente(prev => prev ? { ...prev, finalidade: opt.id as AgenteIA["finalidade"] } : null)}
                              className={cn(
                                "p-4 rounded-lg border-2 text-left transition-colors",
                                selectedAgente?.finalidade === opt.id
                                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                  : "border-muted hover:border-purple-300"
                              )}
                            >
                              <opt.icon className={cn(
                                "w-8 h-8 mb-2",
                                selectedAgente?.finalidade === opt.id ? "text-purple-600" : "text-muted-foreground"
                              )} />
                              <h4 className="font-semibold">{opt.label}</h4>
                              <p className="text-sm text-muted-foreground">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Vende o produto:</Label>
                          <Input
                            value={selectedAgente?.produto || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, produto: e.target.value } : null)}
                            placeholder="Nome do produto/serviço"
                          />
                          <div className="text-right text-sm text-muted-foreground">
                            {(selectedAgente?.produto || "").length}/50
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Site oficial: (opcional)</Label>
                          <Input
                            value={selectedAgente?.site_url || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, site_url: e.target.value } : null)}
                            placeholder="https://meuproduto.com.br"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Descreva um pouco sobre {selectedAgente?.produto || "o produto"}:</Label>
                        <Textarea
                          value={selectedAgente?.descricao_produto || ""}
                          onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, descricao_produto: e.target.value } : null)}
                          placeholder="Descreva seu produto ou serviço..."
                          rows={5}
                        />
                        <div className="text-right text-sm text-muted-foreground">
                          {(selectedAgente?.descricao_produto || "").length}/500
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Seção: Treinamentos */}
                  {activeSection === "treinamentos" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Treinamentos</h2>
                        <div className="relative w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar treinamento"
                            value={buscarTreinamento}
                            onChange={(e) => setBuscarTreinamento(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <Tabs value={treinamentoTab} onValueChange={setTreinamentoTab}>
                        <TabsList>
                          <TabsTrigger value="texto">Texto</TabsTrigger>
                          <TabsTrigger value="website">Website</TabsTrigger>
                          <TabsTrigger value="video">Video</TabsTrigger>
                          <TabsTrigger value="documento">Documento</TabsTrigger>
                        </TabsList>

                        <TabsContent value="texto" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <GraduationCap className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Novo treinamento via texto</span>
                                <span className="ml-auto text-sm text-muted-foreground">{novoTreinamento.length}/1028</span>
                              </div>
                              <Textarea
                                placeholder="Escreva uma afirmação e clique em cadastrar..."
                                value={novoTreinamento}
                                onChange={(e) => setNovoTreinamento(e.target.value)}
                                rows={3}
                              />
                              <div className="flex justify-end mt-3">
                                <Button 
                                  onClick={() => handleAdicionarTreinamento("texto", novoTreinamento)}
                                  className="bg-orange-400 hover:bg-orange-500 text-white"
                                  disabled={!novoTreinamento.trim()}
                                >
                                  Cadastrar
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Lista de treinamentos */}
                          <div className="space-y-2">
                            {treinamentos
                              .filter(t => t.tipo === "texto")
                              .filter(t => t.conteudo.toLowerCase().includes(buscarTreinamento.toLowerCase()))
                              .map((treinamento) => (
                                <Card key={treinamento.id}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <MessageSquare className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                      <span className="truncate">{treinamento.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Badge 
                                        variant={treinamento.status === "treinado" ? "default" : treinamento.status === "erro" ? "destructive" : "secondary"} 
                                        className={treinamento.status === "treinado" ? "bg-emerald-500" : ""}
                                      >
                                        {treinamento.status === "treinado" ? "Treinado" : treinamento.status === "erro" ? "Erro" : "Pendente"}
                                      </Badge>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => {
                                            setEditTreinamento(treinamento);
                                            setEditTreinamentoOpen(true);
                                          }}>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleRetrainTreinamento(treinamento.id)}>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Reprocessar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            className="text-destructive"
                                            onClick={() => {
                                              setDeleteTreinamentoId(treinamento.id);
                                              setDeleteTreinamentoOpen(true);
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>

                          <div className="text-center text-sm text-muted-foreground">
                            Total: {treinamentos.filter(t => t.tipo === "texto").length} treinamentos
                          </div>
                        </TabsContent>

                        <TabsContent value="website" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Globe className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Adicionar URL de website</span>
                              </div>
                              <Input 
                                placeholder="https://exemplo.com/pagina" 
                                value={novoWebsiteUrl}
                                onChange={(e) => setNovoWebsiteUrl(e.target.value)}
                              />
                              <Button 
                                className="mt-3 bg-orange-400 hover:bg-orange-500"
                                onClick={() => handleAdicionarTreinamento("website", novoWebsiteUrl)}
                                disabled={!novoWebsiteUrl.trim()}
                              >
                                Importar
                              </Button>
                            </CardContent>
                          </Card>
                          
                          <div className="space-y-2">
                            {treinamentos
                              .filter(t => t.tipo === "website")
                              .map((t) => (
                                <Card key={t.id}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Globe className="w-5 h-5 text-purple-600" />
                                      <span className="truncate">{t.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={t.status === "treinado" ? "bg-emerald-500" : ""}>
                                        {t.status}
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive"
                                        onClick={() => {
                                          setDeleteTreinamentoId(t.id);
                                          setDeleteTreinamentoOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="video" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Video className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Adicionar vídeo do YouTube</span>
                              </div>
                              <Input 
                                placeholder="https://youtube.com/watch?v=..." 
                                value={novoVideoUrl}
                                onChange={(e) => setNovoVideoUrl(e.target.value)}
                              />
                              <Button 
                                className="mt-3 bg-orange-400 hover:bg-orange-500"
                                onClick={() => handleAdicionarTreinamento("video", novoVideoUrl)}
                                disabled={!novoVideoUrl.trim()}
                              >
                                Importar
                              </Button>
                            </CardContent>
                          </Card>
                          
                          <div className="space-y-2">
                            {treinamentos
                              .filter(t => t.tipo === "video")
                              .map((t) => (
                                <Card key={t.id}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Video className="w-5 h-5 text-purple-600" />
                                      <span className="truncate">{t.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={t.status === "treinado" ? "bg-emerald-500" : ""}>
                                        {t.status}
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive"
                                        onClick={() => {
                                          setDeleteTreinamentoId(t.id);
                                          setDeleteTreinamentoOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="documento" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-6 text-center">
                              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground mb-4">Arraste um documento PDF ou Word aqui</p>
                              <Button variant="outline" onClick={() => toast.info("Funcionalidade de upload de documentos em breve!")}>
                                Selecionar arquivo
                              </Button>
                            </CardContent>
                          </Card>
                          
                          <div className="space-y-2">
                            {treinamentos
                              .filter(t => t.tipo === "documento")
                              .map((t) => (
                                <Card key={t.id}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <FileText className="w-5 h-5 text-purple-600" />
                                      <span className="truncate">{t.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={t.status === "treinado" ? "bg-emerald-500" : ""}>
                                        {t.status}
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive"
                                        onClick={() => {
                                          setDeleteTreinamentoId(t.id);
                                          setDeleteTreinamentoOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {/* Seção: Intenções */}
                  {activeSection === "intencoes" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Intenções</h2>
                        <div className="flex items-center gap-3">
                          <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar intenções"
                              value={buscarIntencao}
                              onChange={(e) => setBuscarIntencao(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <Button onClick={() => setNovaIntencaoOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Intenção
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {intencoes
                          .filter(i => i.nome.toLowerCase().includes(buscarIntencao.toLowerCase()))
                          .map((intencao) => (
                            <Card key={intencao.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <Target className="w-4 h-4 text-orange-500" />
                                      {intencao.nome}
                                      <Badge variant={intencao.ativa ? "default" : "secondary"} className={intencao.ativa ? "bg-emerald-500" : ""}>
                                        {intencao.ativa ? "Ativa" : "Inativa"}
                                      </Badge>
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {intencao.descricao}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-lg">
                                      Webhook: {intencao.webhook_url}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={intencao.ativa}
                                      onCheckedChange={() => handleToggleIntencao(intencao.id)}
                                    />
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => {
                                          setEditIntencao(intencao);
                                          setEditIntencaoOpen(true);
                                        }}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                          navigator.clipboard.writeText(intencao.webhook_url);
                                          toast.success("URL copiada!");
                                        }}>
                                          <Copy className="w-4 h-4 mr-2" />
                                          Copiar URL
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={() => {
                                            setDeleteIntencaoId(intencao.id);
                                            setDeleteIntencaoOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>

                      {intencoes.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Target className="w-12 h-12 mx-auto mb-4" />
                          <p>Nenhuma intenção cadastrada</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seção: Integrações */}
                  {activeSection === "integracoes" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold">Integrações</h2>
                        <p className="text-muted-foreground">
                          Conecte o seu agente a outros aplicativos, isso permite que ele obtenha informações mais precisas ou agende reuniões para você.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {integracoes.map((integracao) => (
                          <Card key={integracao.id} className="text-center">
                            <CardContent className="p-6">
                              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center text-3xl font-bold">
                                {integracao.icone === "11" && <span className="text-black">II</span>}
                                {integracao.icone === "calendar" && <Calendar className="w-12 h-12 text-blue-500" />}
                                {integracao.icone === "chat" && <MessageCircle className="w-12 h-12 text-purple-500" />}
                              </div>
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <h4 className="font-semibold">{integracao.nome}</h4>
                                {integracao.configurada && (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                                    <Check className="w-3 h-3 mr-1" />
                                    Configurada
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">{integracao.descricao}</p>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleConfigIntegracao(integracao)}
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Configurar
                                </Button>
                                <Button
                                  variant={integracao.ativa ? "secondary" : "default"}
                                  size="icon"
                                  onClick={() => handleToggleIntegracao(integracao.id)}
                                  disabled={!integracao.configurada}
                                >
                                  {integracao.ativa ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seção: Configurações */}
                  {activeSection === "configuracoes" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Preferências da conversa</h2>

                      <Tabs value={configTab} onValueChange={setConfigTab}>
                        <TabsList>
                          <TabsTrigger value="conversa">Conversa</TabsTrigger>
                          <TabsTrigger value="inatividade">Ações de inatividade</TabsTrigger>
                          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                          <TabsTrigger value="transferencia">Regras de transferência</TabsTrigger>
                        </TabsList>

                        <TabsContent value="conversa" className="space-y-4 pt-4">
                          <div className="space-y-4">
                            {[
                              { 
                                id: "transferir_para_humano", 
                                icon: ArrowRightLeft, 
                                label: "Transferir para humano",
                                desc: "Habilite para que o agente possa transferir o atendimento para aba 'em espera' de equipe humana.",
                                field: "transferir_para_humano"
                              },
                              { 
                                id: "usar_emojis", 
                                icon: Smile, 
                                label: "Usar Emojis Nas Respostas",
                                desc: "Define se o agente pode utilizar emojis em suas respostas.",
                                field: "usar_emojis"
                              },
                              { 
                                id: "assinar_nome", 
                                icon: MessageSquare, 
                                label: "Assinar nome do agente nas respostas",
                                desc: "Ative esta opção para que o agente de IA adicione automaticamente sua assinatura em cada resposta enviada ao usuário.",
                                field: "assinar_nome"
                              },
                              { 
                                id: "restringir_temas", 
                                icon: Shield, 
                                label: "Restringir Temas Permitidos",
                                desc: "Marque essa opção para que o agente não fale sobre outros assuntos.",
                                field: "restringir_temas"
                              },
                              { 
                                id: "dividir_resposta", 
                                icon: Split, 
                                label: "Dividir resposta em partes",
                                desc: "Em caso da mensagem ficar grande, o agente pode separar em várias mensagens.",
                                field: "dividir_resposta"
                              },
                              { 
                                id: "permitir_lembretes", 
                                icon: StickyNote, 
                                label: "Permitir registrar lembretes",
                                desc: "Habilite essa opção para que o agente tenha a capacidade de registrar lembretes ao usuário.",
                                field: "permitir_lembretes"
                              },
                              { 
                                id: "busca_treinamento", 
                                icon: Search, 
                                label: "Busca inteligênte do treinamento",
                                desc: "O agente consulta a base de treinamentos no momento certo, para trazer respostas mais precisas",
                                field: "busca_treinamento",
                                beta: true
                              }
                            ].map((config) => (
                              <div key={config.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                <div className="flex items-start gap-3">
                                  <config.icon className="w-5 h-5 text-purple-500 mt-0.5" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{config.label}</span>
                                      {config.beta && (
                                        <Badge variant="secondary" className="text-xs">Beta</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{config.desc}</p>
                                  </div>
                                </div>
                                <Switch
                                  checked={(selectedAgente as any)?.[config.field] || false}
                                  onCheckedChange={(checked) => 
                                    setSelectedAgente(prev => prev ? { ...prev, [config.field]: checked } : null)
                                  }
                                />
                              </div>
                            ))}

                            {/* Timezone */}
                            <div className="flex items-center justify-between py-3 border-b">
                              <div className="flex items-start gap-3">
                                <Globe className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div>
                                  <span className="font-medium">Timezone do agente</span>
                                  <p className="text-sm text-muted-foreground">
                                    Escolha o timezone que agente usará para datas, por exemplo agendar reuniões.
                                  </p>
                                </div>
                              </div>
                              <Select
                                value={selectedAgente?.timezone || "America/Sao_Paulo"}
                                onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, timezone: value } : null)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="America/Sao_Paulo">(GMT-03:00) Sao Paulo</SelectItem>
                                  <SelectItem value="America/Manaus">(GMT-04:00) Manaus</SelectItem>
                                  <SelectItem value="America/Fortaleza">(GMT-03:00) Fortaleza</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Tempo de resposta */}
                            <div className="flex items-center justify-between py-3 border-b">
                              <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div>
                                  <span className="font-medium">Tempo de resposta</span>
                                  <p className="text-sm text-muted-foreground">
                                    Defina um intervalo para o agente esperar e dar uma resposta.
                                  </p>
                                </div>
                              </div>
                              <Select
                                value={String(selectedAgente?.tempo_resposta || 5)}
                                onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, tempo_resposta: Number(value) } : null)}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">3 segundos</SelectItem>
                                  <SelectItem value="5">5 segundos</SelectItem>
                                  <SelectItem value="10">10 segundos</SelectItem>
                                  <SelectItem value="15">15 segundos</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Limite de interações */}
                            <div className="flex items-center justify-between py-3">
                              <div className="flex items-start gap-3">
                                <Target className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div>
                                  <span className="font-medium">Limite de interações por atendimento</span>
                                  <p className="text-sm text-muted-foreground">
                                    Defina a quantidade de interações que o agente pode aceitar por atendimento.
                                  </p>
                                </div>
                              </div>
                              <Select
                                value={String(selectedAgente?.limite_interacoes || 0)}
                                onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, limite_interacoes: Number(value) } : null)}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Sem limite</SelectItem>
                                  <SelectItem value="5">5 interações</SelectItem>
                                  <SelectItem value="10">10 interações</SelectItem>
                                  <SelectItem value="20">20 interações</SelectItem>
                                  <SelectItem value="50">50 interações</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex justify-end pt-4">
                            <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                              Salvar
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="inatividade" className="pt-4">
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-purple-500" />
                                <h3 className="font-semibold">Configurar ações de inatividade</h3>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Tempo de inatividade (minutos)</Label>
                                  <Select
                                    value={String(selectedAgente?.tempo_inatividade || 5)}
                                    onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, tempo_inatividade: Number(value) } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="2">2 minutos</SelectItem>
                                      <SelectItem value="5">5 minutos</SelectItem>
                                      <SelectItem value="10">10 minutos</SelectItem>
                                      <SelectItem value="15">15 minutos</SelectItem>
                                      <SelectItem value="30">30 minutos</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Ação após inatividade</Label>
                                  <Select
                                    value={selectedAgente?.acao_inatividade || "mensagem"}
                                    onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, acao_inatividade: value } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="mensagem">Enviar mensagem</SelectItem>
                                      <SelectItem value="encerrar">Encerrar atendimento</SelectItem>
                                      <SelectItem value="transferir">Transferir para humano</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Mensagem de inatividade</Label>
                                  <Textarea
                                    value={selectedAgente?.mensagem_inatividade || ""}
                                    onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, mensagem_inatividade: e.target.value } : null)}
                                    placeholder="Olá! Notei que você ficou um tempo sem responder..."
                                    rows={3}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end">
                                <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                                  Salvar Configurações
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="webhooks" className="pt-4">
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Webhook className="w-5 h-5 text-purple-500" />
                                <h3 className="font-semibold">Configurar Webhooks</h3>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>URL do Webhook</Label>
                                  <Input
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="https://seu-servidor.com/webhook"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Eventos para notificar</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { id: "mensagem_recebida", label: "Mensagem recebida" },
                                      { id: "mensagem_enviada", label: "Mensagem enviada" },
                                      { id: "atendimento_iniciado", label: "Atendimento iniciado" },
                                      { id: "atendimento_finalizado", label: "Atendimento finalizado" },
                                      { id: "transferencia", label: "Transferência" },
                                      { id: "erro", label: "Erro" }
                                    ].map((evento) => (
                                      <label key={evento.id} className="flex items-center gap-2 p-2 border rounded hover:bg-muted cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={webhookEventos.includes(evento.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setWebhookEventos(prev => [...prev, evento.id]);
                                            } else {
                                              setWebhookEventos(prev => prev.filter(e => e !== evento.id));
                                            }
                                          }}
                                          className="rounded"
                                        />
                                        <span className="text-sm">{evento.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-end">
                                <Button onClick={handleSalvarWebhooks} className="bg-emerald-500 hover:bg-emerald-600">
                                  Salvar Webhooks
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="transferencia" className="pt-4">
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                                <h3 className="font-semibold">Regras de transferência</h3>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Palavras-chave para transferência</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Quando o usuário mencionar essas palavras, o atendimento será transferido para um humano.
                                  </p>
                                  <Textarea
                                    value={selectedAgente?.palavras_chave_transferencia?.join(", ") || ""}
                                    onChange={(e) => setSelectedAgente(prev => prev ? { 
                                      ...prev, 
                                      palavras_chave_transferencia: e.target.value.split(",").map(p => p.trim()).filter(Boolean)
                                    } : null)}
                                    placeholder="humano, atendente, pessoa real, falar com alguém"
                                    rows={2}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Fila de destino</Label>
                                  <Select
                                    value={selectedAgente?.fila_transferencia || ""}
                                    onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, fila_transferencia: value } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma fila" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="suporte">Suporte Geral</SelectItem>
                                      <SelectItem value="vendas">Vendas</SelectItem>
                                      <SelectItem value="financeiro">Financeiro</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="flex justify-end">
                                <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                                  Salvar Regras
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Testar IA */}
      <Dialog open={testarIaOpen} onOpenChange={setTestarIaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              Testar {selectedAgente?.nome}
            </DialogTitle>
            <DialogDescription>
              Converse com sua IA para testar o comportamento
            </DialogDescription>
          </DialogHeader>
          <div className="h-80 overflow-y-auto border rounded-lg p-4 space-y-3 bg-muted/30">
            {chatMensagens.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Envie uma mensagem para começar...
              </p>
            )}
            {chatMensagens.map((msg, idx) => (
              <div key={idx} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2",
                  msg.role === "user" ? "bg-purple-600 text-white" : "bg-background border"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background border rounded-lg px-3 py-2">
                  <span className="animate-pulse">Digitando...</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              onKeyDown={(e) => e.key === "Enter" && handleEnviarMensagemTeste()}
            />
            <Button onClick={handleEnviarMensagemTeste} disabled={isLoading || !chatInput.trim()}>
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Treinamento */}
      <Dialog open={editTreinamentoOpen} onOpenChange={setEditTreinamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Treinamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editTreinamento?.conteudo || ""}
              onChange={(e) => setEditTreinamento(prev => prev ? { ...prev, conteudo: e.target.value } : null)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTreinamentoOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditTreinamento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Intenção */}
      <Dialog open={novaIntencaoOpen} onOpenChange={setNovaIntencaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Intenção</DialogTitle>
            <DialogDescription>Configure uma nova intenção com webhook</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Intenção</Label>
              <Input
                value={novaIntencao.nome}
                onChange={(e) => setNovaIntencao(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: INTENÇÃO: agendar consulta"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={novaIntencao.descricao}
                onChange={(e) => setNovaIntencao(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Dispara quando o usuário quer agendar..."
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                value={novaIntencao.webhook_url}
                onChange={(e) => setNovaIntencao(prev => ({ ...prev, webhook_url: e.target.value }))}
                placeholder="https://seu-servidor.com/webhook"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaIntencaoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriarIntencao}>Criar Intenção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Intenção */}
      <Dialog open={editIntencaoOpen} onOpenChange={setEditIntencaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Intenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editIntencao?.nome || ""}
                onChange={(e) => setEditIntencao(prev => prev ? { ...prev, nome: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={editIntencao?.descricao || ""}
                onChange={(e) => setEditIntencao(prev => prev ? { ...prev, descricao: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                value={editIntencao?.webhook_url || ""}
                onChange={(e) => setEditIntencao(prev => prev ? { ...prev, webhook_url: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIntencaoOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditIntencaoSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar Integração */}
      <Dialog open={configIntegracaoOpen} onOpenChange={setConfigIntegracaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar {integracaoSelecionada?.nome}</DialogTitle>
            <DialogDescription>{integracaoSelecionada?.descricao}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <Input
                type="password"
                value={integracaoApiKey}
                onChange={(e) => setIntegracaoApiKey(e.target.value)}
                placeholder="Cole sua chave de API aqui"
              />
            </div>
            {integracaoSelecionada?.nome === "ElevenLabs" && (
              <p className="text-sm text-muted-foreground">
                Obtenha sua API Key em{" "}
                <a href="https://elevenlabs.io" target="_blank" className="text-purple-600 hover:underline">
                  elevenlabs.io
                </a>
              </p>
            )}
            {integracaoSelecionada?.nome === "Google Calendar" && (
              <p className="text-sm text-muted-foreground">
                Configure o OAuth2 do Google Calendar para permitir agendamentos.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigIntegracaoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarIntegracao}>Salvar e Ativar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Excluir Treinamento */}
      <AlertDialog open={deleteTreinamentoOpen} onOpenChange={setDeleteTreinamentoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treinamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O treinamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTreinamento} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Excluir Intenção */}
      <AlertDialog open={deleteIntencaoOpen} onOpenChange={setDeleteIntencaoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir intenção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A intenção e seu webhook serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIntencao} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Excluir Agente */}
      <AlertDialog open={deleteAgenteOpen} onOpenChange={setDeleteAgenteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente "{selectedAgente?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente, seus treinamentos e configurações serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAgente} className="bg-destructive text-destructive-foreground">
              Excluir Agente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OmniLayout>
  );
}
