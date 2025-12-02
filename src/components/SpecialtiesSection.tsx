import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const specialties = [
  { name: "Cardiologia", icon: "❤️" },
  { name: "Dermatologia", icon: "🧴" },
  { name: "Ginecologia", icon: "👩" },
  { name: "Ortopedia", icon: "🦴" },
  { name: "Pediatria", icon: "👶" },
  { name: "Psiquiatria", icon: "🧠" },
  { name: "Oftalmologia", icon: "👁️" },
  { name: "Neurologia", icon: "🔬" },
];

const SpecialtiesSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerView = 4;

  const nextSlide = () => {
    setCurrentIndex((prev) => 
      prev + itemsPerView >= specialties.length ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? specialties.length - itemsPerView : prev - 1
    );
  };

  return (
    <section id="especialidades" className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Especialidades
          </h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={prevSlide}
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={nextSlide}
              className="rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden">
          <div 
            className="flex gap-4 transition-transform duration-300"
            style={{ transform: `translateX(-${currentIndex * 25}%)` }}
          >
            {specialties.map((specialty, index) => (
              <div 
                key={index}
                className="flex-shrink-0 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-2"
              >
                <div className="bg-card rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {specialty.icon}
                  </div>
                  <p className="font-medium text-foreground">{specialty.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpecialtiesSection;
