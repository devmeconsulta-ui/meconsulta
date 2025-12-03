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
];

const SpecialtiesSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  const extendedSpecialists = [...specialists, ...specialists, ...specialists];
  
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  useEffect(() => {
    if (currentIndex >= specialists.length * 2) {
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(specialists.length);
      }, 500);
      
      setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
    }
  }, [currentIndex]);

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

      <div className="relative">
        <div 
          className={`flex ${isTransitioning ? 'transition-transform duration-500 ease-out' : ''}`}
          style={{ 
            transform: `translateX(-${currentIndex * (100 / 4)}%)`,
            width: `${(extendedSpecialists.length / 4) * 100}%`
          }}
        >
          {extendedSpecialists.map((specialist, index) => (
            <div 
              key={index}
              className="flex-shrink-0 px-3"
              style={{ width: `${100 / extendedSpecialists.length}%` }}
            >
              <div className="bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer group">
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={specialist.image} 
                    alt={specialist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-semibold text-foreground mb-1">{specialist.name}</h3>
                  <p className="text-sm text-primary font-medium">{specialist.specialty}</p>
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
            onClick={() => setCurrentIndex(specialists.length + index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              (currentIndex % specialists.length) === index 
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