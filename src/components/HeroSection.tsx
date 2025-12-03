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

const HeroSection = () => {
  return (
    <section className="relative bg-primary overflow-hidden pt-20">
      {/* Yellow M Logo Shape - Left Side */}
      <div className="absolute -left-16 -top-16 w-[350px] h-[350px] lg:w-[400px] lg:h-[400px]">
        <div className="relative w-full h-full bg-secondary rounded-full flex items-center justify-center">
          <svg width="200" height="200" viewBox="0 0 200 200" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* Sun rays */}
            <line x1="100" y1="15" x2="100" y2="35" stroke="#1a4a7c" strokeWidth="10" strokeLinecap="round" />
            <line x1="55" y1="30" x2="68" y2="48" stroke="#1a4a7c" strokeWidth="10" strokeLinecap="round" />
            <line x1="145" y1="30" x2="132" y2="48" stroke="#1a4a7c" strokeWidth="10" strokeLinecap="round" />
            
            {/* M hands shape */}
            <path 
              d="M 50 170 L 50 95 Q 50 65 75 65 L 75 65 Q 90 65 90 85 L 90 105 L 90 85 Q 90 65 100 65 Q 110 65 110 85 L 110 105 L 110 85 Q 110 65 125 65 L 125 65 Q 150 65 150 95 L 150 170" 
              stroke="#1a4a7c" 
              strokeWidth="18"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      
      {/* Stethoscope pattern - Right Side */}
      <div className="absolute right-0 top-20 opacity-15 pointer-events-none">
        <svg width="350" height="600" viewBox="0 0 350 600" fill="none">
          <path 
            d="M220 30 Q 300 100 300 250 Q 300 400 220 500" 
            stroke="white" 
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="220" cy="540" r="45" stroke="white" strokeWidth="20" fill="none" />
          <path 
            d="M175 540 L 175 580 Q 175 610 140 610" 
            stroke="white" 
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

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