import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ContactSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left - Image & Text */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-secondary">Descubra o MeConsulta</span>
            </h2>
            <h3 className="text-xl text-foreground mb-6">
              Ficou com alguma dúvida?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Entre em contato conosco através dos
              canais de atendimento que ficaremos
              felizes em te atender.
            </p>

            {/* Decorative image placeholder */}
            <div className="mt-8 hidden lg:block">
              <img 
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop"
                alt="Atendimento médico"
                className="rounded-2xl shadow-lg"
              />
            </div>
          </div>

          {/* Right - Contact Form */}
          <div className="bg-card rounded-2xl p-8 shadow-xl">
            <form className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input 
                  placeholder="Nome" 
                  className="h-12 rounded-xl"
                />
                <Input 
                  type="email" 
                  placeholder="E-mail" 
                  className="h-12 rounded-xl"
                />
              </div>
              <Input 
                placeholder="Assunto" 
                className="h-12 rounded-xl"
              />
              <Textarea 
                placeholder="Mensagem" 
                className="min-h-[120px] rounded-xl resize-none"
              />
              <Button variant="hero" size="lg" className="w-full">
                Enviar
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
