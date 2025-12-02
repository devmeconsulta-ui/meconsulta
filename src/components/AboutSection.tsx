import { Target, Lightbulb, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import doctorAbout from "@/assets/doctor-about.png";

const values = [
  {
    icon: Target,
    title: "Missão",
    description: "Nossa missão é proporcionar uma experiência eficiente de cuidado com a saúde que seja livre de complicações e preocupações, permitindo que você cuide de si mesmo de maneira fácil em qualquer lugar do Brasil.",
    iconBg: "bg-primary/10",
    iconColor: "text-primary"
  },
  {
    icon: Lightbulb,
    title: "Visão",
    description: "Nos dedicamos a ser a referência em facilitação de acesso aos serviços médicos ambulatoriais. Nossa plataforma digital é projetada para oferecer uma experiência de usuário excepcional, conectando pacientes a uma ampla gama de profissionais de saúde em diversas especialidades, com preço acessível.",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-500"
  },
  {
    icon: CheckCircle,
    title: "Valores",
    description: "No meconsulta, priorizamos o respeito por todos os envolvidos, a transparência em cada transação, a excelência na entrega de serviços e a segurança dos nossos usuários em cada interação.",
    iconBg: "bg-primary/10",
    iconColor: "text-primary"
  }
];

const AboutSection = () => {
  return (
    <section className="py-20 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Left - Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 italic">
              <span className="text-primary">O que é</span><br />
              <span className="text-primary">o Meconsulta</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Facilitar o trabalho do médico, com segurança e agilidade, é essencial. O meconsulta 
              acredita e investe em recursos tecnológicos de suporte 
              à tomada de decisão clínica, que agilizam a rotina médica e melhoram 
              o atendimento de saúde para a sociedade!
            </p>

            <div className="space-y-6">
              {values.map((value, index) => (
                <div 
                  key={index} 
                  className="flex gap-4 animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className={`flex-shrink-0 w-12 h-12 ${value.iconBg} rounded-full flex items-center justify-center`}>
                    <value.icon className={`w-6 h-6 ${value.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary mb-1">{value.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="lg" className="mt-8 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Fale conosco
            </Button>
          </div>

          {/* Right - Image with yellow shape */}
          <div className="relative">
            {/* Yellow shape with M pattern behind */}
            <div className="absolute -top-8 -right-8 w-64 h-64 lg:w-80 lg:h-80">
              <div className="relative w-full h-full bg-secondary rounded-full flex items-center justify-center">
                {/* M hands pattern */}
                <svg width="140" height="140" viewBox="0 0 180 180" className="absolute">
                  {/* Sun rays */}
                  <line x1="90" y1="10" x2="90" y2="30" stroke="#1a4a7c" strokeWidth="8" strokeLinecap="round" />
                  <line x1="50" y1="25" x2="60" y2="42" stroke="#1a4a7c" strokeWidth="8" strokeLinecap="round" />
                  <line x1="130" y1="25" x2="120" y2="42" stroke="#1a4a7c" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* M hands shape */}
                  <path 
                    d="M 45 160 L 45 90 Q 45 70 65 70 Q 85 70 85 90 L 85 110 Q 85 95 90 95 Q 95 95 95 110 L 95 90 Q 95 70 115 70 Q 135 70 135 90 L 135 160" 
                    stroke="#1a4a7c" 
                    strokeWidth="14"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            
            {/* Doctor image */}
            <div className="relative z-10">
              <img 
                src={doctorAbout}
                alt="Médico profissional"
                className="w-full h-auto max-w-md mx-auto lg:mx-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
