import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, ChevronLeft, CreditCard, User, FileText, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const selectedDate = searchParams.get("data") || "";
  const selectedTime = searchParams.get("horario") || "";
  const localId = searchParams.get("local") || "";
  
  const [medico, setMedico] = useState<Medico | null>(null);
  const [local, setLocal] = useState<Local | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    tipoServico: "",
    paraQuem: "eu", // 'eu' ou ID do dependente
    motivoConsulta: "",
    sintomas: "",
    observacoes: "",
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, localId]);

  async function fetchData() {
    setLoading(true);
    
    // Fetch medico
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

    // Fetch local if provided
    if (localId) {
      const { data: localData } = await supabase
        .from("locais_atendimento")
        .select("id, nome_local, endereco, cidade, estado")
        .eq("id", localId)
        .maybeSingle();
      
      setLocal(localData);
    }

    // Fetch services offered by the doctor
    const { data: servicosData } = await supabase
      .from("medico_servicos")
      .select("id, nome_servico")
      .eq("medico_id", id)
      .eq("ativo", true);
    
    setServicos(servicosData || []);

    // Fetch user's dependents if logged in
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.motivoConsulta) {
      toast.error("Por favor, informe o motivo da consulta");
      return;
    }

    if (!currentUser?.pacienteId) {
      toast.error("Você precisa estar logado como paciente para agendar uma consulta");
      navigate("/entrar");
      return;
    }

    setSubmitting(true);

    try {
      const dependenteId = formData.paraQuem !== "eu" ? formData.paraQuem : null;
      let nomePacienteConsulta = currentUser.nome;
      
      if (dependenteId) {
        const dependente = dependentes.find(d => d.id === dependenteId);
        if (dependente) {
          nomePacienteConsulta = dependente.nome;
        }
      }

      const dataHora = `${selectedDate}T${selectedTime}:00`;

      const { error } = await supabase
        .from("consultas")
        .insert({
          medico_id: medico.id,
          paciente_id: currentUser.pacienteId,
          dependente_id: dependenteId,
          nome_paciente_consulta: nomePacienteConsulta,
          data_hora: dataHora,
          valor_consulta: medico.valor_consulta,
          valor_medico: medico.valor_consulta * 0.7,
          valor_plataforma: medico.valor_consulta * 0.3,
          motivo_consulta: formData.motivoConsulta,
          sintomas: formData.sintomas,
          tipo_servico: formData.tipoServico,
          observacoes_paciente: formData.observacoes,
          status_consulta: "aguardando_pagamento",
          status_pagamento: "pendente",
          status_repasse: "pendente",
        });

      if (error) throw error;

      toast.success("Consulta agendada com sucesso! Você receberá um e-mail com os detalhes.");
      navigate("/paciente/consultas");
    } catch (error) {
      console.error("Error creating consultation:", error);
      toast.error("Erro ao agendar consulta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form - Left Column */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl p-6 shadow-md">
                <h1 className="text-2xl font-bold text-foreground mb-6">
                  Informações da Consulta
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Para quem é a consulta */}
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
                      {dependentes.map((dep) => (
                        <div key={dep.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value={dep.id} id={`dep-${dep.id}`} />
                          <Label htmlFor={`dep-${dep.id}`} className="cursor-pointer flex-1">
                            {dep.nome} <span className="text-muted-foreground">({dep.parentesco})</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {dependentes.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Você pode cadastrar dependentes no seu perfil para agendar consultas para eles.
                      </p>
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

                  {/* Motivo da consulta */}
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

                  {/* Payment */}
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Pagamento</h2>
                    </div>
                    
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-foreground">
                        💳 Integração com gateway de pagamento será adicionada posteriormente.
                      </p>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold"
                    disabled={submitting}
                  >
                    {submitting ? "Agendando..." : "Confirmar Agendamento"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Summary - Right Column */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 shadow-md sticky top-24">
                {/* Doctor Info */}
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

                {/* Appointment Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {formattedDate}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTime} - Fuso horário: Brasília
                      </p>
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

                {/* Total */}
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