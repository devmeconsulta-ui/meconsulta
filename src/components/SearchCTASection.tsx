import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, MapPin, User, Calendar } from "lucide-react";
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

const SearchCTASection = () => {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      setMedicos(data || []);
      setShowResults(true);

      if (!data || data.length === 0) {
        toast.info("Nenhum médico encontrado no momento");
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
      <section id="especialistas" className="py-20 bg-primary relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/10 rounded-full blur-2xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Encontrar meu especialista
            </h2>
            <p className="text-primary-foreground/80 mb-8">
              Procure o especialista mais perto de você e agende sua consulta.
            </p>
            <Button 
              variant="secondary" 
              size="xl"
              className="gap-2 font-semibold"
              onClick={handleSearch}
              disabled={isSearching}
            >
              <Search className="w-5 h-5" />
              {isSearching ? "Buscando..." : "Pesquisar"}
            </Button>
          </div>
        </div>
      </section>

      {/* Results Modal */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center">
              {medicos.length > 0 
                ? `${medicos.length} especialista${medicos.length > 1 ? 's' : ''} disponíve${medicos.length > 1 ? 'is' : 'l'}`
                : "Nenhum resultado"
              }
            </DialogTitle>
          </DialogHeader>

          {medicos.length > 0 ? (
            <div className="py-2">
              <Carousel
                opts={{
                  align: "center",
                  loop: medicos.length > 1,
                }}
                className="w-full mx-auto max-w-[280px] sm:max-w-sm"
              >
                <CarouselContent>
                  {medicos.map((medico) => (
                    <CarouselItem key={medico.id} className="basis-full">
                      <Card className="overflow-hidden border-border/50">
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
                                <User className="w-10 h-10 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>

                          {/* Doctor Info */}
                          <div className="p-3 sm:p-4 space-y-1.5">
                            <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
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
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{medico.locais_atendimento[0].cidade}, {medico.locais_atendimento[0].estado}</span>
                              </p>
                            )}

                            <div className="pt-1 flex items-center justify-between">
                              <span className="text-base sm:text-lg font-bold text-primary">
                                R$ {medico.valor_consulta.toFixed(2).replace(".", ",")}
                              </span>
                            </div>

                            <Button 
                              className="w-full mt-2 text-sm"
                              size="sm"
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
                    <CarouselPrevious className="-left-3 h-8 w-8" />
                    <CarouselNext className="-right-3 h-8 w-8" />
                  </>
                )}
              </Carousel>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum médico disponível no momento.</p>
              <p className="text-sm mt-2">Por favor, tente novamente mais tarde.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SearchCTASection;
