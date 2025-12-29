import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, ChevronLeft, CreditCard, User, FileText, Users, ExternalLink, Loader2, Mail, Lock, Phone, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth, CurrentUser } from "@/contexts/AuthContext";

interface PaymentData {
  paymentId: string;
  invoiceUrl: string;
  dueDate: string;
  value: number;
  createdAt?: number; // timestamp when payment was created
}

interface Medico {
  id: string;
  nome: string;
  especialidade: string | null;
  foto_url: string | null;
  valor_consulta: number;
}

interface Local {
  id: string;
  nome_local: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  clinica_id: string | null;
}

interface Servico {
  id: string;
  nome_servico: string;
}

interface Dependente {
  id: string;
  nome: string;
  parentesco: string;
}

const Checkout = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useAuth();
  
  // Extract only the UUID from the id parameter
  const id = rawId?.split('?')[0] || rawId;
  
  const selectedDate = searchParams.get("data") || "";
  const selectedTime = searchParams.get("horario") || "";
  const localId = searchParams.get("local") || "";
  
  const [medico, setMedico] = useState<Medico | null>(null);
  const [local, setLocal] = useState<Local | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Payment countdown timer (15 minutes)
  const PAYMENT_TIMEOUT = 15 * 60 * 1000;
  
  // Combined form state
  const [formData, setFormData] = useState({
    // Personal data (for new users)
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: "",
    // Consultation data
    tipoServico: "",
    paraQuem: "eu",
    motivoConsulta: "",
    sintomas: "",
    observacoes: "",
    // Other person data
    outraPessoaNome: "",
    outraPessoaCpf: "",
    outraPessoaParentesco: "",
  });

  const isLoggedIn = !!currentUser?.pacienteId;

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, localId]);

  useEffect(() => {
    if (currentUser?.pacienteId) {
      fetchDependentes();
    }
  }, [currentUser?.pacienteId]);

  // Scroll to top when payment screen shows
  useEffect(() => {
    if (showPayment) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showPayment]);

  // Payment countdown timer effect
  useEffect(() => {
    if (showPayment && paymentData?.createdAt) {
      const calculateTimeLeft = () => {
        const elapsed = Date.now() - paymentData.createdAt!;
        const remaining = Math.max(0, PAYMENT_TIMEOUT - elapsed);
        return remaining;
      };
      
      setTimeLeft(calculateTimeLeft());
      
      const timer = setInterval(() => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(timer);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [showPayment, paymentData?.createdAt, PAYMENT_TIMEOUT]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  
  const isTimeExpired = timeLeft !== null && timeLeft <= 0;
  const isTimeWarning = timeLeft !== null && timeLeft <= 3 * 60 * 1000;

  async function fetchDependentes() {
    if (!currentUser?.pacienteId) return;
    
    const { data: dependentesData } = await supabase
      .from("paciente_dependentes")
      .select("id, nome, parentesco")
      .eq("paciente_id", currentUser.pacienteId)
      .eq("ativo", true);
    
    setDependentes(dependentesData || []);
  }

  async function fetchData() {
    setLoading(true);
    
    const { data: medicoData, error: medicoError } = await supabase
      .from("medicos")
      .select("id, nome, especialidade, foto_url, valor_consulta")
      .eq("id", id)
      .eq("ativo", true)
      .maybeSingle();

    if (medicoError || !medicoData) {
      console.error("Error fetching medico:", medicoError);
      setLoading(false);
      return;
    }

    setMedico(medicoData);

    if (localId) {
      const { data: localData } = await supabase
        .from("locais_atendimento")
        .select("id, nome_local, endereco, cidade, estado, clinica_id")
        .eq("id", localId)
        .maybeSingle();
      
      setLocal(localData);
    }

    const { data: servicosData } = await supabase
      .from("medico_servicos")
      .select("id, nome_servico")
      .eq("medico_id", id)
      .eq("ativo", true);
    
    setServicos(servicosData || []);

    if (currentUser?.pacienteId) {
      const { data: dependentesData } = await supabase
        .from("paciente_dependentes")
        .select("id, nome, parentesco")
        .eq("paciente_id", currentUser.pacienteId)
        .eq("ativo", true);
      
      setDependentes(dependentesData || []);
    }

    setLoading(false);
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.motivoConsulta) {
      toast.error("Por favor, informe o motivo da consulta");
      return;
    }

    // Check if user needs to complete paciente record
    const needsPacienteRecord = currentUser?.id && !currentUser?.pacienteId;

    // Validate personal data for new users
    if (!isLoggedIn && !needsPacienteRecord) {
      if (!formData.nome.trim()) {
        toast.error("Por favor, informe seu nome completo");
        return;
      }
      if (!formData.cpf || formData.cpf.replace(/\D/g, "").length !== 11) {
        toast.error("Por favor, informe um CPF válido");
        return;
      }
      if (!formData.email || !formData.email.includes("@")) {
        toast.error("Por favor, informe um email válido");
        return;
      }
      if (!formData.senha || formData.senha.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      if (formData.senha !== formData.confirmarSenha) {
        toast.error("As senhas não coincidem");
        return;
      }
    }

    // Validate CPF for logged-in users without paciente record
    if (needsPacienteRecord) {
      if (!formData.cpf || formData.cpf.replace(/\D/g, "").length !== 11) {
        toast.error("Por favor, informe seu CPF para completar o cadastro");
        return;
      }
    }

    // Validate other person fields if selected
    if (formData.paraQuem === "outra") {
      if (!formData.outraPessoaNome.trim()) {
        toast.error("Por favor, informe o nome da pessoa");
        return;
      }
      if (!formData.outraPessoaParentesco) {
        toast.error("Por favor, selecione o parentesco");
        return;
      }
    }

    setSubmitting(true);

    try {
      let pacienteId = currentUser?.pacienteId;
      let userId = currentUser?.id;
      let userName = currentUser?.nome;

      // If user is logged in but doesn't have pacienteId, we need to create paciente record
      const needsPacienteRecord = currentUser?.id && !currentUser?.pacienteId;
      
      // Create user if not logged in OR create paciente if logged in without paciente record
      if (!isLoggedIn && !needsPacienteRecord) {
        // Check if email already exists
        const { data: existingUser } = await supabase
          .from("usuarios")
          .select("id")
          .eq("email", formData.email.toLowerCase())
          .maybeSingle();

        if (existingUser) {
          toast.error("Este email já está cadastrado. Por favor, faça login.");
          setSubmitting(false);
          return;
        }

        // Check if CPF already exists
        const cpfClean = formData.cpf.replace(/\D/g, "");
        const { data: existingCpf } = await supabase
          .from("pacientes")
          .select("id")
          .eq("cpf", cpfClean)
          .maybeSingle();

        if (existingCpf) {
          toast.error("Este CPF já está cadastrado. Por favor, faça login.");
          setSubmitting(false);
          return;
        }

        // Create user
        const { data: newUser, error: userError } = await supabase
          .from("usuarios")
          .insert({
            nome: formData.nome.trim(),
            email: formData.email.toLowerCase().trim(),
            tipo: "paciente",
            senha_hash: formData.senha,
            ativo: true,
          })
          .select("id, nome, email, tipo")
          .single();

        if (userError) throw userError;

        // Create patient record
        const { data: newPaciente, error: pacienteError } = await supabase
          .from("pacientes")
          .insert({
            usuario_id: newUser.id,
            nome: formData.nome.trim(),
            cpf: cpfClean,
            telefone: formData.telefone.replace(/\D/g, "") || null,
          })
          .select("id")
          .single();

        if (pacienteError) throw pacienteError;

        pacienteId = newPaciente.id;
        userId = newUser.id;
        userName = newUser.nome;

        // Auto-login
        const loggedUser: CurrentUser = {
          id: newUser.id,
          nome: newUser.nome,
          email: newUser.email,
          tipo: "paciente",
          pacienteId: newPaciente.id,
        };
        setCurrentUser(loggedUser);
        
        toast.success("Conta criada com sucesso!");
      } else if (needsPacienteRecord) {
        // User is logged in but doesn't have paciente record - create one
        // This shouldn't normally happen, but handle it gracefully
        if (!formData.cpf || formData.cpf.replace(/\D/g, "").length !== 11) {
          toast.error("Por favor, informe seu CPF para completar o cadastro");
          setSubmitting(false);
          return;
        }

        const cpfClean = formData.cpf.replace(/\D/g, "");
        
        // Check if CPF already exists
        const { data: existingCpf } = await supabase
          .from("pacientes")
          .select("id")
          .eq("cpf", cpfClean)
          .maybeSingle();

        if (existingCpf) {
          toast.error("Este CPF já está cadastrado em outra conta.");
          setSubmitting(false);
          return;
        }

        // Create paciente record for existing user
        const { data: newPaciente, error: pacienteError } = await supabase
          .from("pacientes")
          .insert({
            usuario_id: currentUser!.id,
            nome: currentUser!.nome,
            cpf: cpfClean,
            telefone: formData.telefone.replace(/\D/g, "") || null,
          })
          .select("id")
          .single();

        if (pacienteError) {
          console.error("Error creating paciente:", pacienteError);
          toast.error("Erro ao completar cadastro. Tente novamente.");
          setSubmitting(false);
          return;
        }

        pacienteId = newPaciente.id;
        
        // Update currentUser with pacienteId
        const updatedUser: CurrentUser = {
          ...currentUser!,
          pacienteId: newPaciente.id,
        };
        setCurrentUser(updatedUser);
        
        toast.success("Cadastro completado!");
      }

      // Ensure we have a valid pacienteId
      if (!pacienteId) {
        toast.error("Erro: Não foi possível identificar o paciente. Faça login novamente.");
        setSubmitting(false);
        return;
      }

      // Determine patient name for the consultation
      const dependenteId = formData.paraQuem !== "eu" && formData.paraQuem !== "outra" ? formData.paraQuem : null;
      let nomePacienteConsulta = userName || formData.nome;
      
      if (formData.paraQuem === "outra") {
        nomePacienteConsulta = formData.outraPessoaNome;
      } else if (dependenteId) {
        const dependente = dependentes.find(d => d.id === dependenteId);
        if (dependente) {
          nomePacienteConsulta = dependente.nome;
        }
      }

      const dataHora = `${selectedDate}T${selectedTime}:00`;

      // Create consultation
      const { data: consultaData, error } = await supabase
        .from("consultas")
        .insert({
          medico_id: medico!.id,
          paciente_id: pacienteId,
          dependente_id: dependenteId,
          nome_paciente_consulta: nomePacienteConsulta,
          data_hora: dataHora,
          valor_consulta: medico!.valor_consulta,
          valor_medico: medico!.valor_consulta * 0.7,
          valor_plataforma: medico!.valor_consulta * 0.3,
          motivo_consulta: formData.motivoConsulta,
          sintomas: formData.sintomas,
          tipo_servico: formData.tipoServico,
          observacoes_paciente: formData.observacoes,
          status_consulta: "aguardando_pagamento",
          status_pagamento: "pendente",
          status_repasse: "pendente",
          local_id: localId || null,
          clinica_id: local?.clinica_id || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create Asaas payment
      toast.info("Gerando cobrança...");
      
      const { data: paymentResponse, error: paymentError } = await supabase.functions.invoke(
        'create-asaas-payment',
        {
          body: { consulta_id: consultaData.id }
        }
      );

      if (paymentError || !paymentResponse?.success) {
        console.error("Payment error:", paymentError || paymentResponse);
        toast.warning("Consulta criada, mas houve um erro ao gerar o pagamento. Você pode pagar depois.");
        navigate("/paciente/consultas");
        return;
      }

      // Redirect to custom payment page
      toast.success("Consulta agendada! Redirecionando para pagamento...");
      navigate(`/pagamento/${consultaData.id}`);
      
    } catch (error: any) {
      console.error("Error creating consultation:", error);
      
      // Provide more specific error message
      if (error?.message?.includes("duplicate") || error?.code === "23505") {
        toast.error("Este horário já está reservado. Por favor, escolha outro.");
      } else if (error?.message?.includes("violates foreign key")) {
        toast.error("Erro de dados. Por favor, atualize a página e tente novamente.");
      } else {
        toast.error("Erro ao agendar consulta. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!medico) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Médico não encontrado</h1>
          <Button onClick={() => navigate("/buscar-medicos")}>Voltar para busca</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const formattedDate = selectedDate 
    ? format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";


  // Payment success screen
  if (showPayment && paymentData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <main className="flex-1 py-8 sm:py-12 flex items-start justify-center">
          <div className="container mx-auto px-4 max-w-md w-full">
            <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-md text-center">
              {/* Icon */}
              <div className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full flex items-center justify-center ${
                isTimeExpired ? 'bg-destructive/10' : 'bg-green-100'
              }`}>
                {isTimeExpired ? (
                  <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-destructive" />
                ) : (
                  <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
                )}
              </div>
              
              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                {isTimeExpired ? 'Tempo Expirado!' : 'Consulta Agendada!'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                {isTimeExpired 
                  ? 'O tempo para pagamento expirou. Você ainda pode pagar acessando suas consultas.'
                  : 'Pague via PIX ou cartão de crédito para confirmar sua consulta'
                }
              </p>

              {/* Countdown Timer */}
              {timeLeft !== null && !isTimeExpired && (
                <div className={`mb-4 sm:mb-6 p-4 sm:p-5 rounded-xl border-2 ${
                  isTimeWarning 
                    ? 'bg-destructive/5 border-destructive/30' 
                    : 'bg-primary/5 border-primary/20'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className={`w-5 h-5 ${isTimeWarning ? 'text-destructive' : 'text-primary'}`} />
                    <span className={`text-sm font-medium ${isTimeWarning ? 'text-destructive' : 'text-primary'}`}>
                      Tempo restante para pagar
                    </span>
                  </div>
                  <div className={`text-3xl sm:text-4xl font-bold tabular-nums ${
                    isTimeWarning ? 'text-destructive' : 'text-foreground'
                  }`}>
                    {formatTime(timeLeft)}
                  </div>
                  {isTimeWarning && (
                    <p className="text-xs text-destructive mt-2">
                      Finalize o pagamento antes que o tempo expire!
                    </p>
                  )}
                </div>
              )}

              {/* Value */}
              <div className="p-3 sm:p-4 bg-muted/50 border border-border rounded-lg mb-4 sm:mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-foreground">Valor a pagar:</span>
                  <span className="text-lg sm:text-xl font-bold text-foreground">
                    R$ {paymentData.value.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {paymentData.invoiceUrl && !isTimeExpired && (
                  <Button 
                    size="lg"
                    onClick={() => window.open(paymentData.invoiceUrl, '_blank')}
                    className="w-full text-base"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pagar Agora
                  </Button>
                )}
                <Button 
                  variant={isTimeExpired ? "default" : "outline"}
                  onClick={() => navigate("/paciente/consultas")}
                  className="w-full"
                >
                  {isTimeExpired ? 'Ver minhas consultas' : 'Acessar minhas consultas'}
                </Button>
              </div>

              {/* Info */}
              {!isTimeExpired && (
                <p className="text-xs text-muted-foreground mt-4 sm:mt-6">
                  Após o pagamento, sua consulta será confirmada automaticamente.
                  <br />
                  Você pode pagar via PIX ou cartão de crédito.
                </p>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* CPF Section - For logged users without paciente record */}
                {currentUser?.id && !currentUser?.pacienteId && (
                  <div className="bg-card rounded-2xl p-6 shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Complete seu cadastro</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Para continuar, precisamos do seu CPF.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cpf">CPF *</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="telefone">Telefone</Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="telefone"
                            value={formData.telefone}
                            onChange={(e) => setFormData(prev => ({ ...prev, telefone: formatPhone(e.target.value) }))}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Data Section - Only for non-logged users */}
                {!isLoggedIn && !currentUser?.id && (
                  <div className="bg-card rounded-2xl p-6 shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Seus Dados</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="nome">Nome completo *</Label>
                        <Input
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Seu nome completo"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="cpf">CPF *</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="telefone">Telefone</Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="telefone"
                            value={formData.telefone}
                            onChange={(e) => setFormData(prev => ({ ...prev, telefone: formatPhone(e.target.value) }))}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="seu@email.com"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="senha">Senha *</Label>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="senha"
                            type="password"
                            value={formData.senha}
                            onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                            placeholder="Mínimo 6 caracteres"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="confirmarSenha">Confirmar senha *</Label>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirmarSenha"
                            type="password"
                            value={formData.confirmarSenha}
                            onChange={(e) => setFormData(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                            placeholder="Repita a senha"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Já tem uma conta?{" "}
                      <button 
                        type="button"
                        onClick={() => navigate("/entrar")}
                        className="text-primary hover:underline font-medium"
                      >
                        Faça login
                      </button>
                    </p>
                  </div>
                )}

                {/* Logged user info */}
                {isLoggedIn && (
                  <div className="bg-card rounded-2xl p-6 shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{currentUser?.nome}</p>
                        <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Consultation Info Section */}
                <div className="bg-card rounded-2xl p-6 shadow-md">
                  <h2 className="text-xl font-bold text-foreground mb-6">
                    Informações da Consulta
                  </h2>

                  <div className="space-y-6">
                    {/* Para quem */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-primary" />
                        <Label className="text-base font-medium">Para quem é esta consulta? *</Label>
                      </div>
                      <RadioGroup 
                        value={formData.paraQuem} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, paraQuem: value }))}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="eu" id="para-mim" />
                          <Label htmlFor="para-mim" className="cursor-pointer flex-1">
                            Para mim
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="outra" id="para-outra" />
                          <Label htmlFor="para-outra" className="cursor-pointer flex-1">
                            Para outra pessoa
                          </Label>
                        </div>
                        {dependentes.map((dep) => (
                          <div key={dep.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value={dep.id} id={`dep-${dep.id}`} />
                            <Label htmlFor={`dep-${dep.id}`} className="cursor-pointer flex-1">
                              {dep.nome} <span className="text-muted-foreground">({dep.parentesco})</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>

                      {/* Other person fields */}
                      {formData.paraQuem === "outra" && (
                        <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-4">
                          <div>
                            <Label htmlFor="outraPessoaNome">Nome completo da pessoa *</Label>
                            <Input
                              id="outraPessoaNome"
                              value={formData.outraPessoaNome}
                              onChange={(e) => setFormData(prev => ({ ...prev, outraPessoaNome: e.target.value }))}
                              placeholder="Nome completo"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="outraPessoaParentesco">Parentesco *</Label>
                            <Select 
                              value={formData.outraPessoaParentesco}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, outraPessoaParentesco: value }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="filho">Filho(a)</SelectItem>
                                <SelectItem value="conjuge">Cônjuge</SelectItem>
                                <SelectItem value="pai">Pai</SelectItem>
                                <SelectItem value="mae">Mãe</SelectItem>
                                <SelectItem value="irmao">Irmão(ã)</SelectItem>
                                <SelectItem value="avo">Avô/Avó</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tipo de serviço */}
                    {servicos.length > 0 && (
                      <div>
                        <Label className="text-base font-medium">Tipo de serviço</Label>
                        <Select 
                          value={formData.tipoServico}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, tipoServico: value }))}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione o tipo de serviço (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {servicos.map((servico) => (
                              <SelectItem key={servico.id} value={servico.nome_servico}>
                                {servico.nome_servico}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Motivo */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <Label className="text-base font-medium">Qual o motivo da consulta? *</Label>
                      </div>
                      <Textarea 
                        value={formData.motivoConsulta}
                        onChange={(e) => setFormData(prev => ({ ...prev, motivoConsulta: e.target.value }))}
                        placeholder="Ex: Dor nas costas, check-up de rotina, acompanhamento..."
                        className="min-h-[80px]"
                      />
                    </div>

                    {/* Sintomas */}
                    <div>
                      <Label className="text-base font-medium">Descreva seus sintomas (opcional)</Label>
                      <Textarea 
                        value={formData.sintomas}
                        onChange={(e) => setFormData(prev => ({ ...prev, sintomas: e.target.value }))}
                        placeholder="Descreva brevemente os sintomas que está sentindo..."
                        className="mt-2 min-h-[80px]"
                      />
                    </div>

                    {/* Observações */}
                    <div>
                      <Label className="text-base font-medium">Observações adicionais (opcional)</Label>
                      <Textarea 
                        value={formData.observacoes}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                        placeholder="Alguma informação adicional que o médico deva saber..."
                        className="mt-2 min-h-[60px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="bg-card rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">Pagamento</h2>
                  </div>
                  
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6">
                    <p className="text-sm text-foreground">
                      💳 Após confirmar, você poderá pagar via PIX ou cartão de crédito.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {!isLoggedIn ? "Criando conta e gerando pagamento..." : "Gerando pagamento..."}
                      </>
                    ) : (
                      <>Confirmar e Pagar R$ {medico.valor_consulta.toFixed(2).replace(".", ",")}</>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 shadow-md sticky top-24">
                <div className="flex gap-4 mb-6 pb-6 border-b border-border">
                  {medico.foto_url ? (
                    <img 
                      src={medico.foto_url} 
                      alt={medico.nome}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-foreground">{medico.nome}</h3>
                    <p className="text-sm text-primary">{medico.especialidade}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{formattedDate}</p>
                      <p className="text-sm text-muted-foreground">{selectedTime}</p>
                      <button 
                        type="button"
                        onClick={() => navigate(-1)}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Mudar a data
                      </button>
                    </div>
                  </div>

                  {local && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">{local.nome_local}</p>
                        {local.endereco && (
                          <p className="text-sm text-muted-foreground">{local.endereco}</p>
                        )}
                        {local.cidade && (
                          <p className="text-sm text-muted-foreground">{local.cidade}/{local.estado}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">Total</span>
                    <span className="text-2xl font-bold text-foreground">
                      R$ {medico.valor_consulta.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
