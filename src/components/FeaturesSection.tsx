import { Lock, Users, Video } from "lucide-react";

const features = [
  {
    icon: Lock,
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=500&fit=crop",
    alt: "Segurança de dados"
  },
  {
    title: "Todos os Especialistas em Um Só Lugar",
    description: "Encontre rapidamente o profissional que você precisa, com total praticidade!",
    icon: Users,
    isText: true
  },
  {
    icon: Video,
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=500&fit=crop",
    alt: "Consulta online"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {feature.isText ? (
                <div className="bg-primary h-full p-8 flex flex-col justify-center text-center min-h-[320px]">
                  <Users className="w-12 h-12 text-primary-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-secondary mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-primary-foreground/90 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ) : (
                <div className="relative h-80 group">
                  <img 
                    src={feature.image} 
                    alt={feature.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
