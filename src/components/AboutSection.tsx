import { Target, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Target,
    title: "Missão",
    description: "Nossa missão é proporcionar uma experiência eficiente de cuidado com a saúde que seja livre de complicações e preocupações, permitindo que você cuide de si mesmo de maneira fácil em qualquer lugar do Brasil."
  },
  {
    icon: Eye,
    title: "Visão",
    description: "Nos dedicamos a ser a referência em facilitação de acesso aos serviços médicos ambulatoriais. Nossa plataforma digital é projetada para oferecer uma experiência de usuário excepcional."
  },
  {
    icon: Heart,
    title: "Valores",
    description: "No meconsulta, priorizamos o respeito por todos os envolvidos, a transparência em cada transação, a excelência na entrega de serviços e a segurança dos nossos usuários."
  }
];

const AboutSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="text-primary">O que é</span><br />
              <span className="text-secondary">o Meconsulta</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Facilitar o trabalho do médico, com segurança e agilidade, é essencial. 
              O meconsulta acredita e investe em recursos tecnológicos de suporte 
              à tomada de decisão clínica, que agilizam a rotina médica e melhoram 
              o atendimento de saúde para a sociedade!
            </p>

            <div className="space-y-6">
              {values.map((value, index) => (
                <div 
                  key={index} 
                  className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <value.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{value.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="hero" size="xl" className="mt-8">
              Fale conosco
            </Button>
          </div>

          {/* Right - Image */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=700&fit=crop"
                alt="Médico profissional"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-secondary rounded-full opacity-80" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-primary rounded-full opacity-60" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
