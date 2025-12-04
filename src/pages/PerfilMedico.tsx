import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, GraduationCap, Stethoscope, Calendar, Clock, ChevronLeft, ChevronRight, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Medico {
  id: string;
  nome: string;
  especialidade: string | null;
  crm: string | null;
  foto_url: string | null;
  bio: string | null;
  valor_consulta: number;
  formacao: string[] | null;
}

interface Servico {
  id: string;
  nome_servico: string;
}

interface Local {
  id: string;
  nome_local: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
}

interface AgendaSlot {
  id: string;
  data_hora: string;
  disponivel: boolean;
}

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
}

const PerfilMedico = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [medico, setMedico] = useState<Medico | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [agendaSlots, setAgendaSlots] = useState<AgendaSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(0);
  const [mediaAvaliacao, setMediaAvaliacao] = useState(0);

  useEffect(() => {
    if (id) {
      fetchMedicoData();
    }
  }, [id]);

  async function fetchMedicoData() {
    setLoading(true);

    // Fetch medico
    const { data: medicoData, error: medicoError } = await supabase
      .from("medicos")
      .select("id, nome, especialidade, crm, foto_url, bio, valor_consulta, formacao")
      .eq("id", id)
      .eq("ativo", true)
      .maybeSingle();

    if (medicoError || !medicoData) {
      console.error("Error fetching medico:", medicoError);
      setLoading(false);
      return;
    }

    setMedico(medicoData);

    // Fetch services, locations, reviews, and agenda slots in parallel
    const [servicosRes, locaisRes, avaliacoesRes, slotsRes] = await Promise.all([
      supabase
        .from("medico_servicos")
        .select("id, nome_servico")
        .eq("medico_id", id)
        .eq("ativo", true),
      supabase
        .from("locais_atendimento")
        .select("id, nome_local, endereco, cidade, estado")
        .eq("medico_id", id)
        .eq("ativo", true),
      supabase
        .from("avaliacoes_medico")
        .select("id, nota, comentario, created_at")
        .eq("medico_id", id)
        .eq("aprovada_admin", true)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("agenda_slots")
        .select("id, data_hora, disponivel")
        .eq("medico_id", id)
        .eq("disponivel", true)
        .gte("data_hora", new Date().toISOString())
        .order("data_hora", { ascending: true }),
    ]);

    setServicos(servicosRes.data || []);
    setLocais(locaisRes.data || []);
    setAvaliacoes(avaliacoesRes.data || []);
    setAgendaSlots(slotsRes.data || []);

    if (avaliacoesRes.data && avaliacoesRes.data.length > 0) {
      const media = avaliacoesRes.data.reduce((acc, av) => acc + av.nota, 0) / avaliacoesRes.data.length;
      setMediaAvaliacao(media);
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

  const getVisibleDays = () => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const date = addDays(new Date(), weekStart + i);
      days.push(date);
    }
    return days;
  };

  const getTimesForDate = (dateStr: string) => {
    return agendaSlots
      .filter(slot => {
        const slotDate = format(new Date(slot.data_hora), "yyyy-MM-dd");
        return slotDate === dateStr && slot.disponivel;
      })
      .map(slot => format(new Date(slot.data_hora), "HH:mm"));
  };

  const hasSlotForDate = (dateStr: string) => {
    return agendaSlots.some(slot => {
      const slotDate = format(new Date(slot.data_hora), "yyyy-MM-dd");
      return slotDate === dateStr && slot.disponivel;
    });
  };

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      navigate(`/checkout/${medico.id}?data=${selectedDate}&horario=${selectedTime}`);
    }
  };

  const visibleDays = getVisibleDays();
  const localPrincipal = locais[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-4">
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
            {/* Doctor Info - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="bg-card rounded-2xl p-6 shadow-md">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden mx-auto md:mx-0 bg-muted flex items-center justify-center flex-shrink-0">
                    {medico.foto_url ? (
                      <img 
                        src={medico.foto_url} 
                        alt={medico.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {medico.nome}
                    </h1>
                    <p className="text-lg text-primary font-medium mb-2">{medico.especialidade || "Especialista"}</p>
                    {medico.crm && <p className="text-muted-foreground mb-3">CRM: {medico.crm}</p>}
                    
                    {avaliacoes.length > 0 && (
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-foreground">{mediaAvaliacao.toFixed(1)}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">({avaliacoes.length} avaliações)</span>
                      </div>
                    )}

                    {localPrincipal && (
                      <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {localPrincipal.endereco || localPrincipal.nome_local}
                          {localPrincipal.cidade && ` - ${localPrincipal.cidade}/${localPrincipal.estado}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {medico.bio && (
                <div className="bg-card rounded-2xl p-6 shadow-md">
                  <h2 className="text-xl font-bold text-foreground mb-4">Sobre</h2>
                  <p className="text-muted-foreground leading-relaxed">{medico.bio}</p>
                </div>
              )}

              {/* Education */}
              {medico.formacao && medico.formacao.length > 0 && (
                <div className="bg-card rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">Formação</h2>
                  </div>
                  <ul className="space-y-2">
                    {medico.formacao.map((item, index) => (
                      <li key={index} className="text-muted-foreground flex items-start gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Services */}
              {servicos.length > 0 && (
                <div className="bg-card rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">Serviços</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {servicos.map((servico) => (
                      <Badge 
                        key={servico.id}
                        variant="secondary"
                        className="bg-primary/10 text-primary px-4 py-2 text-sm font-medium"
                      >
                        {servico.nome_servico}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations */}
              {locais.length > 1 && (
                <div className="bg-card rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">Locais de Atendimento</h2>
                  </div>
                  <div className="space-y-3">
                    {locais.map((local) => (
                      <div key={local.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <MapPin className="w-4 h-4 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">{local.nome_local}</p>
                          {local.endereco && <p className="text-sm text-muted-foreground">{local.endereco}</p>}
                          {local.cidade && (
                            <p className="text-sm text-muted-foreground">{local.cidade}/{local.estado}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Booking - Right Column */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 shadow-md sticky top-24">
                <div className="text-center mb-6">
                  <p className="text-muted-foreground text-sm">Valor da consulta</p>
                  <p className="text-3xl font-bold text-foreground">
                    R$ {medico.valor_consulta.toFixed(2).replace(".", ",")}
                  </p>
                </div>

                {/* Date Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">Escolha a data</span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setWeekStart(Math.max(0, weekStart - 5))}
                        className="p-1 hover:bg-muted rounded disabled:opacity-50"
                        disabled={weekStart === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setWeekStart(weekStart + 5)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2">
                    {visibleDays.map((date) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const hasSlots = hasSlotForDate(dateStr);
                      const isSelected = selectedDate === dateStr;
                      
                      return (
                        <button
                          key={dateStr}
                          onClick={() => {
                            if (hasSlots) {
                              setSelectedDate(dateStr);
                              setSelectedTime(null);
                            }
                          }}
                          disabled={!hasSlots}
                          className={`
                            p-2 rounded-lg text-center transition-all
                            ${isSelected 
                              ? "bg-primary text-primary-foreground" 
                              : hasSlots 
                                ? "bg-muted hover:bg-primary/20 text-foreground" 
                                : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                            }
                          `}
                        >
                          <div className="text-xs uppercase">
                            {format(date, "EEE", { locale: ptBR })}
                          </div>
                          <div className="text-lg font-bold">
                            {format(date, "dd")}
                          </div>
                          <div className="text-xs">
                            {format(date, "MMM", { locale: ptBR })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">Escolha o horário</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {getTimesForDate(selectedDate).map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`
                            py-2 px-3 rounded-lg text-sm font-medium transition-all
                            ${selectedTime === time 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted hover:bg-primary/20 text-foreground"
                            }
                          `}
                        >
                          {time}
                        </button>
                      ))}
                    </div>

                    {getTimesForDate(selectedDate).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum horário disponível para esta data
                      </p>
                    )}
                  </div>
                )}

                {agendaSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 mb-4">
                    Este médico ainda não possui horários disponíveis
                  </p>
                )}

                {/* Continue Button */}
                <Button 
                  onClick={handleContinue}
                  disabled={!selectedDate || !selectedTime}
                  className="w-full h-12 text-base font-semibold"
                >
                  Continuar
                </Button>

                {selectedDate && selectedTime && (
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    {format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PerfilMedico;
