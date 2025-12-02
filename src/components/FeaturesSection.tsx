import { Lock, Stethoscope, MonitorSmartphone } from "lucide-react";
import quadro01 from "@/assets/quadro-01.avif";
import quadro02 from "@/assets/quadro-02.avif";
import quadro03 from "@/assets/quadro-03.avif";

const FeaturesSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Card 1 - Sem Mensalidade */}
          <div className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in bg-card">
            {/* Image top */}
            <div className="relative h-48">
              <img 
                src={quadro01} 
                alt="Sem mensalidade"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Blue content bottom */}
            <div className="bg-hero p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-hero-dark/30 rounded-lg flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary-foreground mb-2">
                    Sem Mensalidade,<br />Sem Complicação
                  </h3>
                  <p className="text-primary-foreground/80 text-sm leading-relaxed">
                    Desfrute da nossa plataforma sem pagar mensalidades ou contratos. Simples assim!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 - Todos os Especialistas */}
          <div className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in bg-card" style={{ animationDelay: '0.2s' }}>
            {/* Light blue content top */}
            <div className="bg-sky-400 p-6 text-center">
              <Stethoscope className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold text-primary mb-2">
                Todos os<br />Especialistas<br />em Um Só Lugar
              </h3>
              <p className="text-primary/80 text-sm leading-relaxed">
                Encontre rapidamente o profissional que você precisa, com total praticidade!
              </p>
            </div>
            {/* Image bottom */}
            <div className="relative h-48">
              <img 
                src={quadro02} 
                alt="Especialistas"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Card 3 - Tecnologia */}
          <div className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in bg-card" style={{ animationDelay: '0.4s' }}>
            {/* Image top */}
            <div className="relative h-48">
              <img 
                src={quadro03} 
                alt="Tecnologia"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Dark blue content bottom */}
            <div className="bg-primary p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                  <MonitorSmartphone className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary-foreground mb-2">
                    Tecnologia que<br />cuida de você
                  </h3>
                  <p className="text-primary-foreground/80 text-sm leading-relaxed">
                    Agende, pague e consulte com segurança e inovação. Tudo em poucos cliques!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
