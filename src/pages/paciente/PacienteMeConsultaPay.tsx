import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Wallet,
  TrendingUp,
  Calendar,
  User,
  Send,
  AlertCircle,
  DollarSign,
  BarChart3,
  PieChart,
  Sparkles,
  Target,
  Heart,
  ChevronRight,
  FileSearch,
  FileCheck,
  Ban,
  PartyPopper,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import logo from "@/assets/logo.avif";
import PartnersCarousel from "@/components/PartnersCarousel";

// Empty data - will be populated with real data later
const creditRequestData = [
  { mes: "Jan", solicitacoes: 0, aprovados: 0 },
  { mes: "Fev", solicitacoes: 0, aprovados: 0 },
  { mes: "Mar", solicitacoes: 0, aprovados: 0 },
  { mes: "Abr", solicitacoes: 0, aprovados: 0 },
  { mes: "Mai", solicitacoes: 0, aprovados: 0 },
  { mes: "Jun", solicitacoes: 0, aprovados: 0 },
];

// Categories for credit usage - will be populated with real data later
const loanPurposeData = [
  { name: "Saúde", value: 0, icon: "🏥" },
  { name: "Educação", value: 0, icon: "📚" },
  { name: "Emergência", value: 0, icon: "🚨" },
  { name: "Outros", value: 0, icon: "📋" },
];

// Motivational phrases for people in debt
const motivationalPhrases = [
  "💪 Dívida é só um número. Você é muito mais que isso!",
  "🌟 O primeiro passo para sair do vermelho? Você já deu: buscando ajuda!",
  "🚀 Seu score não define seu valor. Vamos juntos reconstruir!",
  "💡 Endividado hoje, investidor amanhã. É questão de tempo!",
  "🎯 Cada real pago é uma vitória. Continue assim!",
  "❤️ Cuidar da saúde não tem preço. Nós te ajudamos com o resto!",
  "✨ Não é sobre a queda, é sobre levantar. E você está levantando!",
  "🌈 Depois da tempestade financeira, vem a bonança. Aguente firme!",
];

type PacienteContext = {
  pacienteData: {
    id: string;
    nome: string;
    cpf: string | null;
    data_nascimento: string | null;
  } | null;
};

export default function PacienteMeConsultaPay() {
  const { pacienteData: paciente } = useOutletContext<PacienteContext>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    nome_mae: "",
    valor_pretendido: "",
  });

  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<any>(null);
  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Rotate motivational phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % motivationalPhrases.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Initialize form with patient data
  useEffect(() => {
    if (paciente) {
      setFormData((prev) => ({
        ...prev,
        nome_completo: paciente.nome || "",
        cpf: paciente.cpf || "",
        data_nascimento: paciente.data_nascimento || "",
      }));
    }
  }, [paciente]);

  // Fetch patient's previous requests
  const { data: solicitacoes, isLoading: loadingSolicitacoes } = useQuery({
    queryKey: ["meconsulta-pay-solicitacoes", paciente?.id],
    queryFn: async () => {
      if (!paciente?.id) return [];
      const { data, error } = await supabase
        .from("meconsulta_pay_solicitacoes")
        .select("*")
        .eq("paciente_id", paciente.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!paciente?.id,
  });

  // Mutation to create new request
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!paciente?.id) throw new Error("Paciente não encontrado");

      const { error } = await supabase.from("meconsulta_pay_solicitacoes").insert({
        paciente_id: paciente.id,
        nome_completo: data.nome_completo,
        cpf: data.cpf,
        data_nascimento: data.data_nascimento,
        nome_mae: data.nome_mae,
        valor_pretendido: data.valor_pretendido ? parseFloat(data.valor_pretendido.replace(/\D/g, "")) / 100 : null,
        status: "pendente",
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meconsulta-pay-solicitacoes"] });
      toast({
        title: "Solicitação enviada!",
        description:
          "Nossa equipe irá analisar seus dados e entrar em contato em breve.",
      });
      setFormData({
        nome_completo: paciente?.nome || "",
        cpf: paciente?.cpf || "",
        data_nascimento: paciente?.data_nascimento || "",
        nome_mae: "",
        valor_pretendido: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.nome_completo ||
      !formData.cpf ||
      !formData.data_nascimento ||
      !formData.nome_mae
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (formData.cpf.replace(/\D/g, "").length < 11) {
      toast({
        title: "CPF inválido",
        description: "O CPF deve ter 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  // Stats from requests
  const stats = useMemo(() => {
    if (!solicitacoes)
      return { total: 0, pendentes: 0, aprovadas: 0, reprovadas: 0 };

    return {
      total: solicitacoes.length,
      pendentes: solicitacoes.filter(
        (s) => s.status === "pendente" || s.status === "em_analise"
      ).length,
      aprovadas: solicitacoes.filter((s) => s.status === "aprovado").length,
      reprovadas: solicitacoes.filter((s) => s.status === "reprovado").length,
    };
  }, [solicitacoes]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "em_analise":
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-600 border-blue-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Em Análise
          </Badge>
        );
      case "aprovado":
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "reprovado":
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Reprovado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Stages configuration
  const getStages = (status: string) => {
    const stages = [
      {
        id: "enviada",
        label: "Solicitação Enviada",
        description: "Sua solicitação foi recebida com sucesso",
        icon: Send,
        completed: true,
      },
      {
        id: "analise",
        label: "Em Análise",
        description: "Nossa equipe está analisando seus dados",
        icon: FileSearch,
        completed: status === "em_analise" || status === "aprovado" || status === "reprovado",
        active: status === "em_analise",
      },
      {
        id: "resultado",
        label: status === "reprovado" ? "Solicitação Negada" : "Crédito Aprovado",
        description: status === "reprovado" 
          ? "Infelizmente não foi possível aprovar seu crédito" 
          : status === "aprovado" 
            ? "Parabéns! Seu crédito foi aprovado!" 
            : "Aguardando resultado da análise",
        icon: status === "reprovado" ? Ban : status === "aprovado" ? PartyPopper : FileCheck,
        completed: status === "aprovado" || status === "reprovado",
        active: status === "aprovado" || status === "reprovado",
        isSuccess: status === "aprovado",
        isError: status === "reprovado",
      },
    ];
    return stages;
  };

  return (
    <div className="space-y-6">
      {/* Partners Banner - Banks Only */}
      <PartnersCarousel 
        title="Bancos Parceiros" 
        compact 
        filter="bank" 
      />

      {/* Motivational Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-secondary/20 to-primary/10 p-4 border border-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-secondary" />
          </div>
          <p className="text-sm sm:text-base font-medium text-foreground transition-all duration-500">
            {motivationalPhrases[currentPhrase]}
          </p>
        </div>
        <Sparkles className="absolute top-2 right-4 w-5 h-5 text-secondary/50 animate-pulse" />
      </div>

      {/* Hero Section with Credit Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Credit Card */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100/80 to-yellow-200 dark:from-amber-900/30 dark:via-amber-800/20 dark:to-yellow-900/30 p-6 sm:p-8 text-foreground shadow-2xl border border-amber-200/50 dark:border-amber-700/30 min-h-[320px] sm:min-h-[380px]">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-300/20 dark:bg-yellow-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-300/30 dark:bg-amber-600/15 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-white/90 backdrop-blur-sm flex items-center justify-center p-2 shadow-sm">
                  <img src={logo} alt="MeConsulta" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[hsl(214,100%,35%)] dark:text-primary">MeConsulta Pay</h1>
                  <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                    Crédito rápido para realizar seus sonhos
                  </p>
                </div>
              </div>

              {/* Virtual Card */}
              <div className="bg-gradient-to-br from-white/90 to-amber-50/80 dark:from-slate-800/90 dark:to-slate-700/80 backdrop-blur-sm rounded-xl p-5 sm:p-6 border border-amber-200/50 dark:border-slate-600/50 shadow-lg flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6 sm:mb-8">
                  <div className="w-12 h-8 bg-gradient-to-r from-yellow-400 to-amber-500 rounded shadow-sm" />
                  <div className="text-right">
                    <img src={logo} alt="MeConsulta" className="w-14 sm:w-16 h-7 sm:h-8 object-contain ml-auto" />
                  </div>
                </div>

                <p className="font-mono text-lg sm:text-xl tracking-wider mb-4 sm:mb-6 text-[hsl(214,100%,35%)] dark:text-primary">
                  •••• •••• •••• {paciente?.cpf?.replace(/\D/g, "").slice(-4) || "----"}
                </p>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-0">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">Titular</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                      {formData.nome_completo?.toUpperCase() || paciente?.nome?.toUpperCase() || "NOME NÃO INFORMADO"}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Limite pré-aprovado</p>
                    <p className="text-xl sm:text-2xl font-bold text-[hsl(214,100%,35%)] dark:text-primary">R$ 8.000,00</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
                * Limite sujeito à análise de crédito. Condições especiais para clientes MeConsulta.
              </p>
            </div>
          </div>
        </div>

        {/* Side Stats */}
        <div className="grid gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendentes}</p>
                  <p className="text-xs text-muted-foreground">Em análise</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.aprovadas}</p>
                  <p className="text-xs text-muted-foreground">Aprovadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">R$ 8.000,00</p>
                  <p className="text-xs text-muted-foreground">Limite disponível</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Loan Requests Evolution */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Histórico de Solicitações</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Acompanhe suas solicitações de crédito
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={creditRequestData}>
                <defs>
                  <linearGradient id="colorSolicitacoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(214, 100%, 35%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(214, 100%, 35%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAprovados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey="solicitacoes"
                  stroke="hsl(214, 100%, 35%)"
                  fillOpacity={1}
                  fill="url(#colorSolicitacoes)"
                  name="Solicitações"
                />
                <Area
                  type="monotone"
                  dataKey="aprovados"
                  stroke="hsl(142, 70%, 45%)"
                  fillOpacity={1}
                  fill="url(#colorAprovados)"
                  name="Aprovados"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Loan Purpose - Categories Grid */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Finalidade do Crédito</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Para que você pode usar o MeConsulta Pay
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loanPurposeData.map((item, index) => {
                const isSelected = selectedCategories.includes(item.name);
                return (
                  <button 
                    key={index}
                    type="button"
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left w-full group ${
                      isSelected 
                        ? "bg-primary/15 border-primary/40 shadow-md" 
                        : "bg-muted/50 border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:shadow-md"
                    }`}
                    onClick={() => toggleCategory(item.name)}
                  >
                    <span className={`text-2xl transition-transform ${isSelected ? "scale-110" : "group-hover:scale-110"}`}>{item.icon}</span>
                    <div className="flex-1">
                      <p className={`font-medium text-sm transition-colors ${isSelected ? "text-primary" : "group-hover:text-primary"}`}>{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isSelected ? "Selecionado" : "Clique para selecionar"}
                      </p>
                    </div>
                    {isSelected ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Selected Categories Tags */}
            {selectedCategories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Finalidades selecionadas:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((category) => {
                    const item = loanPurposeData.find(d => d.name === category);
                    return (
                      <Badge 
                        key={category}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => toggleCategory(category)}
                      >
                        {item?.icon} {category}
                        <XCircle className="w-3 h-3 ml-1.5 opacity-70" />
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Use seu crédito para o que precisar!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Benefits Section */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Aprovação Rápida</h3>
            <p className="text-xs text-muted-foreground">
              Análise em até 24h úteis
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-secondary/5 to-transparent border-secondary/10">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary/10 mx-auto mb-3 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-semibold mb-1">Taxas Especiais</h3>
            <p className="text-xs text-muted-foreground">
              Condições exclusivas para pacientes
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-transparent border-green-500/10">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 mx-auto mb-3 flex items-center justify-center">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-1">Foco em Saúde</h3>
            <p className="text-xs text-muted-foreground">
              Crédito pensado para você cuidar de si
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request Form */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Solicitar Análise de Crédito</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha seus dados para receber sua análise personalizada
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">
                  <User className="w-4 h-4 inline mr-2" />
                  Nome Completo
                </Label>
                <Input
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nome_completo: e.target.value }))
                  }
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  CPF
                </Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cpf: e.target.value }))
                  }
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_nascimento">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Data de Nascimento
                </Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, data_nascimento: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_mae">
                  <User className="w-4 h-4 inline mr-2" />
                  Nome da Mãe
                </Label>
                <Input
                  id="nome_mae"
                  value={formData.nome_mae}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nome_mae: e.target.value }))
                  }
                  placeholder="Nome completo da mãe"
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="valor_pretendido">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Valor Pretendido (R$)
                </Label>
                <Input
                  id="valor_pretendido"
                  type="text"
                  inputMode="numeric"
                  value={formData.valor_pretendido}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    const formatted = value ? (parseInt(value) / 100).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) : "";
                    setFormData((prev) => ({ ...prev, valor_pretendido: formatted }));
                  }}
                  placeholder="0,00"
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  Informe o valor que você deseja solicitar (máximo R$ 8.000,00)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/30">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Seus dados são tratados com total sigilo e segurança. A análise não afeta seu score de crédito.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-[hsl(214,100%,35%)] to-[hsl(214,100%,28%)] hover:from-[hsl(214,100%,40%)] hover:to-[hsl(214,100%,32%)] dark:from-primary dark:to-amber-500 dark:hover:from-primary/90 dark:hover:to-amber-400 text-white dark:text-slate-900"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Solicitação para Análise
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Previous Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <CardTitle>Minhas Solicitações</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSolicitacoes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : solicitacoes && solicitacoes.length > 0 ? (
            <div className="space-y-3">
              {solicitacoes.map((solicitacao) => (
                <div
                  key={solicitacao.id}
                  onClick={() => setSelectedSolicitacao(solicitacao)}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{solicitacao.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(solicitacao.created_at), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(solicitacao.status)}
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Você ainda não fez nenhuma solicitação de crédito.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha o formulário acima para começar!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Estágios da Solicitação */}
      <Dialog open={!!selectedSolicitacao} onOpenChange={() => setSelectedSolicitacao(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Acompanhar Solicitação
            </DialogTitle>
          </DialogHeader>
          
          {selectedSolicitacao && (
            <div className="space-y-6">
              {/* Info da Solicitação */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solicitante:</span>
                  <span className="font-medium">{selectedSolicitacao.nome_completo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {format(new Date(selectedSolicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {selectedSolicitacao.valor_pretendido && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor solicitado:</span>
                    <span className="font-medium text-primary">
                      R$ {Number(selectedSolicitacao.valor_pretendido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline de Estágios */}
              <div className="relative">
                {getStages(selectedSolicitacao.status).map((stage, index, arr) => {
                  const Icon = stage.icon;
                  const isLast = index === arr.length - 1;
                  
                  return (
                    <div key={stage.id} className="flex gap-4 pb-6 last:pb-0">
                      {/* Linha vertical */}
                      {!isLast && (
                        <div 
                          className={`absolute left-[19px] mt-10 w-0.5 h-[calc(100%-80px)] ${
                            stage.completed ? 'bg-primary' : 'bg-muted-foreground/20'
                          }`}
                          style={{ top: `${index * 80}px`, height: '60px' }}
                        />
                      )}
                      
                      {/* Ícone */}
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10
                        ${stage.isSuccess ? 'bg-green-500 text-white' : ''}
                        ${stage.isError ? 'bg-red-500 text-white' : ''}
                        ${!stage.isSuccess && !stage.isError && stage.completed ? 'bg-primary text-primary-foreground' : ''}
                        ${!stage.isSuccess && !stage.isError && stage.active && !stage.completed ? 'bg-yellow-500 text-yellow-950' : ''}
                        ${!stage.completed && !stage.active ? 'bg-muted text-muted-foreground' : ''}
                        ${stage.active && !stage.isSuccess && !stage.isError ? 'animate-pulse' : ''}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      {/* Conteúdo */}
                      <div className="flex-1 pt-1">
                        <p className={`font-semibold ${
                          stage.isSuccess ? 'text-green-600' : 
                          stage.isError ? 'text-red-600' : 
                          stage.completed || stage.active ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {stage.label}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {stage.description}
                        </p>
                        {stage.active && stage.isSuccess && (
                          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                              🎉 Parabéns! Entre em contato conosco para liberar seu crédito.
                            </p>
                          </div>
                        )}
                        {stage.active && stage.isError && (
                          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-400">
                              Você pode tentar novamente em 30 dias ou entrar em contato para mais informações.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão de Fechar */}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setSelectedSolicitacao(null)}
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
