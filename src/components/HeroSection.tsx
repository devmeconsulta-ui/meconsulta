import { Button } from "@/components/ui/button";
import { Search, Briefcase, MapPin, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import doctorImage from "@/assets/doctor-hero.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-primary overflow-hidden pt-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Yellow accent shape */}
        <div className="absolute -left-20 top-20 w-80 h-80 bg-secondary rounded-full opacity-90" />
        <div className="absolute -left-10 top-32 w-24 h-48 bg-secondary rounded-full opacity-80" />
        
        {/* Stethoscope pattern overlay on right */}
        <div className="absolute right-10 top-1/4 opacity-20">
          <svg width="200" height="400" viewBox="0 0 200 400" fill="none">
            <path 
              d="M120 50 Q 150 100 150 180 Q 150 260 120 300" 
              stroke="white" 
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="120" cy="320" r="30" stroke="white" strokeWidth="12" fill="none" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10 h-[calc(100vh-4rem)] flex items-center">
        <div className="grid lg:grid-cols-12 gap-8 items-center w-full">
          {/* Left Column - Search Form */}
          <div className="lg:col-span-4 order-2 lg:order-1">
            <div className="bg-card rounded-2xl p-6 shadow-xl max-w-md mx-auto lg:mx-0 card-shadow">
              <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
                Encontrar especialista
              </h2>
              
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    placeholder="Procurar por..." 
                    className="pl-10 h-12 rounded-xl border-border"
                  />
                </div>

                {/* Specialty Select */}
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Select>
                    <SelectTrigger className="pl-10 h-12 rounded-xl border-border">
                      <SelectValue placeholder="Especialidade" />
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Select>
                      <SelectTrigger className="pl-10 h-12 rounded-xl border-border">
                        <SelectValue placeholder="Estado" />
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
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Select>
                      <SelectTrigger className="pl-10 h-12 rounded-xl border-border">
                        <SelectValue placeholder="Cidade" />
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
                <Button variant="search" size="lg" className="w-full h-12">
                  Buscar
                </Button>
              </div>
            </div>
          </div>

          {/* Center Column - Hero Text */}
          <div className="lg:col-span-4 order-1 lg:order-2 text-center lg:text-left">
            <p className="text-primary-foreground/90 text-lg mb-2">Acesse</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-4">
              profissionais
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl text-primary-foreground font-medium leading-relaxed mb-8">
              qualificados sem<br />
              mensalidades<br />
              ou burocracia.
            </p>

            {/* Badge */}
            <div className="inline-flex items-center justify-center w-28 h-28 bg-secondary rounded-full relative">
              <div className="text-center">
                <p className="text-xs font-semibold text-secondary-foreground">Saúde e</p>
                <p className="text-xs font-semibold text-secondary-foreground">Facilidade</p>
                <p className="text-[10px] text-secondary-foreground/80">sem nenhuma</p>
                <p className="text-[10px] text-secondary-foreground/80">Mensalidade</p>
              </div>
              {/* Rotating text around badge */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <path id="circle" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"/>
                  </defs>
                  <text className="text-[8px] fill-secondary-foreground font-medium">
                    <textPath href="#circle">
                      Consulta 100% Segura e Garantida • Consulta 100% Segura e Garantida •
                    </textPath>
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* Right Column - Doctor Image */}
          <div className="hidden lg:flex lg:col-span-4 order-3 justify-end items-end">
            <img 
              src={doctorImage}
              alt="Médica profissional"
              className="w-full max-w-md h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
