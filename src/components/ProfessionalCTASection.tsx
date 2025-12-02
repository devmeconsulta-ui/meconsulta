import { Button } from "@/components/ui/button";
import draPage from "@/assets/dra-page.avif";

const ProfessionalCTASection = () => {
  return (
    <section className="relative">
      {/* Yellow top border */}
      <div className="h-2 bg-secondary" />
      
      {/* Background image section */}
      <div className="relative h-[400px] md:h-[500px] overflow-hidden">
        <img 
          src={draPage}
          alt="Profissional da saúde"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay for better text readability on mobile */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/20" />
        
        {/* Content */}
        <div className="container mx-auto px-4 h-full relative z-10">
          <div className="flex items-center justify-end h-full">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 max-w-2xl">
              {/* Left text */}
              <div className="text-primary">
                <h2 className="text-2xl md:text-4xl font-bold mb-2">
                  Também é<br />
                  <span className="text-primary">Profissional</span><br />
                  <span className="text-primary">da Saúde?</span>
                </h2>
                <p className="text-muted-foreground text-lg">
                  Transforme a gestão<br />
                  do seu consultório.
                </p>
              </div>
              
              {/* Blue CTA box */}
              <div className="bg-primary rounded-2xl p-6 text-primary-foreground max-w-xs">
                <p className="text-lg leading-relaxed mb-4">
                  Conecte-se com pacientes, receba agendamentos 24h e aumente sua presença online.
                </p>
                <Button variant="secondary" className="font-semibold">
                  Descubra o<br />MeConsulta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalCTASection;
