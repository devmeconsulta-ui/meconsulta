import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Jessica",
    location: "Montes Claros, MG",
    text: "Excelente plataforma! Encontrei meu médico de forma rápida e prática. O atendimento foi excepcional e o processo todo muito simples. Recomendo para todos!",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
  },
  {
    name: "Pedro",
    location: "Belo Horizonte, MG",
    text: "Finalmente uma solução que facilita o acesso à saúde sem burocracia. Consegui agendar minha consulta em minutos. Muito satisfeito com o serviço!",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
  },
  {
    name: "Marcos",
    location: "São Paulo, SP",
    text: "A praticidade do MeConsulta é incrível. Sem mensalidades e com profissionais qualificados. Mudou completamente a forma como cuido da minha saúde.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face"
  }
];

const TestimonialsSection = () => {
  return (
    <section id="depoimentos" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          Depoimentos
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <Quote className="w-8 h-8 text-secondary mb-4" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                ))}
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {testimonial.text}
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <img 
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
