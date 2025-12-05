import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "recharts";

// Mock data for charts
const creditEvolutionData = [
  { month: "Jan", valor: 2500 },
  { month: "Fev", valor: 3200 },
  { month: "Mar", valor: 2800 },
  { month: "Abr", valor: 4100 },
  { month: "Mai", valor: 3800 },
  { month: "Jun", valor: 5200 },
];

const usageProfileData = [
  { name: "Saúde", value: 45, color: "hsl(var(--primary))" },
  { name: "Educação", value: 25, color: "hsl(210, 100%, 60%)" },
  { name: "Lazer", value: 20, color: "hsl(280, 100%, 60%)" },
  { name: "Outros", value: 10, color: "hsl(var(--muted))" },
];

type PacienteContext = {
  paciente: {
    id: string;
    nome: string;
    cpf: string | null;
    data_nascimento: string | null;
  } | null;
};

export default function PacienteMeConsultaPay() {
  const { paciente } = useOutletContext<PacienteContext>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    nome_mae: "",
  });

  // Initialize form with patient data
  useState(() => {
    if (paciente) {
      setFormData((prev) => ({
        ...prev,
        nome_completo: paciente.nome || "",
        cpf: paciente.cpf || "",
        data_nascimento: paciente.data_nascimento || "",
      }));
    }
  });

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
        status: "pendente",
      });

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

  return (
    <div className="space-y-6">
      {/* Hero Section with Credit Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Credit Card */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-6 text-white shadow-2xl">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">MeConsulta Pay</h1>
                  <p className="text-white/80 text-sm">
                    Solicite análise de crédito de forma rápida e segura
                  </p>
                </div>
              </div>

              {/* Virtual Card */}
              <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded" />
                  <div className="text-right">
                    <p className="text-xs text-white/60">MeConsulta</p>
                    <p className="text-lg font-bold">PAY</p>
                  </div>
                </div>

                <p className="font-mono text-xl tracking-wider mb-6">
                  •••• •••• •••• {paciente?.cpf?.slice(-4) || "0000"}
                </p>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-white/60 uppercase">Titular</p>
                    <p className="font-medium">{paciente?.nome || "NOME DO PACIENTE"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/60">Limite pré-aprovado</p>
                    <p className="text-xl font-bold text-yellow-400">Em análise</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Stats */}
        <div className="grid gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendentes}</p>
                  <p className="text-xs text-muted-foreground">Solicitações pendentes</p>
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

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de solicitações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Credit Evolution Chart */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Evolução de Crédito</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={creditEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Valor"]}
                />
                <Bar
                  dataKey="valor"
                  fill="url(#creditGradient)"
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(260, 100%, 60%)" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage Profile Chart */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Perfil de Uso</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RePieChart>
                <Pie
                  data={usageProfileData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {usageProfileData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => (
                    <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>
                      {value}
                    </span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, "Percentual"]}
                />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Request Form */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Solicitar Análise de Crédito</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha seus dados para receber uma análise personalizada
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
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Seus dados são tratados com total sigilo e segurança. A análise não afeta seu score de crédito.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
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
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
                  {getStatusBadge(solicitacao.status)}
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
                Preencha o formulário acima para começar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
