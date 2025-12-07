import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Briefcase, MapPin, Star, ChevronLeft, ChevronRight, X, Calendar, User } from "lucide-react";
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
import { specialties, brazilStates, citiesByState } from "@/data/brazilData";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

  const cities = selectedState ? citiesByState[selectedState] || [] : [];

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedCity("");
  };

  const handleSearch = async () => {
    if (!searchTerm && !selectedSpecialty && !selectedState && !selectedCity) {
      toast.error("Informe pelo menos um critério de busca");
      return;
    }

    setIsSearching(true);
    try {
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

      const { data, error } = await query;

      if (error) throw error;

      // Filtrar por estado/cidade se selecionados
      let filteredData = data || [];
      
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

      setMedicos(filteredData);
      setShowResults(true);

      if (filteredData.length === 0) {
        toast.info("Nenhum médico encontrado com os critérios informados");
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
                  Encontrar especialista
                </h2>
                
                <div className="space-y-3">
                  {/* Doctor Name Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <Input 
                      placeholder="Procurar por nome do médico..." 
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
                        {specialties.map((specialty) => (
                          <SelectItem key={specialty} value={specialty.toLowerCase()}>
                            {specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Selects */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                      <Select value={selectedState} onValueChange={handleStateChange}>
                        <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30 text-sm">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {brazilStates.map((state) => (
                            <SelectItem key={state.sigla} value={state.sigla}>
                              {state.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                      <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                        <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30 text-sm">
                          <SelectValue placeholder="Cidade" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {cities.map((city) => (
                            <SelectItem key={city} value={city.toLowerCase()}>
                              {city}
                            </SelectItem>
                          ))}
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
                <p className="text-primary-foreground/90 text-lg lg:text-xl mb-1">Acesse</p>
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-secondary mb-3">
                  profissionais
                </h1>
                <p className="text-lg lg:text-xl xl:text-2xl text-primary-foreground font-medium leading-relaxed">
                  qualificados sem<br />
                  mensalidades<br />
                  ou burocracia.
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {medicos.length > 0 
                ? `${medicos.length} especialista${medicos.length > 1 ? 's' : ''} encontrado${medicos.length > 1 ? 's' : ''}`
                : "Nenhum resultado"
              }
            </DialogTitle>
          </DialogHeader>

          {medicos.length > 0 ? (
            <div className="px-8 py-4">
              <Carousel
                opts={{
                  align: "start",
                  loop: medicos.length > 1,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {medicos.map((medico) => (
                    <CarouselItem key={medico.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                      <Card className="overflow-hidden h-full border-border/50 hover:border-primary/50 transition-colors">
                        <CardContent className="p-0">
                          {/* Doctor Image */}
                          <div className="aspect-square relative bg-muted">
                            {medico.foto_url ? (
                              <img
                                src={medico.foto_url}
                                alt={medico.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-20 h-20 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>

                          {/* Doctor Info */}
                          <div className="p-4 space-y-2">
                            <h3 className="font-semibold text-foreground line-clamp-1">
                              {medico.nome}
                            </h3>
                            
                            {medico.especialidade && (
                              <p className="text-sm text-primary font-medium">
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
                                <MapPin className="w-3 h-3" />
                                {medico.locais_atendimento[0].cidade}, {medico.locais_atendimento[0].estado}
                              </p>
                            )}

                            <div className="pt-2 flex items-center justify-between">
                              <span className="text-lg font-bold text-primary">
                                R$ {medico.valor_consulta.toFixed(2).replace(".", ",")}
                              </span>
                            </div>

                            <Button 
                              className="w-full mt-2"
                              onClick={() => handleViewProfile(medico.id)}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Ver Perfil
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {medicos.length > 1 && (
                  <>
                    <CarouselPrevious className="-left-4" />
                    <CarouselNext className="-right-4" />
                  </>
                )}
              </Carousel>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum médico encontrado com os critérios informados.</p>
              <p className="text-sm mt-2">Tente buscar com outros filtros.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HeroSection;