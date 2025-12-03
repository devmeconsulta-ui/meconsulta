import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ContactSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-secondary mb-4">
            Ficou com alguma dúvida?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Entre em contato conosco através dos<br />
            <span className="text-primary">canais de atendimento</span> que ficaremos<br />
            felizes em te atender.
          </p>
        </div>

        {/* Form */}
        <form className="grid md:grid-cols-2 gap-6">
          {/* Left - Input fields */}
          <div className="space-y-4">
            <Input 
              placeholder="Nome" 
              className="h-12 rounded-none border-0 border-b border-border bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0"
            />
            <Input 
              type="email" 
              placeholder="E-mail" 
              className="h-12 rounded-none border-0 border-b border-border bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0"
            />
            <Input 
              type="tel" 
              placeholder="Telefone" 
              className="h-12 rounded-none border-0 border-b border-border bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0"
            />
          </div>

          {/* Right - Textarea */}
          <div>
            <Textarea 
              placeholder="Mensagem" 
              className="h-full min-h-[180px] rounded-none border-0 border-b border-border bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2 flex justify-center mt-6">
            <Button 
              type="submit"
              variant="outline" 
              className="rounded-full px-12 py-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              Enviar
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ContactSection;
