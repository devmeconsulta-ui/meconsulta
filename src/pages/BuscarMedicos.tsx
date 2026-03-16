import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Calendar, ChevronRight, User, Loader2, MessageCircle } from "lucide-react";
import { specialties } from "@/data/brazilData";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Medico {
  id: string;
  nome: string;
  especialidade: string | null;
  foto_url: string | null;
  crm: string | null;
  valor_consulta: number;
  telefone_whatsapp: string | null;
  locais_atendimento: {
    cidade: string | null;
    estado: string | null;
  }[];
  proximo_slot?: string | null;
  slots_disponiveis?: number;
}

const BuscarMedicos = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get("especialidade") || "");
  const [selectedState, setSelectedState] = useState(searchParams.get("estado") || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("cidade") || "");

  // Dynamic locations from database
  const [availableStates, setAvailableStates] = useState<{ sigla: string; nome: string }[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const sortedSpecialties = [...specialties].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const stateNameMapping: Record<string, string> = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
    "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
    "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
    "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
    "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina",
    "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"
  };

  // Fetch locations from database
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await supabase
          .from("locais_atendimento")
          .select("estado, cidade")
          .eq("ativo", true);
        
        if (data) {
          const uniqueStates = [...new Set(data.map(l => l.estado?.toUpperCase()).filter(Boolean))];
          const statesWithNames = uniqueStates
            .map(sigla => ({ sigla: sigla as string, nome: stateNameMapping[sigla as string] || sigla as string }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
          
          setAvailableStates(statesWithNames);
          
          // Store cities by state
          const citiesMap: Record<string, string[]> = {};
          data.forEach(l => {
            const state = l.estado?.toUpperCase();
            if (state && l.cidade) {
              if (!citiesMap[state]) citiesMap[state] = [];
              if (!citiesMap[state].some(c => c.toLowerCase() === l.cidade?.toLowerCase())) {
                citiesMap[state].push(l.cidade);
              }
            }
          });
          (window as any).__citiesByState = citiesMap;
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };
    
    fetchLocations();
  }, []);

  // Update cities when state changes
  useEffect(() => {
    if (selectedState) {
      const citiesFromDB = (window as any).__citiesByState?.[selectedState.toUpperCase()] || [];
      setAvailableCities(citiesFromDB.sort((a: string, b: string) => a.localeCompare(b, 'pt-BR')));
    } else {
      setAvailableCities([]);
    }
  }, [selectedState]);

  // Search doctors
  useEffect(() => {
    searchMedicos();
  }, [selectedSpecialty, selectedCity, selectedState]);

  const searchMedicos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("medicos")
        .select(`
          id,
          nome,
          especialidade,
          foto_url,
          crm,
          valor_consulta,
          telefone_whatsapp,
          locais_atendimento (
            cidade,
            estado
          )
        `)
        .eq("ativo", true);

      if (selectedSpecialty) {
        query = query.ilike("especialidade", `%${selectedSpecialty}%`);
      }

      const { data: medicosData, error } = await query;
      if (error) throw error;

      let filtered = medicosData || [];

      // Filter by state/city
      if (selectedState || selectedCity) {
        filtered = filtered.filter((m) => {
          if (!m.locais_atendimento?.length) return false;
          return m.locais_atendimento.some((l) => {
            const matchState = !selectedState || l.estado?.toUpperCase() === selectedState.toUpperCase();
            const matchCity = !selectedCity || l.cidade?.toLowerCase().includes(selectedCity.toLowerCase());
            return matchState && matchCity;
          });
        });
      }

      // Get slots count and next slot
      const now = new Date();
      const medicoIds = filtered.map(m => m.id);
      
      let slotsMap: Record<string, { count: number; next: string | null }> = {};
      
      if (medicoIds.length > 0) {
        const { data: slotsData } = await supabase
          .from("agenda_slots")
          .select("medico_id, data_hora")
          .in("medico_id", medicoIds)
          .eq("disponivel", true)
          .gte("data_hora", now.toISOString())
          .order("data_hora", { ascending: true });

        slotsData?.forEach(slot => {
          if (!slotsMap[slot.medico_id]) {
            slotsMap[slot.medico_id] = { count: 0, next: slot.data_hora };
          }
          slotsMap[slot.medico_id].count++;
        });
      }

      // Add slots info and filter only those with available slots
      const medicosComSlots = filtered
        .map(m => ({
          ...m,
          slots_disponiveis: slotsMap[m.id]?.count || 0,
          proximo_slot: slotsMap[m.id]?.next || null
        }))
        .filter(m => m.slots_disponiveis > 0)
        .sort((a, b) => b.slots_disponiveis - a.slots_disponiveis);

      setMedicos(medicosComSlots);
    } catch (error) {
      console.error("Error searching doctors:", error);
      setMedicos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedSpecialty) params.set("especialidade", selectedSpecialty);
    if (selectedState) params.set("estado", selectedState);
    if (selectedCity) params.set("cidade", selectedCity);
    setSearchParams(params);
  };

  const formatNextSlot = (dataHora: string | null) => {
    if (!dataHora) return "Sem horários disponíveis";
    try {
      const date = parseISO(dataHora);
      return `Próximo: ${format(date, "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })}`;
    } catch {
      return "Horário disponível";
    }
  };

  const getLocation = (medico: Medico) => {
    const loc = medico.locais_atendimento?.[0];
    if (!loc) return "";
    return `${loc.cidade || ""} - ${loc.estado || ""}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Search Filters */}
      <section className="bg-primary py-8 pt-24">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-6 text-center">
            Encontre seu Médico
          </h1>
          
          <div className="bg-card rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {sortedSpecialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty.toLowerCase()}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedState} onValueChange={(value) => {
                setSelectedState(value);
                setSelectedCity("");
              }}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {availableStates.map((state) => (
                    <SelectItem key={state.sigla} value={state.sigla}>
                      {state.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city.toLowerCase()}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleSearch} className="h-12 text-base font-semibold">
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <p className="text-muted-foreground">
              {loading ? "Buscando..." : (
                <>
                  {medicos.length} {medicos.length === 1 ? "médico encontrado" : "médicos encontrados"}
                  {selectedSpecialty && ` em ${selectedSpecialty}`}
                  {selectedCity && ` - ${selectedCity}`}
                  {selectedState && `, ${stateNameMapping[selectedState] || selectedState}`}
                </>
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {medicos.map((medico) => (
                <Link 
                  key={medico.id} 
                  to={`/medico/${medico.id}`}
                  className="block"
                >
                  <div className="bg-card rounded-2xl p-4 md:p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/30">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Photo */}
                      <div className="flex-shrink-0">
                        {medico.foto_url ? (
                          <img 
                            src={medico.foto_url} 
                            alt={medico.nome}
                            className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover mx-auto md:mx-0"
                          />
                        ) : (
                          <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-muted flex items-center justify-center mx-auto md:mx-0">
                            <User className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-center md:text-left">
                        <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">
                          {medico.nome}
                        </h2>
                        <p className="text-primary font-medium mb-2">{medico.especialidade || "Especialista"}</p>
                        {medico.crm && (
                          <p className="text-sm text-muted-foreground mb-2">{medico.crm}</p>
                        )}

                        {/* Location */}
                        {getLocation(medico) && (
                          <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="w-4 h-4" />
                            <span>{getLocation(medico)}</span>
                          </div>
                        )}

                        {/* Next Available */}
                        <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-primary">
                          <Calendar className="w-4 h-4" />
                          <span>{formatNextSlot(medico.proximo_slot)}</span>
                        </div>
                      </div>

                      {/* Price & CTA */}
                      <div className="flex flex-col items-center md:items-end justify-between">
                        <div className="text-center md:text-right mb-4">
                          <p className="text-sm text-muted-foreground">Consulta</p>
                          <p className="text-2xl font-bold text-foreground">
                            R$ {medico.valor_consulta.toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                        <Button className="w-full md:w-auto gap-2">
                          Ver Perfil
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {medicos.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Nenhum médico encontrado com os filtros selecionados.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Tente ajustar sua busca ou remover alguns filtros.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BuscarMedicos;
