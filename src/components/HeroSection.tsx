import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Briefcase, MapPin, Star, ChevronLeft, ChevronRight, X, Calendar, User, Locate, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import doctorImage from "@/assets/dra-page.png";
import seloImage from "@/assets/selo.png";
import heroBg from "@/assets/hero-background.png";
import { specialties } from "@/data/brazilData";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { parseISO, isAfter } from "date-fns";

interface Medico {
  id: string;
  nome: string;
  especialidade: string | null;
  foto_url: string | null;
  bio: string | null;
  valor_consulta: number;
  crm: string | null;
  locais_atendimento?: {
    cidade: string | null;
    estado: string | null;
  }[];
  slots_disponiveis?: number;
}

const HeroSection = () => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  
  // Dynamic states and cities from database
  const [availableStates, setAvailableStates] = useState<{ sigla: string; nome: string }[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  // Sorted specialties alphabetically
  const sortedSpecialties = [...specialties].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  
  // Sempre mostrar apenas médicos com agenda disponível
  const medicosFiltrados = medicos.filter(m => m.slots_disponiveis && m.slots_disponiveis > 0);

  // State to state name mapping
  const stateNameMapping: Record<string, string> = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
    "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
    "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
    "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
    "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina",
    "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"
  };

  // Fetch available states and cities from database
  // Helper to normalize state input to standard abbreviation
  const normalizeStateAbbreviation = (input: string | null): string | null => {
    if (!input) return null;
    const trimmed = input.trim().toUpperCase();
    
    // Already an abbreviation
    if (stateNameMapping[trimmed]) return trimmed;
    
    // Full state name - find the abbreviation
    const entry = Object.entries(stateNameMapping).find(
      ([, nome]) => nome.toUpperCase() === trimmed
    );
    return entry ? entry[0] : null;
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from("locais_atendimento")
          .select("estado, cidade")
          .eq("ativo", true);
        
        if (error) throw error;
        
        // Normalize and get unique states
        const normalizedStates = data?.map(l => normalizeStateAbbreviation(l.estado)).filter(Boolean) || [];
        const uniqueStates = [...new Set(normalizedStates)];
        const statesWithNames = uniqueStates
          .map(sigla => ({ sigla: sigla as string, nome: stateNameMapping[sigla as string] || sigla as string }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        
        setAvailableStates(statesWithNames);
        
        // Store all cities by state for filtering (normalized)
        const citiesByStateMap: Record<string, string[]> = {};
        data?.forEach(l => {
          const normalizedState = normalizeStateAbbreviation(l.estado);
          if (normalizedState && l.cidade) {
            const cityNormalized = l.cidade.trim();
            if (!citiesByStateMap[normalizedState]) citiesByStateMap[normalizedState] = [];
            // Avoid duplicates (case-insensitive)
            if (!citiesByStateMap[normalizedState].some(c => c.toLowerCase() === cityNormalized.toLowerCase())) {
              citiesByStateMap[normalizedState].push(cityNormalized);
            }
          }
        });
        
        // Store in state for use when selecting
        (window as any).__citiesByStateFromDB = citiesByStateMap;
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };
    
    fetchLocations();
  }, []);

  // Update cities when state changes
  useEffect(() => {
    if (selectedState) {
      const citiesFromDB = (window as any).__citiesByStateFromDB?.[selectedState.toUpperCase()] || [];
      setAvailableCities(citiesFromDB.sort((a: string, b: string) => a.localeCompare(b, 'pt-BR')));
    } else {
      setAvailableCities([]);
    }
  }, [selectedState]);

  // Não chamar geolocalização automaticamente em mobile (bloqueado por segurança)
  // O usuário deve clicar no botão de localização para ativar

  const requestGeolocation = async () => {
    if (!navigator.geolocation) {
      console.log("Geolocalização não suportada");
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Usar API de geocoding reverso para obter cidade/estado
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.address;
            
            // Mapear o estado para sigla
            const stateMapping: Record<string, string> = {
              "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
              "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
              "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
              "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
              "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
              "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
              "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO"
            };
            
            const stateName = address.state;
            const cityName = address.city || address.town || address.municipality;
            
            if (stateName && stateMapping[stateName]) {
              setSelectedState(stateMapping[stateName]);
              setLocationDetected(true);
              
              // Verificar se a cidade está disponível no banco
              const citiesFromDB = (window as any).__citiesByStateFromDB?.[stateMapping[stateName]] || [];
              
              if (cityName) {
                const matchedCity = citiesFromDB.find(
                  (c: string) => c.toLowerCase() === cityName.toLowerCase()
                );
                if (matchedCity) {
                  setSelectedCity(matchedCity.toLowerCase());
                }
              }
              
              toast.success(`Localização detectada: ${cityName || stateName}`);
            }
          }
        } catch (error) {
          console.error("Erro ao obter localização:", error);
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.log("Usuário negou geolocalização ou erro:", error.message);
        setIsGettingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedCity("");
    setLocationDetected(false);
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // Buscar médicos ativos
      let query = supabase
        .from("medicos")
        .select(`
          id,
          nome,
          especialidade,
          foto_url,
          bio,
          valor_consulta,
          crm,
          locais_atendimento (
            id,
            cidade,
            estado
          )
        `)
        .eq("ativo", true);

      if (searchTerm) {
        query = query.ilike("nome", `%${searchTerm}%`);
      }

      if (selectedSpecialty) {
        query = query.ilike("especialidade", `%${selectedSpecialty}%`);
      }

      const { data: medicosData, error } = await query;

      if (error) throw error;

      let filteredData = medicosData || [];
      
      // Filtrar por estado/cidade se selecionados
      if (selectedState || selectedCity) {
        filteredData = filteredData.filter((medico) => {
          if (!medico.locais_atendimento || medico.locais_atendimento.length === 0) {
            return false;
          }
          return medico.locais_atendimento.some((local) => {
            const matchState = !selectedState || local.estado?.toLowerCase() === selectedState.toLowerCase();
            const matchCity = !selectedCity || local.cidade?.toLowerCase().includes(selectedCity.toLowerCase());
            return matchState && matchCity;
          });
        });
      }

      // Buscar quantidade de slots disponíveis por médico
      const now = new Date();
      const medicoIds = filteredData.map(m => m.id);
      
      let slotsCountMap: Record<string, number> = {};
      
      if (medicoIds.length > 0) {
        const { data: slotsData } = await supabase
          .from("agenda_slots")
          .select("medico_id")
          .in("medico_id", medicoIds)
          .eq("disponivel", true)
          .gte("data_hora", now.toISOString());

        // Contar slots por médico
        slotsData?.forEach(slot => {
          slotsCountMap[slot.medico_id] = (slotsCountMap[slot.medico_id] || 0) + 1;
        });
      }

      // Adicionar contagem de slots e ordenar (com agenda primeiro)
      const medicosComSlots = filteredData.map(m => ({
        ...m,
        slots_disponiveis: slotsCountMap[m.id] || 0
      })).sort((a, b) => b.slots_disponiveis - a.slots_disponiveis);

      setMedicos(medicosComSlots);
      setShowResults(true);

      if (medicosComSlots.length === 0) {
        toast.info("Nenhum médico encontrado na região");
      }
    } catch (error) {
      console.error("Erro ao buscar médicos:", error);
      toast.error("Erro ao buscar médicos");
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewProfile = (medicoId: string) => {
    setShowResults(false);
    navigate(`/medico/${medicoId}`);
  };

  return (
    <>
      <section 
        className="relative overflow-hidden pt-20"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: 'hsl(214, 100%, 35%)'
        }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-end min-h-[580px] lg:min-h-[650px]">
            {/* Left Column - Search Form */}
            <div className="lg:col-span-4 order-2 lg:order-1 pb-12 lg:pb-16">
              <div className="bg-card rounded-2xl p-6 shadow-xl max-w-md mx-auto lg:mx-0">
                <h2 className="text-lg font-semibold text-foreground mb-5 text-center">
                  Encontre seu médico
                </h2>
                
                <div className="space-y-3">
                  {/* Doctor Name Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <Input 
                      placeholder="Procurar pelo nome do médico" 
                      className="pl-10 h-11 rounded-lg border-border bg-muted/30"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>

                  {/* Specialty Select */}
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary z-10" />
                    <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                      <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30">
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
                  </div>

                  {/* Local da consulta label */}
                  <p className="text-sm font-medium text-muted-foreground pt-1">Local da consulta</p>

                  {/* Location Selects */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                        <Select value={selectedState} onValueChange={handleStateChange}>
                          <SelectTrigger className={`pl-10 h-11 rounded-lg border-border bg-muted/30 text-sm ${locationDetected ? 'border-green-500' : ''}`}>
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 bg-background z-50">
                            {availableStates.length > 0 ? (
                              availableStates.map((state) => (
                                <SelectItem key={state.sigla} value={state.sigla}>
                                  {state.nome}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="MG">Minas Gerais</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={`h-11 w-11 shrink-0 ${locationDetected ? 'border-green-500 text-green-600' : ''}`}
                        onClick={requestGeolocation}
                        disabled={isGettingLocation}
                        title="Usar minha localização"
                      >
                        {isGettingLocation ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Locate className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                      <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                        <SelectTrigger className={`pl-10 h-11 rounded-lg border-border bg-muted/30 text-sm ${locationDetected && selectedCity ? 'border-green-500' : ''}`}>
                          <SelectValue placeholder="Cidade" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-background z-50">
                          {availableCities.length > 0 ? (
                            availableCities.map((city) => (
                              <SelectItem key={city} value={city.toLowerCase()}>
                                {city}
                              </SelectItem>
                            ))
                          ) : selectedState ? (
                            <SelectItem value="montes claros">Montes Claros</SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search Button */}
                  <Button 
                    className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 font-medium"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Center Column - Hero Text + Selo */}
            <div className="lg:col-span-4 order-1 lg:order-2 text-center lg:text-left flex flex-col items-center lg:items-start pb-12 lg:pb-16">
              <div className="mb-6">
                <p className="text-primary-foreground/90 text-lg lg:text-xl mb-1">Marque aqui sua</p>
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-secondary mb-3">
                  consulta médica
                </h1>
                <p className="text-lg lg:text-xl xl:text-2xl text-primary-foreground font-medium leading-relaxed">
                  sem mensalidades<br />
                  sem burocracia
                </p>
              </div>

              {/* Selo Image */}
              <img 
                src={seloImage} 
                alt="Consulta 100% Segura e Garantida - Saúde e Facilidade sem nenhuma Mensalidade"
                className="w-28 lg:w-32 h-auto"
              />
            </div>

            {/* Right Column - Doctor Image */}
            <div className="hidden lg:flex lg:col-span-4 order-3 justify-end items-end">
              <img 
                src={doctorImage}
                alt="Médica profissional"
                className="h-[550px] xl:h-[620px] w-auto object-contain object-bottom"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Results Modal */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] p-0 overflow-hidden">
          <div className="p-4 sm:p-6 border-b">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-center">
                {medicosFiltrados.length > 0 
                  ? `${medicosFiltrados.length} especialista${medicosFiltrados.length > 1 ? 's' : ''} encontrado${medicosFiltrados.length > 1 ? 's' : ''}`
                  : "Nenhum resultado"
                }
              </DialogTitle>
            </DialogHeader>

          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-4 sm:p-6">
            {medicosFiltrados.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {medicosFiltrados.map((medico) => (
                  <Card key={medico.id} className="overflow-hidden border-border/50 hover:border-primary/50 transition-colors">
                    <CardContent className="p-0">
                      {/* Doctor Image */}
                      <div className="h-28 sm:h-32 relative bg-muted">
                        {medico.foto_url ? (
                          <img
                            src={medico.foto_url}
                            alt={medico.nome}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50" />
                          </div>
                        )}
                        {/* Badge de disponibilidade */}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                          medico.slots_disponiveis && medico.slots_disponiveis > 0
                            ? 'bg-green-500 text-white'
                            : 'bg-muted-foreground/80 text-white'
                        }`}>
                          {medico.slots_disponiveis && medico.slots_disponiveis > 0
                            ? `${medico.slots_disponiveis} horário${medico.slots_disponiveis > 1 ? 's' : ''}`
                            : 'Sem agenda'
                          }
                        </div>
                      </div>

                      {/* Doctor Info */}
                      <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                        <h3 className="font-semibold text-foreground line-clamp-1 text-sm sm:text-base">
                          {medico.nome}
                        </h3>
                        
                        {medico.especialidade && (
                          <p className="text-xs sm:text-sm text-primary font-medium">
                            {medico.especialidade}
                          </p>
                        )}

                        {medico.crm && (
                          <p className="text-xs text-muted-foreground">
                            CRM: {medico.crm}
                          </p>
                        )}

                        {medico.locais_atendimento && medico.locais_atendimento.length > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{medico.locais_atendimento[0].cidade}, {medico.locais_atendimento[0].estado}</span>
                          </p>
                        )}

                        <div className="pt-1 sm:pt-2 flex items-center justify-between">
                          <span className="text-base sm:text-lg font-bold text-primary">
                            R$ {medico.valor_consulta.toFixed(2).replace(".", ",")}
                          </span>
                        </div>

                        <Button 
                          className="w-full mt-2 h-9 sm:h-10 text-sm"
                          onClick={() => handleViewProfile(medico.id)}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Ver Perfil
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum médico encontrado com os critérios informados.</p>
                <p className="text-sm mt-2">Tente buscar com outros filtros.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HeroSection;