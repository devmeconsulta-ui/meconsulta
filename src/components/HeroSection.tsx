import { useState } from "react";
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
import { specialties, brazilStates, citiesByState } from "@/data/brazilData";

const HeroSection = () => {
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const cities = selectedState ? citiesByState[selectedState] || [] : [];

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedCity("");
  };

  const handleSearch = () => {
    console.log({
      searchTerm,
      specialty: selectedSpecialty,
      state: selectedState,
      city: selectedCity
    });
    // Futuramente integrar com busca real
  };

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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Specialty Select */}
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary z-10" />
                  <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                    <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30">
                      <SelectValue placeholder="Especialidade" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty.toLowerCase()}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Selects */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Select value={selectedState} onValueChange={handleStateChange}>
                      <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30 text-sm">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {brazilStates.map((state) => (
                          <SelectItem key={state.sigla} value={state.sigla}>
                            {state.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                      <SelectTrigger className="pl-10 h-11 rounded-lg border-border bg-muted/30 text-sm">
                        <SelectValue placeholder="Cidade" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {cities.map((city) => (
                          <SelectItem key={city} value={city.toLowerCase()}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Button */}
                <Button 
                  className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 font-medium"
                  onClick={handleSearch}
                >
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