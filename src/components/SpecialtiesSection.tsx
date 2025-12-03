import { useEffect, useState, useCallback } from "react";

const specialists = [
  {
    name: "Dra. Ana Silva",
    specialty: "Cardiologia",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Dr. Carlos Santos",
    specialty: "Dermatologia",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Dra. Maria Costa",
    specialty: "Ginecologia",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Dr. Pedro Lima",
    specialty: "Ortopedia",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Dra. Julia Oliveira",
    specialty: "Pediatria",
    image: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Dr. Roberto Alves",
    specialty: "Psiquiatria",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Dra. Fernanda Reis",
    specialty: "Oftalmologia",
    image: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Dr. Lucas Mendes",
    specialty: "Neurologia",
    image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Dra. Camila Souza",
    specialty: "Endocrinologia",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face&sat=-100"
  },
  {
    name: "Dr. Rafael Costa",
    specialty: "Urologia",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face&sat=-100"
  },
];

const SpecialtiesSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const extendedSpecialists = [...specialists, ...specialists];
  
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= specialists.length - 1) {
        return 0;
      }
      return prev + 1;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <section id="especialistas" className="py-16 bg-muted overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Nossos Especialistas
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Profissionais qualificados prontos para cuidar da sua saúde
          </p>
        </div>
      </div>

      <div className="relative px-4">
        <div 
          className="flex gap-4 transition-transform duration-700 ease-out"
          style={{ 
            transform: `translateX(-${currentIndex * (100 / 4)}%)`
          }}
        >
          {extendedSpecialists.map((specialist, index) => (
            <div 
              key={index}
              className="flex-shrink-0 w-[280px] sm:w-[300px] cursor-pointer"
            >
              <div className="bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={specialist.image} 
                    alt={specialist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-semibold text-foreground mb-1">{specialist.name}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{specialist.specialty}</p>
                  <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                    Marcar Consulta
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-8">
        {specialists.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentIndex % specialists.length === index 
                ? 'bg-primary w-6' 
                : 'bg-primary/30 hover:bg-primary/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default SpecialtiesSection;