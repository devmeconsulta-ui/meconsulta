import quadro01 from "@/assets/quadro-01.png";
import quadro02 from "@/assets/quadro-02.png";
import quadro03 from "@/assets/quadro-03.png";

const FeaturesSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <img 
            src={quadro01} 
            alt="Sem Mensalidade, Sem Complicação" 
            className="w-full h-auto rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
          />
          <img 
            src={quadro02} 
            alt="Todos os Especialistas em Um Só Lugar" 
            className="w-full h-auto rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
          />
          <img 
            src={quadro03} 
            alt="Tecnologia que cuida de você" 
            className="w-full h-auto rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
