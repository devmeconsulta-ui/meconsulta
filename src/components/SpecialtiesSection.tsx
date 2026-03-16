import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, ChevronLeft, ChevronRight } from "lucide-react";

interface Medico {
  id: string;
  nome: string;
  especialidade: string | null;
  foto_url: string | null;
}

const SpecialtiesSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchMedicos();
  }, []);

  async function fetchMedicos() {
    const { data, error } = await supabase
      .from("medicos")
      .select("id, nome, especialidade, foto_url")
      .eq("ativo", true)
      .eq("aparecer_home", true)
      .limit(20);

    if (error) {
      console.error("Error fetching medicos:", error);
      setMedicos([]);
    } else {
      setMedicos(data || []);
    }
    setLoading(false);
  }
  
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev >= medicos.length - 1 ? 0 : prev + 1));
  }, [medicos.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? medicos.length - 1 : prev - 1));
  }, [medicos.length]);

  useEffect(() => {
    if (medicos.length === 0) return;
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [nextSlide, medicos.length]);

  if (loading) {
    return (
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Nossos Especialistas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Profissionais qualificados prontos para cuidar da sua saúde
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  // Se não houver médicos com aparecer_home = true, não mostra a seção
  if (medicos.length === 0) {
    return null;
  }

  return (
    <section id="especialistas" className="py-16 bg-muted overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Nossos Especialistas
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Profissionais qualificados prontos para cuidar da sua saúde
          </p>
        </div>
      </div>

      <div className="relative px-4">
        {/* Left Arrow */}
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-card shadow-lg border border-border rounded-full p-2 hover:bg-accent transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-card shadow-lg border border-border rounded-full p-2 hover:bg-accent transition-colors"
          aria-label="Próximo"
        >
          <ChevronRight className="h-6 w-6 text-foreground" />
        </button>

        <div className="overflow-hidden mx-8">
          <div 
            className="flex gap-4 transition-transform duration-700 ease-out"
            style={{ 
              transform: `translateX(-${currentIndex * (100 / 4)}%)`
            }}
          >
            {medicos.map((medico, index) => {
              const href = `/medico/${medico.id}`;
              
              return (
                <Link 
                  key={`${medico.id}-${index}`}
                  to={href}
                  className="flex-shrink-0 w-[280px] sm:w-[300px] cursor-pointer"
                >
                  <div className="bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                    <div className="aspect-square overflow-hidden bg-muted">
                      {medico.foto_url ? (
                        <img 
                          src={medico.foto_url} 
                          alt={medico.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-24 h-24 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-semibold text-foreground mb-1">{medico.nome}</h3>
                      <p className="text-sm text-primary font-medium mb-3">{medico.especialidade || "Especialista"}</p>
                      <span className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                        Marcar Consulta
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {medicos.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {medicos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentIndex % medicos.length === index 
                  ? 'bg-primary w-6' 
                  : 'bg-primary/30 hover:bg-primary/50'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default SpecialtiesSection;
