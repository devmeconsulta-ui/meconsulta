import { Button } from "@/components/ui/button";
import professionalBg from "@/assets/professional-bg.png";

const ProfessionalCTASection = () => {
  return (
    <section className="relative">
      {/* Yellow top border */}
      <div className="h-2 bg-secondary" />
      
      {/* Background image section */}
      <div className="relative h-[400px] md:h-[500px] overflow-hidden">
        <img 
          src={professionalBg}
          alt="Profissional da saúde"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Content - only the blue CTA box since text is in image */}
        <div className="container mx-auto px-4 h-full relative z-10">
          <div className="flex items-center justify-end h-full">
            {/* Blue CTA box positioned to match image */}
            <div className="bg-primary rounded-2xl p-6 text-primary-foreground max-w-xs mr-4 md:mr-20">
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
    </section>
  );
};

export default ProfessionalCTASection;
