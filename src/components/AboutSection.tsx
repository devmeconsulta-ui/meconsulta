import { Lightbulb, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import doctorAbout from "@/assets/doctor-about.png";

const values = [
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
    <section className="bg-background relative pb-0">
      <div className="container mx-auto px-4 pt-16 lg:pt-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
          {/* Left - Content */}
          <div className="pb-16 lg:pb-24">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 italic">
              <span className="text-primary">O que é</span><br />
              <span className="text-primary">o Meconsulta</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-8 leading-relaxed max-w-lg">
              Facilitar o trabalho do médico, com segurança e agilidade, é essencial. O meconsulta 
              acredita e investe em recursos tecnológicos de suporte 
              à tomada de decisão clínica, que agilizam a rotina médica e melhoram 
              o atendimento de saúde para a sociedade em qualquer lugar do Brasil.
            </p>

            <div className="space-y-6">
              {values.map((value, index) => (
                <div 
                  key={index} 
                  className="flex gap-4 animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 ${value.iconBg} rounded-full flex items-center justify-center`}>
                    <value.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${value.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary mb-1 text-sm sm:text-base">{value.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="lg" className="mt-8 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground text-sm sm:text-base">
              Fale conosco
            </Button>
          </div>

          {/* Right - Image positioned to touch yellow border */}
          <div className="relative flex justify-end items-end">
            <img 
              src={doctorAbout}
              alt="Médico profissional"
              className="w-full max-w-sm lg:max-w-md h-auto object-contain relative z-10"
            />
          </div>
        </div>
      </div>
      
      {/* Yellow border that touches the doctor image */}
      <div className="h-2 bg-secondary w-full" />
    </section>
  );
};

export default AboutSection;