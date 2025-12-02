import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const SearchCTASection = () => {
  return (
    <section id="especialistas" className="py-20 bg-primary relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/10 rounded-full blur-2xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Encontrar meu especialista
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Procure o especialista mais perto de você e agende sua consulta.
          </p>
          <Button 
            variant="secondary" 
            size="xl"
            className="gap-2 font-semibold"
          >
            <Search className="w-5 h-5" />
            Pesquisar
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SearchCTASection;
