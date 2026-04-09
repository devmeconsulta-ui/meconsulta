import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, GraduationCap, Stethoscope, Calendar, Clock, ChevronLeft, ChevronRight, User, Video, Building2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parseISO, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvaliacoesModal } from "@/components/AvaliacoesModal";
interface Medico {
  id: string;
  nome: string;
  especialidade: string | null;
  crm: string | null;
  foto_url: string | null;
  bio: string | null;
  valor_consulta: number;
  formacao: string[] | null;
  tempo_antecedencia_minutos?: number;
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
  tipo_atendimento: string;
}

interface AgendaSlot {
  id: string;
  data_hora: string;
  disponivel: boolean;
  local_id: string;
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
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlot | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(0);
  const [mediaAvaliacao, setMediaAvaliacao] = useState(0);
  const [avaliacoesModalOpen, setAvaliacoesModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fetchMedicoData();
    }
  }, [id]);

  async function fetchMedicoData() {
    setLoading(true);

    // Fetch medico
    const { data: medicoData, error: medicoError } = await supabase
      .from("medicos")
      .select("id, nome, especialidade, crm, foto_url, bio, valor_consulta, formacao, tempo_antecedencia_minutos")
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
        .select("id, nome_local, endereco, cidade, estado, tipo_atendimento")
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
        .select("id, data_hora, disponivel, local_id")
        .eq("medico_id", id)
        .eq("disponivel", true)
        .gte("data_hora", format(new Date(), "yyyy-MM-dd"))
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

  // Filter slots based on selected local, exclude past times, and apply antecedência
  const now = new Date();
  const antecedenciaMinutos = (medico as any)?.tempo_antecedencia_minutos ?? 60;
  const minAllowedTime = new Date(now.getTime() + antecedenciaMinutos * 60 * 1000);
  const filteredSlots = agendaSlots.filter(slot => {
    const slotTime = parseISO(slot.data_hora);
    const isAfterMinTime = !isBefore(slotTime, minAllowedTime);
    const matchesLocal = selectedLocal ? slot.local_id === selectedLocal : true;
    return isAfterMinTime && matchesLocal;
  });

  // Count slots per local
  const slotsPerLocal = locais.reduce((acc, local) => {
    acc[local.id] = agendaSlots.filter(slot => slot.local_id === local.id).length;
    return acc;
  }, {} as Record<string, number>);

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

  const getSlotsForDate = (dateStr: string) => {
    return filteredSlots.filter(slot => {
      const slotDate = format(new Date(slot.data_hora), "yyyy-MM-dd");
      return slotDate === dateStr && slot.disponivel;
    });
  };

  const getLocalForSlot = (slot: AgendaSlot) => {
    return locais.find(local => local.id === slot.local_id);
  };

  const hasSlotForDate = (dateStr: string) => {
    return filteredSlots.some(slot => {
      const slotDate = format(new Date(slot.data_hora), "yyyy-MM-dd");
      return slotDate === dateStr && slot.disponivel;
    });
  };

  const handleLocalSelect = (localId: string | null) => {
    setSelectedLocal(localId);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedSlot(null);
  };

  const handleContinue = () => {
    if (selectedDate && selectedTime && selectedSlot) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const localParam = selectedSlot.local_id ? `&local=${selectedSlot.local_id}` : "";
      navigate(`/checkout/${medico.id}?data=${selectedDate}&horario=${selectedTime}${localParam}`);
    }
  };

  const visibleDays = getVisibleDays();
  const localPrincipal = locais[0];
  const selectedLocalData = selectedLocal ? locais.find(l => l.id === selectedLocal) : null;

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
                      <button
                        onClick={() => setAvaliacoesModalOpen(true)}
                        className="flex items-center justify-center md:justify-start gap-2 mb-3 hover:opacity-80 transition-opacity cursor-pointer group"
                      >
                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/30 transition-colors">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-foreground">{mediaAvaliacao.toFixed(1)}</span>
                        </div>
                        <span className="text-muted-foreground text-sm underline-offset-2 group-hover:underline">({avaliacoes.length} avaliações)</span>
                      </button>
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

              {/* Locations - Clickable */}
              {locais.length > 0 && (
                <div className="bg-card rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">Locais de Atendimento</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique em um local para ver os horários disponíveis
                  </p>
                  <div className="space-y-3">
                    {/* Option to show all */}
                    <button
                      onClick={() => handleLocalSelect(null)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left ${
                        selectedLocal === null
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                      }`}
                    >
                      <Building2 className={`w-5 h-5 mt-0.5 ${selectedLocal === null ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <p className={`font-medium ${selectedLocal === null ? "text-primary" : "text-foreground"}`}>
                          Todos os locais
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {agendaSlots.length} horário(s) disponível(is)
                        </p>
                      </div>
                      {selectedLocal === null && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>

                    {locais.map((local) => (
                      <button
                        key={local.id}
                        onClick={() => handleLocalSelect(local.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left ${
                          selectedLocal === local.id
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                        }`}
                      >
                        {local.tipo_atendimento === "online" ? (
                          <Video className={`w-5 h-5 mt-0.5 ${selectedLocal === local.id ? "text-primary" : "text-muted-foreground"}`} />
                        ) : (
                          <MapPin className={`w-5 h-5 mt-0.5 ${selectedLocal === local.id ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${selectedLocal === local.id ? "text-primary" : "text-foreground"}`}>
                            {local.nome_local}
                          </p>
                          {local.tipo_atendimento === "online" ? (
                            <p className="text-sm text-muted-foreground">Atendimento Online</p>
                          ) : (
                            <>
                              {local.endereco && <p className="text-sm text-muted-foreground">{local.endereco}</p>}
                              {local.cidade && (
                                <p className="text-sm text-muted-foreground">{local.cidade}/{local.estado}</p>
                              )}
                            </>
                          )}
                          <Badge variant="outline" className="mt-2 text-xs">
                            {slotsPerLocal[local.id] || 0} horário(s) disponível(is)
                          </Badge>
                        </div>
                        {selectedLocal === local.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
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

                {/* Selected Local Info */}
                {selectedLocalData && (
                  <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      {selectedLocalData.tipo_atendimento === "online" ? (
                        <Video className="w-4 h-4 text-primary" />
                      ) : (
                        <MapPin className="w-4 h-4 text-primary" />
                      )}
                      <span className="font-medium text-foreground text-sm">{selectedLocalData.nome_local}</span>
                    </div>
                  </div>
                )}

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
                              setSelectedSlot(null);
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
                      {getSlotsForDate(selectedDate).map((slot) => {
                        const time = format(new Date(slot.data_hora), "HH:mm");
                        const isSelected = selectedSlot?.id === slot.id;
                        const local = getLocalForSlot(slot);
                        return (
                          <button
                            key={slot.id}
                            onClick={() => {
                              setSelectedTime(time);
                              setSelectedSlot(slot);
                            }}
                            className={`
                              py-2 px-3 rounded-lg text-sm font-medium transition-all relative group
                              ${isSelected 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted hover:bg-primary/20 text-foreground"
                              }
                            `}
                            title={local?.nome_local}
                          >
                            {time}
                            {!selectedLocal && local && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" title={local.nome_local} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {getSlotsForDate(selectedDate).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum horário disponível para esta data
                      </p>
                    )}
                  </div>
                )}

                {/* Selected Clinic */}
                {selectedSlot && (
                  <div className="mb-6 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground text-sm">Local da consulta</span>
                    </div>
                    {(() => {
                      const local = getLocalForSlot(selectedSlot);
                      if (!local) return <p className="text-sm text-muted-foreground">Local não encontrado</p>;
                      return (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium text-foreground">{local.nome_local}</p>
                          {local.tipo_atendimento === "online" ? (
                            <p className="flex items-center gap-1">
                              <Video className="w-3 h-3" /> Atendimento Online
                            </p>
                          ) : (
                            <>
                              {local.endereco && <p>{local.endereco}</p>}
                              {local.cidade && <p>{local.cidade}/{local.estado}</p>}
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {filteredSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 mb-4">
                    {selectedLocal 
                      ? "Nenhum horário disponível neste local"
                      : "Este médico ainda não possui horários disponíveis"
                    }
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

      {/* Modal de Avaliações */}
      {medico && (
        <AvaliacoesModal
          open={avaliacoesModalOpen}
          onOpenChange={setAvaliacoesModalOpen}
          medicoId={medico.id}
          medicoNome={medico.nome}
          mediaAvaliacao={mediaAvaliacao}
          totalAvaliacoes={avaliacoes.length}
        />
      )}
    </div>
  );
};

export default PerfilMedico;
