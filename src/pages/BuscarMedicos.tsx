import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Calendar, ChevronRight } from "lucide-react";
import { searchDoctors, Doctor } from "@/data/mockDoctors";
import { specialties, brazilStates, citiesByState } from "@/data/brazilData";

const BuscarMedicos = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get("especialidade") || "");
  const [selectedState, setSelectedState] = useState(searchParams.get("estado") || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("cidade") || "");

  const cities = selectedState ? citiesByState[selectedState] || [] : [];

  useEffect(() => {
    const results = searchDoctors(selectedSpecialty, selectedCity, selectedState);
    setDoctors(results);
  }, [selectedSpecialty, selectedCity, selectedState]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedSpecialty) params.set("especialidade", selectedSpecialty);
    if (selectedState) params.set("estado", selectedState);
    if (selectedCity) params.set("cidade", selectedCity);
    setSearchParams(params);
  };

  const formatNextAvailable = (doctor: Doctor) => {
    if (doctor.availableSlots.length === 0) return "Sem horários disponíveis";
    const nextSlot = doctor.availableSlots[0];
    const date = new Date(nextSlot.date + "T00:00:00");
    const formattedDate = date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
    return `Próximo horário: ${formattedDate} às ${nextSlot.times[0]}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Search Filters */}
      <section className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-6 text-center">
            Encontre seu Médico
          </h1>
          
          <div className="bg-card rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedState} onValueChange={(value) => {
                setSelectedState(value);
                setSelectedCity("");
              }}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {brazilStates.map((state) => (
                    <SelectItem key={state.sigla} value={state.sigla}>
                      {state.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleSearch} className="h-12 text-base font-semibold">
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <p className="text-muted-foreground">
              {doctors.length} {doctors.length === 1 ? "médico encontrado" : "médicos encontrados"}
              {selectedSpecialty && ` em ${selectedSpecialty}`}
              {selectedCity && ` - ${selectedCity}`}
              {selectedState && `, ${selectedState}`}
            </p>
          </div>

          <div className="space-y-4">
            {doctors.map((doctor) => (
              <Link 
                key={doctor.id} 
                to={`/medico/${doctor.id}`}
                className="block"
              >
                <div className="bg-card rounded-2xl p-4 md:p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/30">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      <img 
                        src={doctor.image} 
                        alt={doctor.name}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover mx-auto md:mx-0"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">
                        {doctor.name}
                      </h2>
                      <p className="text-primary font-medium mb-2">{doctor.specialty}</p>
                      <p className="text-sm text-muted-foreground mb-2">{doctor.crm}</p>
                      
                      {/* Rating */}
                      <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-foreground">{doctor.rating}</span>
                        <span className="text-muted-foreground text-sm">({doctor.reviewCount} avaliações)</span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{doctor.neighborhood}, {doctor.city} - {doctor.state}</span>
                      </div>

                      {/* Next Available */}
                      <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-primary">
                        <Calendar className="w-4 h-4" />
                        <span>{formatNextAvailable(doctor)}</span>
                      </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="flex flex-col items-center md:items-end justify-between">
                      <div className="text-center md:text-right mb-4">
                        <p className="text-sm text-muted-foreground">Consulta</p>
                        <p className="text-2xl font-bold text-foreground">
                          R$ {doctor.consultationPrice.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <Button className="w-full md:w-auto gap-2">
                        Ver Perfil
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {doctors.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  Nenhum médico encontrado com os filtros selecionados.
                </p>
                <p className="text-muted-foreground mt-2">
                  Tente ajustar sua busca ou remover alguns filtros.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BuscarMedicos;
