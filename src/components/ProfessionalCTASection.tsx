import professionalSection from "@/assets/professional-section.png";

const ProfessionalCTASection = () => {
  return (
    <section className="relative">
      {/* Yellow top border */}
      <div className="h-2 bg-secondary" />
      
      {/* Full-width image section */}
      <div className="relative w-full">
        <img 
          src={professionalSection}
          alt="Também é Profissional da Saúde?"
          className="w-full h-auto"
        />
      </div>
    </section>
  );
};

export default ProfessionalCTASection;
