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
import doctorImage from "@/assets/hero-doctor.webp";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-primary overflow-hidden pt-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Yellow accent shape with M pattern */}
        <div className="absolute -left-10 -top-10 w-[320px] h-[320px]">
          <div className="relative w-full h-full bg-secondary rounded-full flex items-center justify-center">
            {/* M hands pattern inside circle */}
            <svg width="180" height="180" viewBox="0 0 180 180" className="absolute">
              {/* Sun rays */}
              <line x1="90" y1="10" x2="90" y2="30" stroke="#1a4a7c" strokeWidth="8" strokeLinecap="round" />
              <line x1="50" y1="25" x2="60" y2="42" stroke="#1a4a7c" strokeWidth="8" strokeLinecap="round" />
              <line x1="130" y1="25" x2="120" y2="42" stroke="#1a4a7c" strokeWidth="8" strokeLinecap="round" />
              
              {/* M hands shape */}
              <path 
                d="M 45 160 L 45 90 Q 45 70 65 70 Q 85 70 85 90 L 85 110 Q 85 95 90 95 Q 95 95 95 110 L 95 90 Q 95 70 115 70 Q 135 70 135 90 L 135 160" 
                stroke="#1a4a7c" 
                strokeWidth="16"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        
        {/* Stethoscope pattern overlay on right */}
        <div className="absolute right-0 top-1/4 opacity-20">
          <svg width="300" height="500" viewBox="0 0 300 500" fill="none">
            <path 
              d="M200 50 Q 250 120 250 220 Q 250 320 200 380" 
              stroke="white" 
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="200" cy="420" r="40" stroke="white" strokeWidth="16" fill="none" />
            <path 
              d="M160 420 L 160 450 Q 160 480 130 480" 
              stroke="white" 
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
            />
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                  <Input 
                    placeholder="Procurar por..." 
                    className="pl-10 h-12 rounded-xl border-border"
                  />
                </div>

                {/* Specialty Select */}
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary z-10" />
                  <Select>
                    <SelectTrigger className="pl-10 h-12 rounded-xl border-border">
                      <SelectValue placeholder="Especialidades" />
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
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
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
                        <SelectValue placeholder="Cidades" />
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
            <p className="text-primary-foreground/90 text-xl italic mb-2">Acesse</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-4 italic">
              profissionais
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl text-primary-foreground font-medium leading-relaxed mb-8">
              qualificados sem<br />
              mensalidades<br />
              ou burocracia.
            </p>

            {/* Badge */}
            <div className="inline-flex items-center justify-center w-28 h-28 bg-secondary rounded-full relative">
              <div className="text-center px-2">
                <p className="text-xs font-bold text-primary leading-tight">Saúde e</p>
                <p className="text-xs font-bold text-primary leading-tight">Facilidade</p>
                <p className="text-[10px] text-primary/70 leading-tight">sem nenhuma</p>
                <p className="text-[10px] text-primary/70 leading-tight">Mensalidade</p>
              </div>
              {/* Rotating text around badge */}
              <div className="absolute inset-[-12px] animate-spin" style={{ animationDuration: '15s' }}>
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <defs>
                    <path id="circlePath" d="M 60, 60 m -48, 0 a 48,48 0 1,1 96,0 a 48,48 0 1,1 -96,0"/>
                  </defs>
                  <text className="text-[8px] fill-secondary-foreground font-medium tracking-wider">
                    <textPath href="#circlePath">
                      Consulta 100% Segura e Garantida • Consulta 100% Segura e Garantida •
                    </textPath>
                  </text>
                </svg>
              </div>
              {/* Checkmark icon */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-secondary rounded-full flex items-center justify-center shadow-md">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          </div>

          {/* Right Column - Doctor Image */}
          <div className="hidden lg:flex lg:col-span-4 order-3 justify-end items-end">
            <img 
              src={doctorImage}
              alt="Médica profissional"
              className="w-full max-w-lg h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
