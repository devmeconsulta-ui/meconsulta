import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, ChevronLeft, CreditCard, User, FileText, Users, Copy, ExternalLink, Loader2, Mail, Lock, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth, CurrentUser } from "@/contexts/AuthContext";

interface PaymentData {
  paymentId: string;
  invoiceUrl: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  dueDate: string;
  value: number;
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
        .select("id, nome_local, endereco, cidade, estado")
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

    // Validate personal data for new users
    if (!isLoggedIn) {
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

      // Create user if not logged in
      if (!isLoggedIn) {
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
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create Asaas payment
      toast.info("Gerando cobrança PIX...");
      
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

      // Show payment screen
      setPaymentData(paymentResponse);
      setShowPayment(true);
      toast.success("Cobrança PIX gerada! Escaneie o QR Code ou copie o código.");
      
    } catch (error) {
      console.error("Error creating consultation:", error);
      toast.error("Erro ao agendar consulta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPixCode = () => {
    if (paymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(paymentData.pixCopyPaste);
      toast.success("Código PIX copiado!");
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
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="bg-card rounded-2xl p-8 shadow-md text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Consulta Agendada!
              </h1>
              <p className="text-muted-foreground mb-6">
                Pague via PIX para confirmar sua consulta
              </p>

              {paymentData.pixQrCode && (
                <div className="mb-6">
                  <div className="inline-block p-4 bg-white rounded-xl shadow-inner">
                    <img 
                      src={`data:image/png;base64,${paymentData.pixQrCode}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              {paymentData.pixCopyPaste && (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Ou copie o código PIX:</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={paymentData.pixCopyPaste}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border border-border truncate"
                    />
                    <Button onClick={copyPixCode} variant="outline" size="sm">
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-foreground">Valor a pagar:</span>
                  <span className="text-xl font-bold text-foreground">
                    R$ {paymentData.value.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Vencimento: {format(new Date(paymentData.dueDate + 'T12:00:00'), "dd/MM/yyyy")}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {paymentData.invoiceUrl && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(paymentData.invoiceUrl, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir página de pagamento
                  </Button>
                )}
                <Button 
                  onClick={() => navigate("/paciente/consultas")}
                  className="w-full"
                >
                  Ver minhas consultas
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Após o pagamento, sua consulta será confirmada automaticamente.
              </p>
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
                {/* Personal Data Section - Only for non-logged users */}
                {!isLoggedIn && (
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="outraPessoaCpf">CPF</Label>
                              <Input
                                id="outraPessoaCpf"
                                value={formData.outraPessoaCpf}
                                onChange={(e) => setFormData(prev => ({ ...prev, outraPessoaCpf: formatCPF(e.target.value) }))}
                                placeholder="000.000.000-00"
                                maxLength={14}
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
                      💳 Após confirmar, você receberá um QR Code PIX para pagamento instantâneo.
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
