import { Users } from "lucide-react";
import quadro01 from "@/assets/quadro-01.avif";
import quadro02 from "@/assets/quadro-02.avif";
import quadro03 from "@/assets/quadro-03.avif";

const FeaturesSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Image 1 */}
          <div 
            className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in"
            style={{ animationDelay: '0s' }}
          >
            <div className="relative h-80 group">
              <img 
                src={quadro01} 
                alt="Segurança de dados"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>

          {/* Text Card */}
          <div 
            className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="bg-primary h-full p-8 flex flex-col justify-center text-center min-h-[320px]">
              <Users className="w-12 h-12 text-primary-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-secondary mb-3">
                Todos os Especialistas em Um Só Lugar
              </h3>
              <p className="text-primary-foreground/90 text-sm leading-relaxed">
                Encontre rapidamente o profissional que você precisa, com total praticidade!
              </p>
            </div>
          </div>

          {/* Image 2 */}
          <div 
            className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="relative h-80 group">
              <img 
                src={quadro02} 
                alt="Consulta online"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
        </div>

        {/* Additional row with quadro03 */}
        <div className="max-w-5xl mx-auto mt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div 
              className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in md:col-start-2"
              style={{ animationDelay: '0.6s' }}
            >
              <div className="relative h-80 group">
                <img 
                  src={quadro03} 
                  alt="Atendimento humanizado"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
