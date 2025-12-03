import { Button } from "@/components/ui/button";
import { Search, Briefcase, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import doctorImage from "@/assets/dra-page.png";
import seloImage from "@/assets/selo.png";
import heroBg from "@/assets/hero-background.png";

const HeroSection = () => {
  return (
    <section 
      className="relative overflow-hidden pt-20"
      style={{
        backgroundImage: `url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'hsl(214, 100%, 35%)'
      }}
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-end min-h-[580px] lg:min-h-[650px]">
          {/* Left Column - Search Form */}
          <div className="lg:col-span-4 order-2 lg:order-1 pb-12 lg:pb-16">
            <div className="bg-card rounded-2xl p-6 shadow-xl max-w-md mx-auto lg:mx-0">
              <h2 className="text-lg font-semibold text-foreground mb-5 text-center">
                Encontrar especialista
              </h2>
              
              <div className="space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                  <Input 
                    placeholder="Procurar por..." 
                    className="pl-10 h-11 rounded-lg border-border bg-muted/30"
                  />
                </div>

                {/* Specialty Select */}
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary z-10" />
                  <Select>
                    <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30">
                      <SelectValue placeholder="Carregando..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiologia">Cardiologia</SelectItem>
                      <SelectItem value="dermatologia">Dermatologia</SelectItem>
                      <SelectItem value="ginecologia">Ginecologia</SelectItem>
                      <SelectItem value="ortopedia">Ortopedia</SelectItem>
                      <SelectItem value="pediatria">Pediatria</SelectItem>
                      <SelectItem value="psiquiatria">Psiquiatria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Selects */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Select>
                      <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30 text-sm">
                        <SelectValue placeholder="Carregando..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mg">Minas Gerais</SelectItem>
                        <SelectItem value="sp">São Paulo</SelectItem>
                        <SelectItem value="rj">Rio de Janeiro</SelectItem>
                        <SelectItem value="ba">Bahia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Select>
                      <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30 text-sm">
                        <SelectValue placeholder="Carregando..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bh">Belo Horizonte</SelectItem>
                        <SelectItem value="mc">Montes Claros</SelectItem>
                        <SelectItem value="ub">Uberlândia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Button */}
                <Button className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 font-medium">
                  Buscar
                </Button>
              </div>
            </div>
          </div>

          {/* Center Column - Hero Text + Selo */}
          <div className="lg:col-span-4 order-1 lg:order-2 text-center lg:text-left flex flex-col items-center lg:items-start pb-12 lg:pb-16">
            <div className="mb-6">
              <p className="text-primary-foreground/90 text-lg lg:text-xl mb-1">Acesse</p>
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-secondary mb-3">
                profissionais
              </h1>
              <p className="text-lg lg:text-xl xl:text-2xl text-primary-foreground font-medium leading-relaxed">
                qualificados sem<br />
                mensalidades<br />
                ou burocracia.
              </p>
            </div>

            {/* Selo Image */}
            <img 
              src={seloImage} 
              alt="Consulta 100% Segura e Garantida - Saúde e Facilidade sem nenhuma Mensalidade"
              className="w-28 lg:w-32 h-auto"
            />
          </div>

          {/* Right Column - Doctor Image */}
          <div className="hidden lg:flex lg:col-span-4 order-3 justify-end items-end">
            <img 
              src={doctorImage}
              alt="Médica profissional"
              className="h-[550px] xl:h-[620px] w-auto object-contain object-bottom"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;