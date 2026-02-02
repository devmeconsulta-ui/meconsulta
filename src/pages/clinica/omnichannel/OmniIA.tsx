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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Upload
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
}

interface Treinamento {
  id: string;
  tipo: "texto" | "website" | "video" | "documento";
  conteudo: string;
  status: "pendente" | "treinado";
}

interface Intencao {
  id: string;
  nome: string;
  webhook_url: string;
}

interface Integracao {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  ativa: boolean;
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
      limite_interacoes: 0
    }
  ]);

  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([
    {
      id: "1",
      tipo: "texto",
      conteudo: "Mensagem da IA (natural e persuasiva): Perfeito! Como prometido,...",
      status: "treinado"
    }
  ]);

  const [intencoes, setIntencoes] = useState<Intencao[]>([
    {
      id: "1",
      nome: "INTERAGIU COM A IA",
      webhook_url: "https://example.com/webhook/interagiu"
    },
    {
      id: "2",
      nome: "INTENÇÃO: novo lead",
      webhook_url: "https://example.com/webhook/novo-lead"
    }
  ]);

  const integracoes: Integracao[] = [
    {
      id: "1",
      nome: "ElevenLabs",
      descricao: "Com ElevenLabs você dá a capacidade do seu agente responder seus clientes em áudio, tornando ainda mais humanizado.",
      icone: "11",
      ativa: false
    },
    {
      id: "2",
      nome: "Google Calendar",
      descricao: "Com google calendar sua agente será capaz de agendar reuniões, criar link da chamada e já enviar os convites.",
      icone: "calendar",
      ativa: true
    },
    {
      id: "3",
      nome: "Plug Chat",
      descricao: "Caso sua IA ainda não consiga responder algumas perguntas, permita direcionar o atendimento a um humano.",
      icone: "chat",
      ativa: false
    }
  ];

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
      limite_interacoes: 0
    };

    setAgentes(prev => [...prev, novoAgente]);
    setSelectedAgente(novoAgente);
    setCriarAgenteOpen(false);
    setNovoAgenteNome("");
    toast.success("Agente criado com sucesso!");
  };

  const handleSalvarAgente = () => {
    if (!selectedAgente) return;
    setAgentes(prev => prev.map(a => a.id === selectedAgente.id ? selectedAgente : a));
    toast.success("Alterações salvas!");
  };

  const handleAdicionarTreinamento = () => {
    if (!novoTreinamento.trim()) return;
    
    setTreinamentos(prev => [...prev, {
      id: Math.random().toString(),
      tipo: treinamentoTab as Treinamento["tipo"],
      conteudo: novoTreinamento,
      status: "pendente"
    }]);
    setNovoTreinamento("");
    toast.success("Treinamento cadastrado!");
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

                  {/* Botão Testar IA */}
                  <Button className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Teste sua IA
                  </Button>
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
                            value={selectedAgente?.nome || agentes[0]?.nome || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, nome: e.target.value } : null)}
                            placeholder="Nome do agente"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Comunicação</Label>
                          <div className="flex gap-2">
                            {["formal", "normal", "descontraida"].map((tipo) => (
                              <Button
                                key={tipo}
                                variant={(selectedAgente?.comunicacao || agentes[0]?.comunicacao) === tipo ? "default" : "outline"}
                                className={cn(
                                  (selectedAgente?.comunicacao || agentes[0]?.comunicacao) === tipo && "bg-purple-600 hover:bg-purple-700"
                                )}
                                onClick={() => setSelectedAgente(prev => prev ? { ...prev, comunicacao: tipo as AgenteIA["comunicacao"] } : null)}
                              >
                                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Comportamento:</Label>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <Clock className="w-4 h-4 mr-1" />
                            Histórico
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Descreva um pouco sobre como o agente deve se comportar durante a conversa.
                        </p>
                        <Textarea
                          value={selectedAgente?.comportamento || agentes[0]?.comportamento || ""}
                          onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, comportamento: e.target.value } : null)}
                          placeholder="Ex: Você é um assistente cordial que ajuda clientes..."
                          rows={8}
                          className="resize-none"
                        />
                        <div className="text-right text-sm text-muted-foreground">
                          {(selectedAgente?.comportamento || agentes[0]?.comportamento || "").length}/3000
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
                                (selectedAgente?.finalidade || agentes[0]?.finalidade) === opt.id
                                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                  : "border-muted hover:border-purple-300"
                              )}
                            >
                              <opt.icon className={cn(
                                "w-8 h-8 mb-2",
                                (selectedAgente?.finalidade || agentes[0]?.finalidade) === opt.id ? "text-purple-600" : "text-muted-foreground"
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
                                placeholder="Escreva uma afirmação e tecle enter para cadastrar..."
                                value={novoTreinamento}
                                onChange={(e) => setNovoTreinamento(e.target.value)}
                                rows={3}
                              />
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="icon"><Image className="w-4 h-4" /></Button>
                                  <Button variant="outline" size="icon"><Video className="w-4 h-4" /></Button>
                                  <Button variant="outline" size="icon"><Headphones className="w-4 h-4" /></Button>
                                  <Button variant="outline" size="icon"><FileText className="w-4 h-4" /></Button>
                                </div>
                                <Button 
                                  onClick={handleAdicionarTreinamento}
                                  className="bg-orange-400 hover:bg-orange-500 text-white"
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
                                    <div className="flex items-center gap-3">
                                      <MessageSquare className="w-5 h-5 text-purple-600" />
                                      <span className="truncate max-w-md">{treinamento.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={treinamento.status === "treinado" ? "default" : "secondary"} className="bg-emerald-500">
                                        {treinamento.status === "treinado" ? "Treinado" : "Pendente"}
                                      </Badge>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>

                          <div className="flex items-center justify-center gap-2 pt-4">
                            <Button variant="outline" size="icon" className="rounded-full bg-purple-500 text-white hover:bg-purple-600">
                              1
                            </Button>
                            <span className="text-sm text-muted-foreground">Itens: {treinamentos.filter(t => t.tipo === "texto").length}</span>
                          </div>
                        </TabsContent>

                        <TabsContent value="website" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Globe className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Adicionar URL de website</span>
                              </div>
                              <Input placeholder="https://exemplo.com/pagina" />
                              <Button className="mt-3 bg-orange-400 hover:bg-orange-500">Importar</Button>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="video" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Video className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Adicionar vídeo do YouTube</span>
                              </div>
                              <Input placeholder="https://youtube.com/watch?v=..." />
                              <Button className="mt-3 bg-orange-400 hover:bg-orange-500">Importar</Button>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="documento" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-6 text-center">
                              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground mb-4">Arraste um documento PDF ou Word aqui</p>
                              <Button variant="outline">Selecionar arquivo</Button>
                            </CardContent>
                          </Card>
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
                          <Button variant="outline">
                            <Upload className="w-4 h-4 mr-2" />
                            Importar
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
                                  <div>
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <Target className="w-4 h-4 text-orange-500" />
                                      {intencao.nome}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-lg">
                                      Webhook: {intencao.webhook_url}
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button variant="outline" size="icon" className="rounded-full bg-purple-500 text-white hover:bg-purple-600">
                          1
                        </Button>
                        <span className="text-sm text-muted-foreground">Itens: {intencoes.length}</span>
                      </div>
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
                              <h4 className="font-semibold mb-2">{integracao.nome}</h4>
                              <p className="text-sm text-muted-foreground mb-4">{integracao.descricao}</p>
                              <Button 
                                className={cn(
                                  "w-full",
                                  integracao.ativa 
                                    ? "bg-gray-500 hover:bg-gray-600" 
                                    : "bg-emerald-500 hover:bg-emerald-600"
                                )}
                              >
                                {integracao.ativa ? "CONFIGURAR INTEGRAÇÃO" : "ATIVAR INTEGRAÇÃO"}
                              </Button>
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
                            <CardContent className="p-6 text-center text-muted-foreground">
                              <Clock className="w-12 h-12 mx-auto mb-4" />
                              <p>Configure ações automáticas após período de inatividade do usuário</p>
                              <Button variant="outline" className="mt-4">Configurar</Button>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="webhooks" className="pt-4">
                          <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                              <Webhook className="w-12 h-12 mx-auto mb-4" />
                              <p>Configure webhooks para eventos do agente</p>
                              <Button variant="outline" className="mt-4">Configurar Webhooks</Button>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="transferencia" className="pt-4">
                          <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                              <ArrowRightLeft className="w-12 h-12 mx-auto mb-4" />
                              <p>Defina regras para transferência automática para atendentes humanos</p>
                              <Button variant="outline" className="mt-4">Configurar Regras</Button>
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
    </OmniLayout>
  );
}
